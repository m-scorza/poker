import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  aggregateVillainStats,
  clearAllData,
  clearImportRuns,
  db,
  getParsedHandForHandId,
  getRecentImportRuns,
  getSrsReviews,
  recordSrsReview,
  saveImportRun,
  saveVillainNote,
} from '../store';
import type { Action, Hand, PlayerInHand, Position } from '../../types/hand';
import type { ImportRunRecord } from '../importRuns';
import {
  IMPORT_DIAGNOSTICS_RETENTION_RUNS,
  buildImportDiagnosticsSnapshot,
} from '../importDiagnosticsPolicy';

function makeHand(id: string, overrides: Partial<Hand> = {}): Hand {
  return {
    id,
    tournamentId: 'T1',
    date: new Date(`2026-05-31T10:${id.padStart(2, '0')}:00Z`),
    level: 1,
    smallBlind: 10,
    bigBlind: 20,
    ante: 0,
    maxSeats: 6,
    activePlayers: 6,
    buttonSeat: 1,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 0,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: 2_000,
    heroChipsAfter: 2_000,
    villainDeltas: [],
    ...overrides,
  };
}

function makePlayer(
  handId: string,
  playerName: string,
  position: Position,
  isHero = false,
  overrides: Partial<PlayerInHand> = {},
): PlayerInHand {
  return {
    handId,
    seatNumber: isHero ? 1 : 2,
    playerName,
    chipsBefore: 2_000,
    position,
    isHero,
    holeCards: null,
    ...overrides,
  };
}

function action(
  handId: string,
  sequence: number,
  playerName: string,
  actionType: Action['actionType'],
  street: Action['street'] = 'preflop',
): Action {
  return {
    handId,
    street,
    playerName,
    actionType,
    amount: actionType === 'fold' || actionType === 'check' ? null : 60,
    isAllIn: false,
    sequence,
  };
}

function handData(
  id: string,
  villainPosition: Position,
  actions: Action[],
  handOverrides: Partial<Hand> = {},
  playerOverrides: Partial<PlayerInHand> = {},
) {
  return {
    hand: makeHand(id, handOverrides),
    players: [
      makePlayer(id, 'Hero', 'BB', true),
      makePlayer(id, 'Villain', villainPosition, false, playerOverrides),
    ],
    actions,
  };
}

function makeImportRunRecord(index: number): ImportRunRecord {
  return {
    id: `import-${index}`,
    importedAt: new Date(Date.UTC(2026, 4, 17, 20, index, 0)),
    sourceFiles: [`run-${index}.txt`],
    totalFiles: 1,
    parsedFiles: 1,
    failedFiles: 0,
    handsFound: index,
    summariesFound: 0,
    savedHands: index,
    savedSummaries: 0,
    confidence: 'high',
    warnings: [],
    diagnostics: buildImportDiagnosticsSnapshot(),
  };
}

describe('aggregateVillainStats', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('persists statsByPosition as a serializable record', async () => {
    await aggregateVillainStats([
      handData('1', 'CO', [
        action('1', 1, 'Villain', 'raise'),
        action('1', 2, 'Hero', 'fold'),
      ]),
    ]);

    const villain = await db.villains.get('Villain');

    expect(villain).toBeDefined();
    expect(villain!.statsByPosition).not.toBeInstanceOf(Map);
    expect(villain!.statsByPosition.CO).toMatchObject({
      hands: 1,
      vpip: 100,
      pfr: 100,
    });
    expect(villain!.statsByPosition.CO!.rawCounters).toMatchObject({
      totalHands: 1,
      vpipHands: 1,
      pfrHands: 1,
    });
  });

  it('uses 3-bet opportunities rather than total hands as the denominator', async () => {
    await aggregateVillainStats([
      handData('1', 'CO', [
        action('1', 1, 'Hero', 'raise'),
        action('1', 2, 'Villain', 'raise'),
      ]),
      handData('2', 'CO', [
        action('2', 1, 'Villain', 'raise'),
        action('2', 2, 'Hero', 'fold'),
      ]),
      handData('3', 'CO', [
        action('3', 1, 'Villain', 'fold'),
      ]),
    ]);

    const villain = await db.villains.get('Villain');

    expect(villain!.rawCounters).toMatchObject({
      totalHands: 3,
      threeBetOpps: 1,
      threeBetMade: 1,
    });
    expect(villain!.stats.threeBetPct).toBe(100);
  });

  it('does not count a 3-bettor folding to a 4-bet as fold-to-3-bet', async () => {
    await aggregateVillainStats([
      handData('1', 'CO', [
        action('1', 1, 'Hero', 'raise'),
        action('1', 2, 'Villain', 'raise'),
        action('1', 3, 'Hero', 'raise'),
        action('1', 4, 'Villain', 'fold'),
      ]),
    ]);

    const villain = await db.villains.get('Villain');

    expect(villain!.rawCounters).toMatchObject({
      threeBetOpps: 1,
      threeBetMade: 1,
      foldToThreeBetOpps: 0,
      foldToThreeBetMade: 0,
    });
    expect(villain!.stats.foldToThreeBet).toBe(0);
  });

  it('tracks per-position VPIP/PFR independently', async () => {
    await aggregateVillainStats([
      handData('1', 'CO', [
        action('1', 1, 'Villain', 'raise'),
        action('1', 2, 'Hero', 'fold'),
      ]),
      handData('2', 'BTN', [
        action('2', 1, 'Villain', 'fold'),
      ]),
    ]);

    const villain = await db.villains.get('Villain');

    expect(villain!.stats.vpip).toBe(50);
    expect(villain!.statsByPosition.CO).toMatchObject({ hands: 1, vpip: 100, pfr: 100 });
    expect(villain!.statsByPosition.BTN).toMatchObject({ hands: 1, vpip: 0, pfr: 0 });
  });

  it('uses c-bet opportunities rather than total hands as the denominator', async () => {
    await aggregateVillainStats([
      handData('1', 'CO', [
        action('1', 1, 'Villain', 'raise'),
        action('1', 2, 'Hero', 'call'),
        action('1', 3, 'Villain', 'bet', 'flop'),
        action('1', 4, 'Hero', 'fold', 'flop'),
      ]),
      handData('2', 'CO', [
        action('2', 1, 'Villain', 'raise'),
        action('2', 2, 'Hero', 'call'),
        action('2', 3, 'Villain', 'check', 'flop'),
      ]),
      handData('3', 'CO', [
        action('3', 1, 'Villain', 'fold'),
      ]),
    ]);

    const villain = await db.villains.get('Villain');

    expect(villain!.rawCounters).toMatchObject({
      totalHands: 3,
      cbetFlopOpps: 2,
      cbetFlopMade: 1,
    });
    expect(villain!.stats.cbetFlop).toBe(50);
  });

  it('preserves notes and tags while updating stats', async () => {
    await saveVillainNote('Villain', 'floats too wide', ['sticky']);

    await aggregateVillainStats([
      handData('1', 'HJ', [
        action('1', 1, 'Villain', 'call'),
        action('1', 2, 'Hero', 'check'),
      ]),
    ]);

    const villain = await db.villains.get('Villain');

    expect(villain!.notes).toBe('floats too wide');
    expect(villain!.tags).toEqual(['sticky']);
    expect(villain!.stats.vpip).toBe(100);
  });
});

describe('getParsedHandForHandId', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('rehydrates hand, player, action, and tournament rows into a ParsedHand boundary', async () => {
    const hand = makeHand('rehydrate', {
      tournamentId: 'T-rehydrate',
      bigBlind: 100,
      totalPot: 650,
      importSource: {
        site: 'pokerstars',
        fileType: 'hand_history',
        accessMethod: 'local_file',
        parserConfidence: 'high',
      },
    });
    const players = [
      makePlayer('rehydrate', 'Hero', 'SB', true, { seatNumber: 2, holeCards: ['As', 'Ks'] }),
      makePlayer('rehydrate', 'Villain', 'CO', false, { seatNumber: 1 }),
    ];
    const actions = [
      { ...action('rehydrate', 2, 'Hero', 'call'), amount: 200 },
      { ...action('rehydrate', 1, 'Villain', 'raise'), amount: 250 },
    ];

    await db.hands.add(hand);
    await db.players.bulkAdd(players);
    await db.actions.bulkAdd(actions);
    await db.tournaments.put({ id: 'T-rehydrate', buyIn: 11, fee: 1, format: 'MTT', finishPosition: null, prize: null, bounty: null, handsPlayed: 1 });

    const parsed = await getParsedHandForHandId('rehydrate');

    expect(parsed?.hand.id).toBe('rehydrate');
    expect(new Set(parsed?.players.map((player) => player.position))).toEqual(new Set(['SB', 'CO']));
    expect(parsed?.actions.map((storedAction) => storedAction.sequence)).toEqual([1, 2]);
    expect(parsed?.tournament).toMatchObject({ id: 'T-rehydrate', buyIn: 11, handsPlayed: 1 });
    expect(parsed?.collectedAmounts).toBeInstanceOf(Map);
    expect(parsed?.showdownWinners).toBeInstanceOf(Set);
  });
});

describe('import diagnostics persistence', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('keeps only the latest local diagnostic runs by default', async () => {
    for (let i = 0; i < IMPORT_DIAGNOSTICS_RETENTION_RUNS + 2; i++) {
      await saveImportRun(makeImportRunRecord(i));
    }

    const runs = await getRecentImportRuns(IMPORT_DIAGNOSTICS_RETENTION_RUNS + 10);

    expect(runs).toHaveLength(IMPORT_DIAGNOSTICS_RETENTION_RUNS);
    expect(runs[0]!.id).toBe(`import-${IMPORT_DIAGNOSTICS_RETENTION_RUNS + 1}`);
    expect(runs[runs.length - 1]!.id).toBe('import-2');
  });

  it('clears import diagnostics without requiring a full local data reset', async () => {
    await saveImportRun(makeImportRunRecord(1));
    await clearImportRuns();

    await expect(getRecentImportRuns()).resolves.toEqual([]);
  });
});

describe('spaced-review persistence', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('persists a new review and reads it back', async () => {
    const now = 1_000_000_000;
    const rec = await recordSrsReview('UTG|A5s|RFI', true, now);
    expect(rec.box).toBe(1);

    const all = await getSrsReviews();
    expect(all).toHaveLength(1);
    expect(all[0]!.spotKey).toBe('UTG|A5s|RFI');
    expect(all[0]!.dueAt).toBeGreaterThan(now);
  });

  it('advances the schedule on repeat review of the same pattern', async () => {
    const now = 1_000_000_000;
    await recordSrsReview('k', true, now); // box 1
    const second = await recordSrsReview('k', true, now); // box 2
    expect(second.box).toBe(2);

    const all = await getSrsReviews();
    expect(all).toHaveLength(1); // same pattern, not a duplicate
  });

  it('is wiped by clearAllData', async () => {
    await recordSrsReview('k', true);
    await clearAllData();
    await expect(getSrsReviews()).resolves.toEqual([]);
  });
});
