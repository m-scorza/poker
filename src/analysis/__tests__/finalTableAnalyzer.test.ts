import { describe, it, expect } from 'vitest';
import {
  classifyFTStacks,
  detectFakeShove,
  detectRestealSpot,
  FT_DECISION_MATRIX,
} from '../finalTableAnalyzer';
import type { Hand, PlayerInHand, Action } from '../../types/hand';

function makeHand(overrides: Partial<Hand>): Hand {
  return {
    id: 'test-1',
    tournamentId: 'T1',
    date: new Date(),
    level: 12,
    smallBlind: 200,
    bigBlind: 400,
    ante: 50,
    maxSeats: 9,
    activePlayers: 5,
    buttonSeat: 1,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 0,
    rake: 0,
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

function makeAction(overrides: Partial<Action>): Action {
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

describe('classifyFTStacks', () => {
  it('identifies chip leader, medium, and short stacks', () => {
    const players = [
      makePlayer({ playerName: 'CL', chipsBefore: 20000, seatNumber: 1 }),
      makePlayer({ playerName: 'medium1', chipsBefore: 8000, seatNumber: 2, isHero: false }),
      makePlayer({ playerName: 'medium2', chipsBefore: 7000, seatNumber: 3, isHero: false }),
      makePlayer({ playerName: 'short', chipsBefore: 2000, seatNumber: 4, isHero: false }),
    ];

    const profiles = classifyFTStacks(players, 400);
    const cl = profiles.find((p) => p.playerName === 'CL')!;
    const short = profiles.find((p) => p.playerName === 'short')!;

    expect(cl.stackType).toBe('chip_leader');
    expect(short.stackType).toBe('short');
  });

  it('chip leader has lowest risk premium', () => {
    const players = [
      makePlayer({ playerName: 'CL', chipsBefore: 20000, seatNumber: 1 }),
      makePlayer({ playerName: 'medium', chipsBefore: 8000, seatNumber: 2, isHero: false }),
      makePlayer({ playerName: 'short', chipsBefore: 2000, seatNumber: 3, isHero: false }),
    ];

    const profiles = classifyFTStacks(players, 400);
    const cl = profiles.find((p) => p.playerName === 'CL')!;
    const medium = profiles.find((p) => p.playerName === 'medium')!;

    expect(cl.riskPremiumEstimate).toBeLessThan(medium.riskPremiumEstimate);
  });

  it('medium stack has highest risk premium', () => {
    const players = [
      makePlayer({ playerName: 'CL', chipsBefore: 20000, seatNumber: 1 }),
      makePlayer({ playerName: 'medium', chipsBefore: 8000, seatNumber: 2, isHero: false }),
      makePlayer({ playerName: 'short', chipsBefore: 2000, seatNumber: 3, isHero: false }),
    ];

    const profiles = classifyFTStacks(players, 400);
    const medium = profiles.find((p) => p.playerName === 'medium')!;
    const short = profiles.find((p) => p.playerName === 'short')!;

    expect(medium.riskPremiumEstimate).toBeGreaterThan(short.riskPremiumEstimate);
  });

  it('calculates stackBb correctly', () => {
    const players = [makePlayer({ chipsBefore: 6000 })];
    const profiles = classifyFTStacks(players, 400);
    expect(profiles[0]!.stackBb).toBe(15);
  });

  it('handles empty player list', () => {
    expect(classifyFTStacks([], 400)).toEqual([]);
  });

  it('handles all equal stacks (no chip leader)', () => {
    const players = [
      makePlayer({ playerName: 'p1', chipsBefore: 5000, seatNumber: 1 }),
      makePlayer({ playerName: 'p2', chipsBefore: 5000, seatNumber: 2, isHero: false }),
      makePlayer({ playerName: 'p3', chipsBefore: 5000, seatNumber: 3, isHero: false }),
    ];

    const profiles = classifyFTStacks(players, 400);
    // No one should be chip leader since all stacks are equal (not >= 1.5x avg)
    const leaders = profiles.filter((p) => p.stackType === 'chip_leader');
    expect(leaders).toHaveLength(0);
  });
});

describe('detectFakeShove', () => {
  it('detects a fake shove: large raise at 12bb without going all-in', () => {
    const hand = makeHand({ bigBlind: 400, activePlayers: 4 });
    const hero = makePlayer({ chipsBefore: 4800, position: 'BTN' }); // 12bb

    const actions = [
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 3200, sequence: 1 }), // 67% of stack
    ];

    const result = detectFakeShove(hand, hero, actions);
    expect(result).not.toBeNull();
    expect(result!.isFakeShove).toBe(true);
    expect(result!.note).toContain('Fake shove');
  });

  it('returns null for stack > 15bb', () => {
    const hand = makeHand({ bigBlind: 400 });
    const hero = makePlayer({ chipsBefore: 8000 }); // 20bb

    const actions = [
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 4000, sequence: 1 }),
    ];

    expect(detectFakeShove(hand, hero, actions)).toBeNull();
  });

  it('returns null for stack < 8bb', () => {
    const hand = makeHand({ bigBlind: 400 });
    const hero = makePlayer({ chipsBefore: 2800 }); // 7bb

    const actions = [
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 1500, sequence: 1 }),
    ];

    expect(detectFakeShove(hand, hero, actions)).toBeNull();
  });

  it('returns null if hero goes all-in', () => {
    const hand = makeHand({ bigBlind: 400, activePlayers: 4 });
    const hero = makePlayer({ chipsBefore: 4800, position: 'BTN' });

    const actions = [
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 4800, isAllIn: true, sequence: 1 }),
    ];

    expect(detectFakeShove(hand, hero, actions)).toBeNull();
  });

  it('returns null for small raise', () => {
    const hand = makeHand({ bigBlind: 400, activePlayers: 4 });
    const hero = makePlayer({ chipsBefore: 4800, position: 'BTN' });

    const actions = [
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 800, sequence: 1 }), // Only 17% of stack
    ];

    expect(detectFakeShove(hand, hero, actions)).toBeNull();
  });
});

describe('detectRestealSpot', () => {
  it('detects resteal: hero shoves vs opener from BB', () => {
    const hand = makeHand({ bigBlind: 400 });
    const hero = makePlayer({ chipsBefore: 6000, position: 'BB', seatNumber: 3 }); // 15bb
    const villain = makePlayer({ playerName: 'CO_player', chipsBefore: 12000, seatNumber: 1, isHero: false, position: 'CO' });
    const players = [villain, hero];

    const actions = [
      makeAction({ playerName: 'CO_player', actionType: 'raise', amount: 800, sequence: 1 }),
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 6000, isAllIn: true, sequence: 2 }),
    ];

    const result = detectRestealSpot(hand, hero, players, actions);
    expect(result).not.toBeNull();
    expect(result!.heroAction).toBe('resteal');
  });

  it('detects fold in resteal spot', () => {
    const hand = makeHand({ bigBlind: 400 });
    const hero = makePlayer({ chipsBefore: 6000, position: 'BB', seatNumber: 3 });
    const villain = makePlayer({ playerName: 'CL', chipsBefore: 20000, seatNumber: 1, isHero: false, position: 'CO' });
    const players = [villain, hero];

    const actions = [
      makeAction({ playerName: 'CL', actionType: 'raise', amount: 800, sequence: 1 }),
      makeAction({ playerName: 'hero', actionType: 'fold', sequence: 2 }),
    ];

    const result = detectRestealSpot(hand, hero, players, actions);
    expect(result).not.toBeNull();
    expect(result!.heroAction).toBe('fold');
    expect(result!.riskPremiumEstimate).toBeGreaterThan(0);
  });

  it('returns null for hero with > 25bb', () => {
    const hand = makeHand({ bigBlind: 400 });
    const hero = makePlayer({ chipsBefore: 12000, position: 'BB' }); // 30bb
    const players = [hero];

    const actions = [
      makeAction({ playerName: 'villain', actionType: 'raise', amount: 800, sequence: 1 }),
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 2400, sequence: 2 }),
    ];

    expect(detectRestealSpot(hand, hero, players, actions)).toBeNull();
  });

  it('returns null for hero in early position', () => {
    const hand = makeHand({ bigBlind: 400 });
    const hero = makePlayer({ chipsBefore: 6000, position: 'UTG' });
    const players = [hero];

    expect(detectRestealSpot(hand, hero, players, [])).toBeNull();
  });
});

describe('FT_DECISION_MATRIX', () => {
  it('has entries for all major matchups', () => {
    expect(FT_DECISION_MATRIX.length).toBe(8);
  });

  it('chip leader vs short = aggress', () => {
    const entry = FT_DECISION_MATRIX.find(
      (e) => e.heroStack === 'chip_leader' && e.opponentStack === 'short',
    );
    expect(entry).toBeDefined();
    expect(entry!.bias).toContain('Agredir');
  });

  it('medium vs chip leader = caution', () => {
    const entry = FT_DECISION_MATRIX.find(
      (e) => e.heroStack === 'medium' && e.opponentStack === 'chip_leader',
    );
    expect(entry).toBeDefined();
    expect(entry!.bias).toContain('Cautela');
  });
});
