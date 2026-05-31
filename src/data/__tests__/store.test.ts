import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { aggregateVillainStats, clearAllData, db, saveVillainNote } from '../store';
import type { Action, Hand, PlayerInHand, Position } from '../../types/hand';

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
