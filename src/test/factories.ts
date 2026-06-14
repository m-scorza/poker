/**
 * Shared test-data factories.
 *
 * Each factory owns the full shape of its domain type with neutral defaults and
 * accepts a `Partial<T>` override, so adding a field to `Hand`/`PlayerInHand`/
 * `Action`/`Tournament` is a one-place edit instead of churning every test file.
 * Test files that need a different baseline wrap these with their own defaults.
 */

import type { Action, Hand, PlayerInHand, Tournament } from '../types/hand';

export function makeHand(overrides: Partial<Hand> = {}): Hand {
  return {
    id: 'test-1',
    tournamentId: 'T1',
    date: new Date('2026-01-01T00:00:00.000Z'),
    level: 1,
    smallBlind: 10,
    bigBlind: 20,
    ante: 0,
    maxSeats: 9,
    activePlayers: 9,
    buttonSeat: 1,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 0,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: 1500,
    heroChipsAfter: 1500,
    villainDeltas: [],
    ...overrides,
  };
}

export function makePlayer(overrides: Partial<PlayerInHand> = {}): PlayerInHand {
  return {
    handId: 'test-1',
    seatNumber: 1,
    playerName: 'hero',
    chipsBefore: 1500,
    position: 'CO',
    isHero: true,
    holeCards: null,
    ...overrides,
  };
}

export function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    handId: 'test-1',
    street: 'preflop',
    playerName: 'hero',
    actionType: 'fold',
    amount: null,
    isAllIn: false,
    sequence: 0,
    ...overrides,
  };
}

export function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'T1',
    buyIn: 10,
    fee: 1,
    format: 'MTT',
    finishPosition: null,
    prize: 0,
    bounty: 0,
    handsPlayed: 0,
    ...overrides,
  };
}
