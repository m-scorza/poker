/**
 * IndexedDB persistence via Dexie.js.
 *
 * Stores parsed hands, player data, actions, tournaments, hero decisions,
 * and villain profiles. All data stays client-side.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { Hand, PlayerInHand, Action, Tournament, Position } from '../types/hand';
import type { HeroDecision } from '../types/analysis';
import type { VillainProfile, VillainRawCounters, VillainStats, PositionStats, PositionStatsRawCounters } from '../types/villain';
import type { ParsedTournamentSummary } from '../parser/tournamentSummary';
import type { ImportRunRecord } from './importRuns';
import { IMPORT_DIAGNOSTICS_RETENTION_RUNS } from './importDiagnosticsPolicy';
import { classifyVillain, computeVillainStats, emptyCounters } from '../analysis/villainClassifier';
import * as ls from './localStorage';
import { sumUsd } from '../parser/money';
import { reconcileLeakStatuses, type LeakStatusRecord } from '../analysis/leakLifecycle';
import { computeAggregateStats, detectLeaks } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { gradeSpot, type SrsReviewRecord } from '../analysis/srsScheduler';
import type { StrategyProfile } from './strategyProfiles';

export interface AppSettings {
  id: string; // 'global'
  heroName: string;
}

/** Session metadata — auto-grouped by time window. */
export interface SessionRecord {
  id: string;
  startTime: Date;
  endTime: Date;
  tournamentIds: string[];
  totalHands: number;
}

const db = new Dexie('PokerAnalyzer') as Dexie & {
  hands: EntityTable<Hand, 'id'>;
  players: EntityTable<PlayerInHand, 'handId'>;
  actions: EntityTable<Action, 'handId'>;
  tournaments: EntityTable<Tournament, 'id'>;
  heroDecisions: EntityTable<HeroDecision, 'handId'>;
  villains: EntityTable<VillainProfile, 'playerName'>;
  sessions: EntityTable<SessionRecord, 'id'>;
  importRuns: EntityTable<ImportRunRecord, 'id'>;
  settings: EntityTable<AppSettings, 'id'>;
  leakStatus: EntityTable<LeakStatusRecord, 'leakId'>;
  srsReview: EntityTable<SrsReviewRecord, 'spotKey'>;
};

db.version(1).stores({
  hands: 'id, tournamentId, date',
  players: '[handId+seatNumber], handId, playerName',
  actions: '[handId+sequence], handId, playerName, street',
  tournaments: 'id',
  heroDecisions: 'handId, position, scenario, isCompliant',
  villains: 'playerName',
  sessions: 'id, startTime',
});

// Phase 2: Schema Upgrade to allow multiple HeroDecisions per hand + Settings table
db.version(2).stores({
  heroDecisions: '++id, handId, position, scenario, isCompliant',
  settings: 'id',
}).upgrade((tx) => {
  // Try to preserve existing hero decisions, but they will be mapped automatically without their old PK
  tx.table('settings').put({ id: 'global', heroName: 'scorza23' });
});

// Phase 5a: Add hasShowdown to hands, recompute wentToShowdown/wonAtShowdown on decisions
// Bug #7 fix: W$SD false positives — the old heuristic counted non-showdown wins
db.version(3).stores({
  // No schema changes needed — hasShowdown is a non-indexed field on hands
}).upgrade(async (tx) => {
  // Step 1: Backfill hasShowdown on existing hands.
  // Heuristic: if any non-hero player has hole cards stored, it was a showdown
  // (PokerStars only reveals villain cards at showdown)
  const players = tx.table('players');
  const hands = tx.table('hands');
  const decisions = tx.table('heroDecisions');

  // Build a set of hand IDs that had showdowns (non-hero players with hole cards)
  const showdownHandIds = new Set<string>();
  await players.each((p: PlayerInHand) => {
    if (!p.isHero && p.holeCards && p.holeCards.length === 2) {
      showdownHandIds.add(p.handId);
    }
  });

  // Update all hands with hasShowdown flag
  await hands.toCollection().modify((hand: Hand) => {
    hand.hasShowdown = showdownHandIds.has(hand.id);
  });

  // Step 2: Recompute wentToShowdown and wonAtShowdown on heroDecisions
  await decisions.toCollection().modify((d: HeroDecision) => {
    const hadShowdown = showdownHandIds.has(d.handId);
    // If the hand had a showdown and hero didn't fold (action !== 'fold'), hero went to showdown
    const heroWentToSD = hadShowdown && d.action !== 'fold';
    d.wentToShowdown = heroWentToSD;
    d.wonAtShowdown = heroWentToSD && d.wonAmount > 0;
  });
});

// v4 is reserved/no-op: keeps the version sequence contiguous so any user DB
// that landed on v4 in earlier builds still upgrades cleanly to v5+.
// Do not delete — Dexie requires the version chain to be unbroken.
db.version(4).stores({});

// Import audit history: completed import runs and their data-confidence metadata.
db.version(5).stores({
  importRuns: 'id, importedAt, confidence',
});

// Leak lifecycle (living entities): which leaks the user is studying / has
// resolved. Additive — a brand-new table starts empty, so no upgrade() is
// needed (same discipline as the v4 no-op).
db.version(6).stores({
  leakStatus: 'leakId, resolvedAt',
});

// Spaced-repetition review state for misplay patterns (Arena SRS drills).
// Additive — a brand-new table starts empty, so no upgrade() is needed.
db.version(7).stores({
  srsReview: 'spotKey, dueAt',
});

export { db };

/** Check if a hand ID already exists (for deduplication). */
export async function handExists(handId: string): Promise<boolean> {
  const count = await db.hands.where('id').equals(handId).count();
  return count > 0;
}

/** Bulk import parsed hands with deduplication. Returns count of newly imported hands. */
export interface ImportHandsOptions {
  aggregateVillains?: boolean;
}

export async function importHands(
  hands: Array<{
    hand: Hand;
    players: PlayerInHand[];
    actions: Action[];
    tournament: Partial<Tournament>;
    heroDecision?: HeroDecision;
  }>,
  options: ImportHandsOptions = {},
): Promise<number> {
  // Get existing hand IDs for dedup
  const allIds = hands.map((h) => h.hand.id);
  const existingIds = new Set(
    (await db.hands.where('id').anyOf(allIds).toArray()).map((h) => h.id),
  );

  const newHands = hands.filter((h) => !existingIds.has(h.hand.id));
  if (newHands.length === 0) return 0;

  await db.transaction(
    'rw',
    [db.hands, db.players, db.actions, db.tournaments, db.heroDecisions],
    async () => {
      await db.hands.bulkAdd(newHands.map((h) => h.hand));
      await db.players.bulkAdd(newHands.flatMap((h) => h.players));
      await db.actions.bulkAdd(newHands.flatMap((h) => h.actions));

      // Upsert tournaments (may span multiple files)
      const tIdsToProcess = [...new Set(newHands.filter((h) => h.tournament.id).map(h => h.tournament.id!))];
      if (tIdsToProcess.length > 0) {
        const existingTourns = await db.tournaments.where('id').anyOf(tIdsToProcess).toArray();
        const existingTournMap = new Map<string, Tournament>();
        for (const t of existingTourns) existingTournMap.set(t.id, t);
        
        const tournUpdates = new Map<string, Tournament>();
        
        for (const h of newHands) {
          if (!h.tournament.id) continue;
          const tid = h.tournament.id;
          let t = tournUpdates.get(tid);
          if (!t) {
            const existing = existingTournMap.get(tid);
            t = existing ? { ...existing } : { 
              id: tid, buyIn: 0, fee: 0, format: '', handsPlayed: 0, 
              finishPosition: null, prize: null, bounty: null 
            } as Tournament;
            tournUpdates.set(tid, t);
          }
          
          if (h.tournament.name) t.name = h.tournament.name;
          if (h.tournament.category) t.category = h.tournament.category;
          if (!t.startDate || (h.hand.date && h.hand.date < t.startDate)) t.startDate = h.hand.date;
          if (h.tournament.buyIn) t.buyIn = h.tournament.buyIn;
          if (h.tournament.fee) t.fee = h.tournament.fee;
          if (h.tournament.format) t.format = h.tournament.format;
          if (h.tournament.currency) t.currency = h.tournament.currency;
          if (h.tournament.finishPosition !== null && h.tournament.finishPosition !== undefined) t.finishPosition = h.tournament.finishPosition;
          if (h.tournament.prize !== null && h.tournament.prize !== undefined) t.prize = h.tournament.prize;
          
          const handBounty = h.hand.bountyCollected || h.tournament.bounty || 0;
          if (handBounty > 0) {
            t.bounty = sumUsd([t.bounty || 0, handBounty]);
          }
        }
        await db.tournaments.bulkPut(Array.from(tournUpdates.values()));
      }

      // Store hero decisions
      const decisions = newHands
        .filter((h) => h.heroDecision)
        .map((h) => h.heroDecision!);
      if (decisions.length > 0) {
        await db.heroDecisions.bulkAdd(decisions);
      }
    },
  );

  // Update tournament hand counts
  const tournHandCounts = new Map<string, number>();
  for (const h of newHands) {
    if (h.hand.tournamentId) {
      tournHandCounts.set(h.hand.tournamentId, (tournHandCounts.get(h.hand.tournamentId) ?? 0) + 1);
    }
  }
  if (tournHandCounts.size > 0) {
    await db.transaction('rw', db.tournaments, async () => {
      for (const [tid, count] of tournHandCounts) {
        const existing = await db.tournaments.get(tid);
        if (existing) {
          await db.tournaments.update(tid, { handsPlayed: (existing.handsPlayed || 0) + count });
        }
      }
    });
  }

  if (options.aggregateVillains !== false) {
    // Aggregate villain stats outside the main transaction to prevent locking
    try {
      await aggregateVillainStats(newHands);
    } catch (error) {
      console.error('Villain aggregation failed during import. These stats will be missing until a repair is triggered:', error);
      // Future: trigger a background repair worker or flag the session as needing aggregation
    }
  }

  return newHands.length;
}

/** Get total hand count. */
export async function getTotalHandCount(): Promise<number> {
  return db.hands.count();
}

/** Get all hero decisions. */
export async function getAllHeroDecisions(): Promise<HeroDecision[]> {
  return db.heroDecisions.toArray();
}

/** Get all hands with optional date range filter. */
export async function getHands(
  dateFrom?: Date,
  dateTo?: Date,
): Promise<Hand[]> {
  let collection = db.hands.orderBy('date');
  if (dateFrom) {
    collection = collection.and((h) => h.date >= dateFrom);
  }
  if (dateTo) {
    collection = collection.and((h) => h.date <= dateTo);
  }
  return collection.toArray();
}

/** Get players for a specific hand. */
export async function getPlayersForHand(handId: string): Promise<PlayerInHand[]> {
  return db.players.where('handId').equals(handId).toArray();
}

/** Get actions for a specific hand. */
export async function getActionsForHand(handId: string): Promise<Action[]> {
  return db.actions.where('handId').equals(handId).sortBy('sequence');
}

/** Save a custom range for a position. Returns a result so callers can react to quota errors. */
export function saveCustomRange(position: string, hands: string[]): ls.SafeSetResult {
  const envelope: ls.RangeEnvelopeV1 = { version: ls.CURRENT_RANGE_VERSION, hands };
  return ls.safeSet(ls.KEYS.customRange(position), envelope);
}

/** Load a custom range for a position. Accepts v1 envelope or legacy bare-array shape. */
export function loadCustomRange(position: string): Set<string> | null {
  const envelope = ls.safeGet<ls.RangeEnvelopeV1 | null>(
    ls.KEYS.customRange(position),
    ls.validateRangeEnvelope,
    null,
  );
  if (envelope) return new Set(envelope.hands);

  // Fall back to legacy `range:<pos>` key — migrate it on read if found.
  const legacy = ls.safeGet<ls.RangeEnvelopeV1 | null>(
    ls.KEYS.legacyCustomRange(position),
    ls.validateRangeEnvelope,
    null,
  );
  if (legacy) {
    saveCustomRange(position, legacy.hands);
    ls.safeRemove(ls.KEYS.legacyCustomRange(position));
    return new Set(legacy.hands);
  }
  return null;
}

/** Load all custom ranges. Migrates legacy `range:*` keys to the namespaced prefix. */
export function loadAllCustomRanges(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  for (const key of ls.listKeysWithPrefix(ls.LEGACY_RANGE_PREFIX)) {
    if (key.startsWith(ls.RANGE_PREFIX)) continue; // skip the new prefix (also matches legacy)
    const position = key.slice(ls.LEGACY_RANGE_PREFIX.length);
    const range = loadCustomRange(position);
    if (range) map.set(position, range);
  }

  for (const key of ls.listKeysWithPrefix(ls.RANGE_PREFIX)) {
    const position = key.slice(ls.RANGE_PREFIX.length);
    if (map.has(position)) continue;
    const range = loadCustomRange(position);
    if (range) map.set(position, range);
  }

  return map;
}

/** Delete a custom range for a position. */
export function deleteCustomRange(position: string): void {
  ls.safeRemove(ls.KEYS.customRange(position));
  ls.safeRemove(ls.KEYS.legacyCustomRange(position));
}

/** Villain notes stored in IndexedDB. */
export interface VillainNote {
  playerName: string;
  notes: string;
  tags: string[];
}

/** Save villain notes and tags (preserves existing stats). */
export async function saveVillainNote(playerName: string, notes: string, tags: string[]): Promise<void> {
  const existing = await db.villains.get(playerName);
  if (existing) {
    await db.villains.update(playerName, { notes, tags });
  } else {
    await db.villains.put({
      playerName,
      firstSeen: new Date(),
      lastSeen: new Date(),
      totalHands: 0,
      stats: createEmptyVillainStats(),
      statsByPosition: {},
      rawCounters: emptyCounters(),
      shownHands: [],
      archetype: null,
      archetypeConfidence: 'low',
      notes,
      tags,
    } as VillainProfile);
  }
}

/** Aggregate basic stats for villains from newly imported hands (Bug #5) */
async function yieldToBrowser(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createEmptyVillainStats(): VillainStats {
  return {
    vpip: 0,
    pfr: 0,
    threeBetPct: 0,
    foldToThreeBet: 0,
    cbetFlop: 0,
    cbetTurn: 0,
    foldToCbet: 0,
    wtsd: 0,
    wsd: 0,
    af: 0,
    limpPct: 0,
  };
}

function createEmptyPositionRawCounters(): PositionStatsRawCounters {
  return {
    totalHands: 0,
    vpipHands: 0,
    pfrHands: 0,
    threeBetOpps: 0,
    threeBetMade: 0,
  };
}

function pct(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function computePositionStats(rawCounters: PositionStatsRawCounters): PositionStats {
  return {
    hands: rawCounters.totalHands,
    vpip: pct(rawCounters.vpipHands, rawCounters.totalHands),
    pfr: pct(rawCounters.pfrHands, rawCounters.totalHands),
    threeBetPct: pct(rawCounters.threeBetMade, rawCounters.threeBetOpps),
    rawCounters,
  };
}

function normalizeRawCounters(
  rawCounters: VillainRawCounters | undefined,
  stats: VillainStats,
  totalHands: number,
): VillainRawCounters {
  if (rawCounters) {
    return { ...emptyCounters(), ...rawCounters };
  }

  const counters = emptyCounters();
  counters.totalHands = totalHands;
  counters.vpipHands = Math.round((stats.vpip / 100) * totalHands);
  counters.pfrHands = Math.round((stats.pfr / 100) * totalHands);
  counters.limpHands = Math.round((stats.limpPct / 100) * totalHands);
  counters.threeBetOpps = totalHands;
  counters.threeBetMade = Math.round((stats.threeBetPct / 100) * totalHands);
  counters.cbetFlopOpps = totalHands;
  counters.cbetFlopMade = Math.round((stats.cbetFlop / 100) * totalHands);
  counters.cbetTurnOpps = totalHands;
  counters.cbetTurnMade = Math.round((stats.cbetTurn / 100) * totalHands);
  return counters;
}

function normalizePositionStats(value: unknown): PositionStats | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const stats = value as Partial<PositionStats>;
  if (stats.rawCounters) {
    return computePositionStats({ ...createEmptyPositionRawCounters(), ...stats.rawCounters });
  }

  const hands = stats.hands ?? 0;
  const rawCounters: PositionStatsRawCounters = {
    totalHands: hands,
    vpipHands: Math.round(((stats.vpip ?? 0) / 100) * hands),
    pfrHands: Math.round(((stats.pfr ?? 0) / 100) * hands),
    threeBetOpps: hands,
    threeBetMade: Math.round(((stats.threeBetPct ?? 0) / 100) * hands),
  };
  return computePositionStats(rawCounters);
}

function normalizeStatsByPosition(value: unknown): Partial<Record<Position, PositionStats>> {
  if (!value) return {};
  const entries = value instanceof Map ? value.entries() : Object.entries(value);
  const normalized: Partial<Record<Position, PositionStats>> = {};
  for (const [position, stats] of entries) {
    const normalizedStats = normalizePositionStats(stats);
    if (normalizedStats) normalized[position as Position] = normalizedStats;
  }
  return normalized;
}

function createVillainProfile(player: PlayerInHand, hand: Hand): VillainProfile {
  return {
    playerName: player.playerName,
    firstSeen: hand.date,
    lastSeen: hand.date,
    totalHands: 0,
    stats: createEmptyVillainStats(),
    statsByPosition: {},
    rawCounters: emptyCounters(),
    shownHands: [],
    archetype: null,
    archetypeConfidence: 'low',
    notes: '',
    tags: [],
  };
}

interface VillainHandObservation {
  vpip: boolean;
  pfr: boolean;
  limp: boolean;
  threeBetOpp: boolean;
  threeBetMade: boolean;
  foldToThreeBetOpp: boolean;
  foldToThreeBetMade: boolean;
  cbetFlopOpp: boolean;
  cbetFlopMade: boolean;
  cbetTurnOpp: boolean;
  cbetTurnMade: boolean;
  foldToCbetOpp: boolean;
  foldToCbetMade: boolean;
  wentToShowdown: boolean;
  wonAtShowdown: boolean;
  bets: number;
  raises: number;
  calls: number;
}

function voluntaryPreflopActions(actions: Action[]): Action[] {
  return actions.filter(
    (a) => a.street === 'preflop' && !['post_ante', 'post_sb', 'post_bb'].includes(a.actionType),
  );
}

function firstActionOnStreet(actions: Action[], playerName: string, street: Action['street']): Action | undefined {
  return actions
    .filter((a) => a.street === street && a.playerName === playerName)
    .sort((a, b) => a.sequence - b.sequence)[0];
}

function hasPriorAggression(actions: Action[], action: Action): boolean {
  return actions.some(
    (a) => a.street === action.street &&
      a.sequence < action.sequence &&
      a.playerName !== action.playerName &&
      (a.actionType === 'bet' || a.actionType === 'raise'),
  );
}

function collectVillainHandObservation(
  hand: Hand,
  player: PlayerInHand,
  actions: Action[],
): VillainHandObservation {
  const playerActions = actions.filter((a) => a.playerName === player.playerName);
  const playerPreflop = voluntaryPreflopActions(playerActions);
  const allPreflop = voluntaryPreflopActions(actions).sort((a, b) => a.sequence - b.sequence);
  const playerFirstPreflop = playerPreflop[0];
  const actionsBeforeFirst = playerFirstPreflop
    ? allPreflop.filter((a) => a.sequence < playerFirstPreflop.sequence)
    : [];
  const hasRaiseBefore = actionsBeforeFirst.some((a) => a.actionType === 'raise');

  const preflopRaises = allPreflop.filter((a) => a.actionType === 'raise');
  const lastPreflopRaise = preflopRaises[preflopRaises.length - 1];
  const firstPlayerRaise = playerPreflop.find((a) => a.actionType === 'raise');
  const firstRaiseAfterPlayerOpen = firstPlayerRaise && !hasRaiseBefore
    ? allPreflop.find((a) => a.sequence > firstPlayerRaise.sequence && a.playerName !== player.playerName && a.actionType === 'raise')
    : undefined;
  const foldAfterFacingThreeBet = firstRaiseAfterPlayerOpen
    ? playerPreflop.some((a) => a.sequence > firstRaiseAfterPlayerOpen.sequence && a.actionType === 'fold')
    : false;

  const flopAction = firstActionOnStreet(actions, player.playerName, 'flop');
  const hasFlopCbetOpp = lastPreflopRaise?.playerName === player.playerName &&
    !!flopAction &&
    !hasPriorAggression(actions, flopAction);
  const hasFlopCbet = hasFlopCbetOpp && flopAction?.actionType === 'bet';

  const turnAction = firstActionOnStreet(actions, player.playerName, 'turn');
  const hasTurnCbetOpp = hasFlopCbet &&
    !!turnAction &&
    !hasPriorAggression(actions, turnAction);
  const hasTurnCbet = hasTurnCbetOpp && turnAction?.actionType === 'bet';

  const opposingFlopCbet = actions.find((a) => {
    if (a.street !== 'flop' || a.actionType !== 'bet' || a.playerName === player.playerName) return false;
    if (lastPreflopRaise?.playerName !== a.playerName) return false;
    return !hasPriorAggression(actions, a);
  });
  const actionFacingCbet = opposingFlopCbet
    ? playerActions.find((a) => a.street === 'flop' && a.sequence > opposingFlopCbet.sequence)
    : undefined;

  return {
    vpip: playerPreflop.some((a) => a.actionType === 'call' || a.actionType === 'raise'),
    pfr: playerPreflop.some((a) => a.actionType === 'raise'),
    limp: playerFirstPreflop?.actionType === 'call' && !hasRaiseBefore,
    threeBetOpp: hasRaiseBefore,
    threeBetMade: hasRaiseBefore && playerPreflop.some((a) => a.actionType === 'raise'),
    foldToThreeBetOpp: !!firstRaiseAfterPlayerOpen,
    foldToThreeBetMade: foldAfterFacingThreeBet,
    cbetFlopOpp: hasFlopCbetOpp,
    cbetFlopMade: hasFlopCbet,
    cbetTurnOpp: hasTurnCbetOpp,
    cbetTurnMade: hasTurnCbet,
    foldToCbetOpp: !!actionFacingCbet,
    foldToCbetMade: actionFacingCbet?.actionType === 'fold',
    wentToShowdown: hand.hasShowdown && player.holeCards !== null,
    wonAtShowdown: hand.hasShowdown &&
      player.holeCards !== null &&
      (hand.villainDeltas.find((d) => d.name === player.playerName)?.net ?? 0) > 0,
    bets: playerActions.filter((a) => a.actionType === 'bet').length,
    raises: playerActions.filter((a) => a.actionType === 'raise').length,
    calls: playerActions.filter((a) => a.actionType === 'call').length,
  };
}

function applyObservationToCounters(counters: VillainRawCounters, observation: VillainHandObservation): void {
  counters.totalHands += 1;
  if (observation.vpip) counters.vpipHands += 1;
  if (observation.pfr) counters.pfrHands += 1;
  if (observation.limp) counters.limpHands += 1;
  if (observation.threeBetOpp) counters.threeBetOpps += 1;
  if (observation.threeBetMade) counters.threeBetMade += 1;
  if (observation.foldToThreeBetOpp) counters.foldToThreeBetOpps += 1;
  if (observation.foldToThreeBetMade) counters.foldToThreeBetMade += 1;
  if (observation.cbetFlopOpp) counters.cbetFlopOpps += 1;
  if (observation.cbetFlopMade) counters.cbetFlopMade += 1;
  if (observation.cbetTurnOpp) counters.cbetTurnOpps += 1;
  if (observation.cbetTurnMade) counters.cbetTurnMade += 1;
  if (observation.foldToCbetOpp) counters.foldToCbetOpps += 1;
  if (observation.foldToCbetMade) counters.foldToCbetMade += 1;
  if (observation.wentToShowdown) counters.wtsdHands += 1;
  if (observation.wonAtShowdown) counters.wsdHands += 1;
  counters.totalBets += observation.bets;
  counters.totalRaises += observation.raises;
  counters.totalCalls += observation.calls;
}

function applyObservationToPositionCounters(
  counters: PositionStatsRawCounters,
  observation: VillainHandObservation,
): void {
  counters.totalHands += 1;
  if (observation.vpip) counters.vpipHands += 1;
  if (observation.pfr) counters.pfrHands += 1;
  if (observation.threeBetOpp) counters.threeBetOpps += 1;
  if (observation.threeBetMade) counters.threeBetMade += 1;
}

export async function aggregateVillainStats(
  handsData: Array<{ hand: Hand; players: PlayerInHand[]; actions: Action[] }>,
): Promise<void> {
  const villainMap = new Map<string, VillainProfile>();
  const namesToFetch = new Set<string>();
  
  for (const h of handsData) {
    for (const p of h.players) {
      if (!p.isHero) namesToFetch.add(p.playerName);
    }
  }
  
  if (namesToFetch.size === 0) return;

  const existing = await db.villains.where('playerName').anyOf([...namesToFetch]).toArray();
  for (const v of existing) {
    v.statsByPosition = normalizeStatsByPosition(v.statsByPosition);
    v.rawCounters = normalizeRawCounters(v.rawCounters, v.stats, v.totalHands);
    villainMap.set(v.playerName, v);
  }

  for (const { hand, players, actions } of handsData) {
    for (const p of players) {
      if (p.isHero) continue;

      let v = villainMap.get(p.playerName);
      if (!v) {
        v = createVillainProfile(p, hand);
        villainMap.set(p.playerName, v);
      }

      if (hand.date > v.lastSeen) v.lastSeen = hand.date;
      if (hand.date < v.firstSeen) v.firstSeen = hand.date;

      const observation = collectVillainHandObservation(hand, p, actions);
      applyObservationToCounters(v.rawCounters, observation);
      v.totalHands = v.rawCounters.totalHands;
      v.stats = computeVillainStats(v.rawCounters);

      const existingPositionStats = v.statsByPosition[p.position];
      const positionCounters = existingPositionStats?.rawCounters
        ? { ...createEmptyPositionRawCounters(), ...existingPositionStats.rawCounters }
        : createEmptyPositionRawCounters();
      applyObservationToPositionCounters(positionCounters, observation);
      v.statsByPosition[p.position] = computePositionStats(positionCounters);

      const classification = classifyVillain(v.stats, v.totalHands);
      v.archetype = classification.archetype;
      v.archetypeConfidence = classification.confidence;

      if (v.totalHands % 100 === 0) {
        await yieldToBrowser();
      }
    }
  }

  await db.villains.bulkPut(Array.from(villainMap.values()));
}

/** Get villain notes and tags. */
export async function getVillainNote(playerName: string): Promise<VillainNote | null> {
  const villain = await db.villains.get(playerName);
  if (!villain) return null;
  return { playerName: villain.playerName, notes: villain.notes, tags: villain.tags };
}

/** Get all villain notes. */
export async function getAllVillainNotes(): Promise<Map<string, VillainNote>> {
  const all = await db.villains.toArray();
  const map = new Map<string, VillainNote>();
  for (const v of all) {
    if (v.notes || v.tags.length > 0) {
      map.set(v.playerName, { playerName: v.playerName, notes: v.notes, tags: v.tags });
    }
  }
  return map;
}

export interface SummaryImportResult {
  /** Existing Tournament rows enriched with summary-only fields (prize, finish, bounty). */
  updated: number;
  /** Brand-new Tournament rows created from the summary alone (no matching hand history). */
  created: number;
  /** Summaries where the `buy-in` field was suppressed because the hand-history
   *  parser already had a value — "hand-history wins" policy. */
  buyInPreserved: number;
}

/**
 * Import parsed tournament summaries.
 *
 * Precedence policy: **hand-history wins** for buy-in / fee / currency.
 * A summary only fills in those fields when the existing Tournament row
 * has `buyIn === 0` (i.e. summary-only, no hand history yet). Summaries
 * continue to own prize, finishPosition, bounty, and name.
 */
export async function importTournamentSummaries(
  summaries: ParsedTournamentSummary[],
): Promise<SummaryImportResult> {
  const result: SummaryImportResult = { updated: 0, created: 0, buyInPreserved: 0 };
  if (summaries.length === 0) return result;

  await db.transaction('rw', db.tournaments, async () => {
    for (const summary of summaries) {
      const existing = await db.tournaments.get(summary.tournamentId);
      if (existing) {
        if (summary.name) existing.name = summary.name;
        if (summary.finishPosition !== null) existing.finishPosition = summary.finishPosition;
        if (summary.prize !== null) existing.prize = summary.prize;
        if (summary.bounty !== null) existing.bounty = summary.bounty;

        // Hand-history wins: only fill buy-in/fee/currency when the row
        // has no hand-history-derived value (buyIn === 0).
        const handHistoryHasBuyIn = (existing.buyIn ?? 0) > 0;
        if (!handHistoryHasBuyIn) {
          if (summary.buyIn !== undefined) existing.buyIn = summary.buyIn;
          if (summary.fee !== undefined) existing.fee = summary.fee;
          if (summary.currency) existing.currency = summary.currency;
        } else if (summary.buyIn !== undefined) {
          result.buyInPreserved++;
        }

        await db.tournaments.put(existing);
        result.updated++;
      } else {
        await db.tournaments.put({
          id: summary.tournamentId,
          name: summary.name,
          buyIn: summary.buyIn ?? 0,
          fee: summary.fee ?? 0,
          format: 'Unknown',
          finishPosition: summary.finishPosition,
          prize: summary.prize,
          bounty: summary.bounty,
          currency: summary.currency,
          handsPlayed: 0,
        });
        result.created++;
      }
    }
  });

  return result;
}

/** Clear all data (for testing / reset). */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.hands, db.players, db.actions, db.tournaments, db.heroDecisions, db.villains, db.sessions, db.importRuns, db.leakStatus, db.srsReview],
    async () => {
      await db.hands.clear();
      await db.players.clear();
      await db.actions.clear();
      await db.tournaments.clear();
      await db.heroDecisions.clear();
      await db.villains.clear();
      await db.sessions.clear();
      await db.importRuns.clear();
      await db.leakStatus.clear();
      await db.srsReview.clear();
    },
  );
}

/** Get the currently configured Hero Name from DB Settings */
export async function getHeroName(): Promise<string> {
  const s = await db.settings.get('global');
  return s?.heroName || 'scorza23';
}

/** Save the currently configured Hero Name */
export async function saveHeroName(heroName: string): Promise<void> {
  await db.settings.put({ id: 'global', heroName });
}

/** Toggle the "starred" status of a hand. */
export async function toggleStarHand(handId: string): Promise<boolean> {
  const hand = await db.hands.get(handId);
  if (!hand) return false;
  
  const newState = !hand.isStarred;
  await db.hands.update(handId, { isStarred: newState });
  return newState;
}

export async function saveImportRun(
  record: ImportRunRecord,
  retentionLimit = IMPORT_DIAGNOSTICS_RETENTION_RUNS,
): Promise<void> {
  const normalizedLimit = Math.max(0, Math.floor(retentionLimit));

  await db.transaction('rw', db.importRuns, async () => {
    await db.importRuns.put(record);

    if (normalizedLimit === 0) {
      await db.importRuns.clear();
      return;
    }

    const excessKeys = await db.importRuns
      .orderBy('importedAt')
      .reverse()
      .offset(normalizedLimit)
      .primaryKeys();

    if (excessKeys.length > 0) {
      await db.importRuns.bulkDelete(excessKeys);
    }
  });
}

export async function clearImportRuns(): Promise<void> {
  await db.importRuns.clear();
}

export async function getRecentImportRuns(limit = 10): Promise<ImportRunRecord[]> {
  return db.importRuns.orderBy('importedAt').reverse().limit(limit).toArray();
}

// --- Leak lifecycle (living entities) ---

export async function getLeakStatuses(): Promise<LeakStatusRecord[]> {
  return db.leakStatus.toArray();
}

/** Mark a leak as one the user is actively studying (idempotent). */
export async function setLeakStudying(leakId: string): Promise<void> {
  const existing = await db.leakStatus.get(leakId);
  if (existing) return;
  await db.leakStatus.put({ leakId, studyingSince: new Date(), resolvedAt: null });
}

/** Stop tracking a leak (removes it from studying and from the graveyard). */
export async function stopStudyingLeak(leakId: string): Promise<void> {
  await db.leakStatus.delete(leakId);
}

/**
 * Advance the leak lifecycle at the import "re-measure" event: recompute the
 * current leak set and reconcile it against the studied leaks. Only studied
 * leaks transition (resolved / regressed), so untouched leaks never mint a
 * tombstone. Returns what changed so the UI can surface it.
 */
export async function reconcileLeakStatusesOnImport(
  profile: StrategyProfile,
): Promise<{ newlyResolved: string[]; newlyRegressed: string[] }> {
  const decisions = await db.heroDecisions.toArray();
  const checked = batchCheckCompliance(decisions, profile);
  const leaks = detectLeaks(computeAggregateStats(checked), profile);
  const currentLeakIds = new Set(leaks.map((leak) => leak.id));

  const records = await db.leakStatus.toArray();
  const result = reconcileLeakStatuses(currentLeakIds, records, new Date());
  const changed = result.records.filter((rec, i) => rec !== records[i]);
  if (changed.length > 0) await db.leakStatus.bulkPut(changed);

  return { newlyResolved: result.newlyResolved, newlyRegressed: result.newlyRegressed };
}

// --- Spaced-repetition review (Arena SRS drills) ---

export async function getSrsReviews(): Promise<SrsReviewRecord[]> {
  return db.srsReview.toArray();
}

/**
 * Record the outcome of drilling one misplay pattern and advance its schedule.
 * Returns the updated record so the caller can reflect the new due date.
 */
export async function recordSrsReview(
  spotKey: string,
  correct: boolean,
  now: number = Date.now(),
): Promise<SrsReviewRecord> {
  const prev = await db.srsReview.get(spotKey);
  const next = gradeSpot(spotKey, prev, correct, now);
  await db.srsReview.put(next);
  return next;
}
