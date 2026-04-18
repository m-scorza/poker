/**
 * IndexedDB persistence via Dexie.js.
 *
 * Stores parsed hands, player data, actions, tournaments, hero decisions,
 * and villain profiles. All data stays client-side.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { Hand, PlayerInHand, Action, Tournament } from '../types/hand';
import type { HeroDecision } from '../types/analysis';
import type { VillainProfile } from '../types/villain';
import type { ParsedTournamentSummary } from '../parser/tournamentSummary';

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
  settings: EntityTable<AppSettings, 'id'>;
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
    (hand as any).hasShowdown = showdownHandIds.has(hand.id);
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

export { db };

/** Check if a hand ID already exists (for deduplication). */
export async function handExists(handId: string): Promise<boolean> {
  const count = await db.hands.where('id').equals(handId).count();
  return count > 0;
}

/** Bulk import parsed hands with deduplication. Returns count of newly imported hands. */
export async function importHands(
  hands: Array<{
    hand: Hand;
    players: PlayerInHand[];
    actions: Action[];
    tournament: Partial<Tournament>;
    heroDecision?: HeroDecision;
  }>,
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
      const tourns = newHands
        .filter((h) => h.tournament.id)
        .map((h) => ({
          id: h.tournament.id!,
          buyIn: h.tournament.buyIn ?? 0,
          fee: h.tournament.fee ?? 0,
          format: h.tournament.format ?? '',
          finishPosition: h.tournament.finishPosition ?? null,
          prize: h.tournament.prize ?? null,
          bounty: (h.tournament as any).bounty ?? null,
          handsPlayed: 0,
        }));
      if (tourns.length > 0) {
        await db.tournaments.bulkPut(tourns);
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

  // Aggregate villain stats outside the main transaction to prevent locking
  await aggregateVillainStats(newHands);

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

/** Save a custom range for a position. */
export function saveCustomRange(position: string, hands: string[]): void {
  localStorage.setItem(`range:${position}`, JSON.stringify(hands));
}

/** Load a custom range for a position. */
export function loadCustomRange(position: string): Set<string> | null {
  const stored = localStorage.getItem(`range:${position}`);
  if (!stored) return null;
  try {
    const hands = JSON.parse(stored) as string[];
    return new Set(hands);
  } catch {
    return null;
  }
}

/** Load all custom ranges. */
export function loadAllCustomRanges(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('range:')) {
      const position = key.slice(6);
      const range = loadCustomRange(position);
      if (range) map.set(position, range);
    }
  }
  return map;
}

/** Delete a custom range for a position. */
export function deleteCustomRange(position: string): void {
  localStorage.removeItem(`range:${position}`);
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
      stats: { vpip: 0, pfr: 0, threeBetPct: 0, foldToThreeBet: 0, cbetFlop: 0, cbetTurn: 0, foldToCbet: 0, wtsd: 0, wsd: 0, af: 0, limpPct: 0 },
      statsByPosition: new Map(),
      shownHands: [],
      archetype: null,
      archetypeConfidence: 'low',
      notes,
      tags,
    } as VillainProfile);
  }
}

/** Aggregate basic stats for villains from newly imported hands (Bug #5) */
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
    villainMap.set(v.playerName, v);
  }

  for (const { hand, players, actions } of handsData) {
    for (const p of players) {
      if (p.isHero) continue;

      let v = villainMap.get(p.playerName);
      if (!v) {
        v = {
          playerName: p.playerName,
          firstSeen: hand.date,
          lastSeen: hand.date,
          totalHands: 0,
          stats: { vpip: 0, pfr: 0, threeBetPct: 0, foldToThreeBet: 0, cbetFlop: 0, cbetTurn: 0, foldToCbet: 0, wtsd: 0, wsd: 0, af: 0, limpPct: 0 },
          statsByPosition: new Map(),
          shownHands: [],
          archetype: null,
          archetypeConfidence: 'low',
          notes: '',
          tags: [],
        };
        villainMap.set(p.playerName, v);
      }

      v.totalHands++;
      if (hand.date > v.lastSeen) v.lastSeen = hand.date;
      if (hand.date < v.firstSeen) v.firstSeen = hand.date;

      // Stat tracking: VPIP, PFR, limps, 3-bets
      const pActions = actions.filter((a) => a.playerName === p.playerName);
      const preflopVoluntary = pActions.filter(
        (a) => a.street === 'preflop' && !['post_ante', 'post_sb', 'post_bb'].includes(a.actionType),
      );
      const hasVpip = preflopVoluntary.some((a) => a.actionType === 'call' || a.actionType === 'raise');
      const hasPfr = preflopVoluntary.some((a) => a.actionType === 'raise');

      // Limp: preflop call with no raise before this player's action
      const allPreflopVoluntary = actions.filter(
        (a) => a.street === 'preflop' && !['post_ante', 'post_sb', 'post_bb'].includes(a.actionType),
      );
      const playerFirstIdx = allPreflopVoluntary.findIndex((a) => a.playerName === p.playerName);
      const actionsBefore = playerFirstIdx > 0 ? allPreflopVoluntary.slice(0, playerFirstIdx) : [];
      const hasRaiseBefore = actionsBefore.some((a) => a.actionType === 'raise');
      const hasLimp = preflopVoluntary.length > 0 &&
        preflopVoluntary[0]!.actionType === 'call' &&
        !hasRaiseBefore;

      // 3-bet: player faces a raise and re-raises
      const has3BetOpp = hasRaiseBefore;
      const has3Bet = has3BetOpp && preflopVoluntary.some((a) => a.actionType === 'raise');

      const n = v.totalHands;
      const updateMA = (old: number, val: number) => ((old * (n - 1)) + val) / n;

      v.stats.vpip = updateMA(v.stats.vpip, hasVpip ? 100 : 0);
      v.stats.pfr = updateMA(v.stats.pfr, hasPfr ? 100 : 0);
      v.stats.limpPct = updateMA(v.stats.limpPct, hasLimp ? 100 : 0);
      if (has3BetOpp) {
        // Track 3-bet % only when they had the opportunity
        const prev3Bet = v.stats.threeBetPct;
        // Weight: count 3-bet opps separately
        v.stats.threeBetPct = updateMA(prev3Bet, has3Bet ? 100 : 0);
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

/** Import parsed tournament summaries */
export async function importTournamentSummaries(
  summaries: ParsedTournamentSummary[],
): Promise<number> {
  if (summaries.length === 0) return 0;

  let count = 0;
  await db.transaction('rw', db.tournaments, async () => {
    for (const summary of summaries) {
      const existing = await db.tournaments.get(summary.tournamentId);
      if (existing) {
        if (summary.finishPosition !== null) existing.finishPosition = summary.finishPosition;
        if (summary.prize !== null) existing.prize = summary.prize;
        if (summary.bounty !== null) existing.bounty = summary.bounty;
        await db.tournaments.put(existing);
        count++;
      } else {
        await db.tournaments.put({
          id: summary.tournamentId,
          buyIn: 0,
          fee: 0,
          format: 'Unknown',
          finishPosition: summary.finishPosition,
          prize: summary.prize,
          bounty: summary.bounty,
          handsPlayed: 0,
        });
        count++;
      }
    }
  });

  return count;
}

/** Clear all data (for testing / reset). */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.hands, db.players, db.actions, db.tournaments, db.heroDecisions, db.villains, db.sessions],
    async () => {
      await db.hands.clear();
      await db.players.clear();
      await db.actions.clear();
      await db.tournaments.clear();
      await db.heroDecisions.clear();
      await db.villains.clear();
      await db.sessions.clear();
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
