import { describe, expect, it } from 'vitest';
import { computeBb100, computePositionStats } from '../positionStats';
import type { HeroDecision } from '../../types/analysis';
import type { Hand } from '../../types/hand';

function decision(overrides: Partial<HeroDecision>): HeroDecision {
  return {
    handId: 'h1',
    position: 'BTN',
    handKey: 'AKs',
    stackBb: 30,
    scenario: 'RFI',
    action: 'raise',
    isCompliant: true,
    deviationType: null,
    sawFlop: true,
    wasPreFlopRaiser: true,
    cbetOpportunity: false,
    cbetMade: false,
    cbetHU: false,
    doubleBarrelOpportunity: false,
    doubleBarrelMade: false,
    wentToShowdown: false,
    wonAtShowdown: false,
    wonAmount: 0,
    netProfit: 0,
    ...overrides,
  };
}

function hand(id: string, bigBlind: number): Hand {
  return {
    id,
    tournamentId: 't1',
    date: new Date('2026-01-01T00:00:00Z'),
    level: 1,
    smallBlind: bigBlind / 2,
    bigBlind,
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
    heroChipsBefore: 1000,
    heroChipsAfter: 1000,
    villainDeltas: [],
  };
}

describe('computeBb100', () => {
  it('normalizes chip profit by each hand big blind before calculating bb/100', () => {
    const decisions = [
      decision({ handId: 'h1', netProfit: 100 }), // +10bb at 10bb blind
      decision({ handId: 'h2', netProfit: -200 }), // -10bb at 20bb blind
      decision({ handId: 'h3', netProfit: 60 }), // +2bb at 30bb blind
    ];

    const result = computeBb100(decisions, [hand('h1', 10), hand('h2', 20), hand('h3', 30)]);

    expect(result.totalBb).toBe(2);
    expect(result.sampleSize).toBe(3);
    expect(result.bb100).toBeCloseTo(66.666, 2);
  });

  it('ignores hands with missing or invalid big blind data instead of pretending chips equal big blinds', () => {
    const result = computeBb100([
      decision({ handId: 'known', netProfit: 100 }),
      decision({ handId: 'missing', netProfit: 999999 }),
    ], [hand('known', 20)]);

    expect(result.totalBb).toBe(5);
    expect(result.sampleSize).toBe(1);
    expect(result.bb100).toBe(500);
  });
});

describe('computePositionStats', () => {
  it('reports positional bb/100 and total bb, not only raw chip totals', () => {
    const stats = computePositionStats([
      decision({ handId: 'btn-1', position: 'BTN', netProfit: 200 }),
      decision({ handId: 'btn-2', position: 'BTN', netProfit: -50 }),
      decision({ handId: 'bb-1', position: 'BB', netProfit: -100, action: 'check', wasPreFlopRaiser: false }),
    ], [hand('btn-1', 20), hand('btn-2', 10), hand('bb-1', 50)]);

    const btn = stats.find((row) => row.position === 'BTN');
    const bb = stats.find((row) => row.position === 'BB');

    expect(btn?.totalProfit).toBe(150);
    expect(btn?.totalBb).toBe(5); // +10bb - 5bb
    expect(btn?.bb100).toBe(250);
    expect(btn?.bb100Hands).toBe(2);
    expect(bb?.totalBb).toBe(-2);
    expect(bb?.bb100).toBe(-200);
  });
});
