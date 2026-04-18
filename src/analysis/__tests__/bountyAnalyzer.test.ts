import { describe, it, expect } from 'vitest';
import {
  detectBountyTournament,
  calculateBPWR,
  estimateBountyContext,
  BOUNTY_HEURISTICS,
} from '../bountyAnalyzer';
import type { Hand, PlayerInHand } from '../../types/hand';

function makeHand(overrides: Partial<Hand>): Hand {
  return {
    id: 'test-1',
    tournamentId: 'T1',
    date: new Date(),
    level: 5,
    smallBlind: 50,
    bigBlind: 100,
    ante: 10,
    maxSeats: 9,
    activePlayers: 6,
    buttonSeat: 1,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 500,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: 5000,
    heroChipsAfter: 5000,
    villainDeltas: [],
    ...overrides,
  };
}

function makePlayer(overrides: Partial<PlayerInHand>): PlayerInHand {
  return {
    handId: 'test-1',
    seatNumber: 1,
    playerName: 'hero',
    chipsBefore: 5000,
    position: 'CO',
    isHero: true,
    holeCards: null,
    ...overrides,
  };
}

describe('detectBountyTournament', () => {
  it('detects regular tournament', () => {
    expect(detectBountyTournament('$10+$1 USD Hold\'em No Limit', 10)).toBe('regular');
  });

  it('detects progressive KO from format string', () => {
    expect(detectBountyTournament('$10+$1 Progressive KO', 10)).toBe('progressive_ko');
  });

  it('detects knockout from format string', () => {
    expect(detectBountyTournament('$10+$1 Knockout', 10)).toBe('knockout');
  });

  it('detects PSKO format', () => {
    expect(detectBountyTournament('$16.50 PSKO', 16.5)).toBe('progressive_ko');
  });

  it('detects PKO format', () => {
    expect(detectBountyTournament('$22 PKO Freezeout', 22)).toBe('progressive_ko');
  });

  it('is case insensitive', () => {
    expect(detectBountyTournament('progressive knockout', 10)).toBe('progressive_ko');
  });
});

describe('calculateBPWR', () => {
  it('returns 0 for zero pot', () => {
    expect(calculateBPWR(100, 0, 5000, 3000)).toBe(0);
  });

  it('calculates correct equity drop when covering', () => {
    // Bounty chip value = 500, pot = 1000, hero covers villain
    const drop = calculateBPWR(500, 1000, 5000, 3000);
    // Expected: 500 / (1000 + 500) * 100 = 33.3%
    expect(drop).toBeCloseTo(33.3, 0);
  });

  it('reduces equity drop when not covering', () => {
    const covering = calculateBPWR(500, 1000, 5000, 3000);
    const notCovering = calculateBPWR(500, 1000, 3000, 5000);
    expect(notCovering).toBeLessThan(covering);
    expect(notCovering).toBeCloseTo(covering * 0.5, 0);
  });

  it('larger bounty gives larger equity drop', () => {
    const smallBounty = calculateBPWR(200, 1000, 5000, 3000);
    const largeBounty = calculateBPWR(800, 1000, 5000, 3000);
    expect(largeBounty).toBeGreaterThan(smallBounty);
  });
});

describe('estimateBountyContext', () => {
  it('returns null for regular tournaments', () => {
    const hand = makeHand({});
    const hero = makePlayer({});
    expect(estimateBountyContext(hand, hero, null, 'regular', 10)).toBeNull();
  });

  it('returns context for PKO tournaments', () => {
    const hand = makeHand({ level: 5 });
    const hero = makePlayer({ chipsBefore: 5000 });
    const villain = makePlayer({ playerName: 'villain', chipsBefore: 3000, isHero: false });

    const ctx = estimateBountyContext(hand, hero, villain, 'progressive_ko', 10);
    expect(ctx).not.toBeNull();
    expect(ctx!.tournamentType).toBe('progressive_ko');
    expect(ctx!.heroCoversVillain).toBe(true);
    expect(ctx!.equityDrop).toBeGreaterThan(0);
  });

  it('detects when hero does not cover villain', () => {
    const hand = makeHand({});
    const hero = makePlayer({ chipsBefore: 3000 });
    const villain = makePlayer({ playerName: 'villain', chipsBefore: 8000, isHero: false });

    const ctx = estimateBountyContext(hand, hero, villain, 'progressive_ko', 10);
    expect(ctx).not.toBeNull();
    expect(ctx!.heroCoversVillain).toBe(false);
  });

  it('higher equity drop in late game for progressive KO', () => {
    const earlyHand = makeHand({ level: 3 });
    const lateHand = makeHand({ level: 15 });
    const hero = makePlayer({});

    const earlyCtx = estimateBountyContext(earlyHand, hero, null, 'progressive_ko', 10);
    const lateCtx = estimateBountyContext(lateHand, hero, null, 'progressive_ko', 10);

    expect(earlyCtx!.stageAdjustment).toBe('early');
    expect(lateCtx!.stageAdjustment).toBe('late');
    expect(lateCtx!.bountyRatio).toBeGreaterThan(earlyCtx!.bountyRatio);
  });

  it('provides action notes based on equity drop', () => {
    const hand = makeHand({});
    const hero = makePlayer({});
    const ctx = estimateBountyContext(hand, hero, null, 'progressive_ko', 10);
    expect(ctx!.note).toBeTruthy();
    expect(typeof ctx!.note).toBe('string');
  });
});

describe('BOUNTY_HEURISTICS', () => {
  it('has expected scenarios', () => {
    expect(BOUNTY_HEURISTICS.coveringVillain).toBeDefined();
    expect(BOUNTY_HEURISTICS.multiWay).toBeDefined();
    expect(BOUNTY_HEURISTICS.earlyGame).toBeDefined();
    expect(BOUNTY_HEURISTICS.lateGame).toBeDefined();
  });

  it('multi-way has highest drop range', () => {
    expect(BOUNTY_HEURISTICS.multiWay.maxDrop).toBeGreaterThan(BOUNTY_HEURISTICS.coveringVillain.maxDrop);
  });
});
