import { describe, expect, it } from 'vitest';
import { buildSolverSpotInputFromParsedHand } from '../solverAdapter';
import type { ParsedHand } from '../../parser/pokerstars';
import type { HeroDecision } from '../../types/analysis';

const makeParsedHand = (): ParsedHand => ({
  hand: {
    id: '9001',
    tournamentId: 'T-77',
    date: new Date('2026-05-18T12:00:00Z'),
    level: 4,
    smallBlind: 50,
    bigBlind: 100,
    ante: 12,
    maxSeats: 6,
    activePlayers: 4,
    buttonSeat: 3,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 650,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: 2_200,
    heroChipsAfter: 1_950,
    villainDeltas: [],
  },
  players: [
    { handId: '9001', seatNumber: 1, playerName: 'VillainA', chipsBefore: 3_000, position: 'CO', isHero: false, holeCards: null },
    { handId: '9001', seatNumber: 3, playerName: 'VillainB', chipsBefore: 1_800, position: 'BTN', isHero: false, holeCards: null },
    { handId: '9001', seatNumber: 4, playerName: 'Hero', chipsBefore: 2_200, position: 'SB', isHero: true, holeCards: ['As', 'Kd'] },
    { handId: '9001', seatNumber: 5, playerName: 'VillainC', chipsBefore: 1_100, position: 'BB', isHero: false, holeCards: null },
  ],
  actions: [
    { handId: '9001', street: 'preflop', playerName: 'VillainA', actionType: 'post_ante', amount: 12, isAllIn: false, sequence: 1 },
    { handId: '9001', street: 'preflop', playerName: 'VillainB', actionType: 'post_ante', amount: 12, isAllIn: false, sequence: 2 },
    { handId: '9001', street: 'preflop', playerName: 'Hero', actionType: 'post_ante', amount: 12, isAllIn: false, sequence: 3 },
    { handId: '9001', street: 'preflop', playerName: 'VillainC', actionType: 'post_ante', amount: 12, isAllIn: false, sequence: 4 },
    { handId: '9001', street: 'preflop', playerName: 'Hero', actionType: 'post_sb', amount: 50, isAllIn: false, sequence: 5 },
    { handId: '9001', street: 'preflop', playerName: 'VillainC', actionType: 'post_bb', amount: 100, isAllIn: false, sequence: 6 },
    { handId: '9001', street: 'preflop', playerName: 'VillainA', actionType: 'raise', amount: 250, isAllIn: false, sequence: 7 },
    { handId: '9001', street: 'preflop', playerName: 'VillainB', actionType: 'fold', amount: null, isAllIn: false, sequence: 8 },
    { handId: '9001', street: 'preflop', playerName: 'Hero', actionType: 'call', amount: 200, isAllIn: false, sequence: 9 },
  ],
  tournament: {
    id: 'T-77',
    name: 'Example MTT',
    buyIn: 11,
    fee: 1,
    finishPosition: null,
    prize: null,
    bounty: null,
    handsPlayed: 1,
  },
  collectedAmounts: new Map(),
  showdownWinners: new Set(),
});

const makeDecision = (): HeroDecision => ({
  handId: '9001',
  position: 'SB',
  handKey: 'AKs',
  stackBb: 22,
  scenario: 'FACING_RAISE',
  action: 'call',
  isCompliant: false,
  deviationType: null,
  sawFlop: false,
  wasPreFlopRaiser: false,
  cbetOpportunity: false,
  cbetMade: false,
  cbetHU: false,
  doubleBarrelOpportunity: false,
  doubleBarrelMade: false,
  wentToShowdown: false,
  wonAtShowdown: false,
  wonAmount: 0,
  icmStage: 'mid',
  squeezeSpot: null,
  netProfit: -250,
  openerPosition: 'CO',
});

describe('solver spot builder', () => {
  it('converts a narrow parsed preflop hero decision into bb-normalized solver input', () => {
    const result = buildSolverSpotInputFromParsedHand(makeParsedHand(), makeDecision());

    expect(result.warnings).toEqual([]);
    expect(result.spot).toMatchObject({
      handId: '9001',
      gameType: 'mtt',
      street: 'preflop',
      heroPosition: 'SB',
      heroStackBb: 22,
      effectiveStackBb: 22,
      potBb: 4.48,
      board: [],
      heroCards: ['As', 'Kd'],
      tournamentContext: { stage: 'mid' },
    });
    expect(result.spot?.actions).toEqual([
      { street: 'preflop', playerPosition: 'CO', action: 'raise', amountBb: 2.5 },
      { street: 'preflop', playerPosition: 'BTN', action: 'fold' },
    ]);
  });

  it('returns no solver spot when required parsed hand context is missing', () => {
    const parsed = makeParsedHand();
    parsed.hand.bigBlind = 0;

    const result = buildSolverSpotInputFromParsedHand(parsed, makeDecision());

    expect(result.spot).toBeNull();
    expect(result.warnings).toContain('missing_big_blind');
  });
});
