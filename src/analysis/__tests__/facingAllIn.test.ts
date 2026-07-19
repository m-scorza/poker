import { describe, it, expect } from 'vitest';
import {
  checkCompliance,
  complianceExclusionReasonForDecision,
  facingAllInRequiredEquity,
} from '../rangeChecker';
import { buildHeroDecision } from '../scenarioDetector';
import { ALL_IN_EQUITY } from '../../data/allInEquity.generated';
import { PUSH_RANGES } from '../../data/pushFoldRanges';
import type { ParsedHand } from '../../parser/pokerstars';
import type { HeroDecision, Position } from '../../types/analysis';
import type { Action, Hand, PlayerInHand } from '../../types/hand';
import { makeAction, makeHand, makePlayer } from '../../test/factories';

/** A graded cold open-shove decision: 12.6bb pot, 10bb to call (plan §4 A–D). */
function allInDecision(overrides: Partial<HeroDecision>): HeroDecision {
  return {
    handId: 'a1',
    position: 'BTN',
    handKey: 'A9s',
    stackBb: 30,
    scenario: 'FACING_ALL_IN',
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
    netProfit: 0,
    icmStage: 'early',
    bountyContext: null,
    shoverPosition: 'CO',
    facingAllInOpenShove: true,
    allInPotBb: 12.6,
    allInCallCostBb: 10,
    allInEffectiveBb: 10,
    ...overrides,
  };
}

describe('facingAllInRequiredEquity', () => {
  it('is pot odds plus the risk premium', () => {
    // 10 to call into a 12.6bb pot → 44.25% chip-EV, early stage adds 0pp.
    expect(facingAllInRequiredEquity(10, 12.6, 0)).toBeCloseTo(44.25, 1);
    // ITM adds 8pp per the stage-constant table.
    expect(facingAllInRequiredEquity(10, 12.6, 8)).toBeCloseTo(52.25, 1);
  });

  it("matches the KB's worked KJo bubble example (05-icm §3)", () => {
    // 46% chip-EV pot odds + 22.9pp bubble risk premium = 68.9% required.
    expect(facingAllInRequiredEquity(46, 54, 22.9)).toBeCloseTo(68.9, 1);
  });
});

describe('checkFacingAllIn — graded verdicts (plan §4 A–D)', () => {
  it('A: A9s vs a CO shove is a clear call (fold flags ALLIN_OVERFOLD)', () => {
    expect(ALL_IN_EQUITY.A9s!.CO).toBeGreaterThan(47.25); // req 44.25 + 3pp band
    expect(checkCompliance(allInDecision({ action: 'call' }))).toEqual({
      isCompliant: true,
      deviationType: null,
      provenance: 'engine',
    });
    expect(checkCompliance(allInDecision({ action: 'fold' }))).toEqual({
      isCompliant: false,
      deviationType: 'ALLIN_OVERFOLD',
      provenance: 'engine',
    });
  });

  it('B: 22 vs a tight UTG shove is a clear fold (call flags ALLIN_LOOSE_CALL)', () => {
    expect(ALL_IN_EQUITY['22']!.UTG).toBeLessThan(41.25); // req 44.25 − 3pp band
    const base = { handKey: '22', shoverPosition: 'UTG' as Position };
    expect(checkCompliance(allInDecision({ ...base, action: 'fold' }))).toEqual({
      isCompliant: true,
      deviationType: null,
      provenance: 'engine',
    });
    expect(checkCompliance(allInDecision({ ...base, action: 'call' }))).toEqual({
      isCompliant: false,
      deviationType: 'ALLIN_LOOSE_CALL',
      provenance: 'engine',
    });
  });

  it('C: KQs vs a UTG shove sits inside the band — mixed, both compliant', () => {
    const equity = ALL_IN_EQUITY.KQs!.UTG!;
    expect(equity).toBeGreaterThan(41.25);
    expect(equity).toBeLessThan(47.25);
    const base = { handKey: 'KQs', shoverPosition: 'UTG' as Position };
    for (const action of ['fold', 'call'] as const) {
      expect(checkCompliance(allInDecision({ ...base, action }))).toEqual({
        isCompliant: true,
        deviationType: null,
        provenance: 'band',
      });
    }
  });

  it('D: the ITM risk premium moves the A9s call into the band', () => {
    expect(checkCompliance(allInDecision({ icmStage: 'itm', action: 'fold' }))).toEqual({
      isCompliant: true,
      deviationType: null,
      provenance: 'band',
    });
  });

  it('grades a re-jam over the shove as a call', () => {
    expect(checkCompliance(allInDecision({ action: 'raise' }))).toMatchObject({
      isCompliant: true,
      deviationType: null,
    });
  });
});

describe('checkFacingAllIn — refusal pockets', () => {
  const cases: { name: string; overrides: Partial<HeroDecision>; reason: string }[] = [
    {
      name: 'rows persisted before the engine (missing inputs)',
      overrides: { facingAllInOpenShove: undefined, allInPotBb: undefined, allInCallCostBb: undefined, allInEffectiveBb: undefined, shoverPosition: undefined },
      reason: 'before the pot-odds engine',
    },
    { name: 'not a first-in open-shove', overrides: { facingAllInOpenShove: false }, reason: 'over prior action' },
    { name: 'deeper than 12bb effective', overrides: { allInEffectiveBb: 15 }, reason: 'deeper than 12bb' },
    { name: 'bubble ICM', overrides: { icmStage: 'bubble' }, reason: 'bubble or final table' },
    { name: 'final-table ICM', overrides: { icmStage: 'final_table' }, reason: 'bubble or final table' },
    { name: 'PKO tournament', overrides: { bountyContext: { tournamentType: 'progressive_ko' } as HeroDecision['bountyContext'] }, reason: 'bounty (PKO)' },
  ];

  for (const { name, overrides, reason } of cases) {
    it(`refuses ${name}`, () => {
      const d = allInDecision(overrides);
      expect(checkCompliance(d)).toBeNull();
      expect(complianceExclusionReasonForDecision(d)).toContain(reason);
    });
  }
});

describe('all-in equity table sanity', () => {
  const positions = Object.keys(PUSH_RANGES) as Position[];

  it('AA is at least 77% versus every shove range', () => {
    for (const p of positions) expect(ALL_IN_EQUITY.AA![p]!).toBeGreaterThanOrEqual(77);
  });

  it('suited hands are at least as strong as their offsuit twins', () => {
    for (const pair of [['AKs', 'AKo'], ['KQs', 'KQo'], ['T9s', 'T9o'], ['54s', '54o']]) {
      for (const p of positions) {
        expect(ALL_IN_EQUITY[pair[0]!]![p]!).toBeGreaterThanOrEqual(ALL_IN_EQUITY[pair[1]!]![p]!);
      }
    }
  });

  it('dominating broadways gain equity versus the wide BTN range vs the tight UTG range', () => {
    // Pocket aces already sit at the ceiling versus any range, so the widening
    // signal shows in the big non-pair hands that dominate a loose shover.
    for (const hand of ['AKs', 'AQs', 'AJs', 'KQs']) {
      expect(ALL_IN_EQUITY[hand]!.BTN!).toBeGreaterThan(ALL_IN_EQUITY[hand]!.UTG!);
    }
  });
});

// --- Full-pipeline pot construction + routing ---

const HERO = 'Hero';
const BB = 100;

function parsed(players: PlayerInHand[], actions: Action[], handOverrides: Partial<Hand> = {}): ParsedHand {
  const hand = makeHand({
    id: 'ai',
    smallBlind: 50,
    bigBlind: BB,
    ante: 0,
    maxSeats: 6,
    activePlayers: 6,
    level: 1,
    ...handOverrides,
  });
  return {
    hand,
    players: players.map((p) => ({ ...p, handId: hand.id })),
    actions: actions.map((a, i) => ({ ...a, handId: hand.id, street: 'preflop', sequence: i })),
    tournament: { id: 'T', buyIn: 10, fee: 1, format: "Hold'em No Limit", finishPosition: null, prize: 0, bounty: 0, handsPlayed: 0 },
    collectedAmounts: new Map(),
    showdownWinners: new Set(),
  };
}

function seat(name: string, position: Position, chips: number, hole: [string, string] | null = null): PlayerInHand {
  return makePlayer({ playerName: name, position, chipsBefore: chips, chipsAfter: chips, isHero: name === HERO, holeCards: hole, seatNumber: 1 });
}

describe('FACING_ALL_IN pipeline — pot construction and routing', () => {
  it('computes side-pot-free pot, call cost, and effective stack for a hero-covered shove', () => {
    const players = [
      seat('CO', 'CO', 1000, ['Ks', 'Kd']),
      seat(HERO, 'BTN', 3000, ['Ah', '9h']),
      seat('sb', 'SB', 8000),
      seat('bb', 'BB', 8000),
      seat('utg', 'UTG', 8000),
      seat('hj', 'HJ', 8000),
    ];
    const actions = [
      makeAction({ playerName: 'sb', actionType: 'post_sb', amount: 50 }),
      makeAction({ playerName: 'bb', actionType: 'post_bb', amount: BB }),
      makeAction({ playerName: 'utg', actionType: 'fold' }),
      makeAction({ playerName: 'hj', actionType: 'fold' }),
      makeAction({ playerName: 'CO', actionType: 'raise', amount: 1000, isAllIn: true }),
      makeAction({ playerName: HERO, actionType: 'call', amount: 1000 }),
    ];
    const d = buildHeroDecision(parsed(players, actions), HERO)!;
    expect(d.scenario).toBe('FACING_ALL_IN');
    expect(d.facingAllInOpenShove).toBe(true);
    expect(d.shoverPosition).toBe('CO');
    expect(d.allInPotBb).toBeCloseTo(11.5, 5); // 50 + 100 + 1000 over BB
    expect(d.allInCallCostBb).toBeCloseTo(10, 5);
    expect(d.allInEffectiveBb).toBeCloseTo(10, 5);
    expect(d.icmStage).toBe('early');
    expect(checkCompliance(d)).toMatchObject({ isCompliant: true, provenance: 'engine' });
  });

  it('keeps antes in the pot but out of the call cost (street investment)', () => {
    const players = [
      seat('CO', 'CO', 1010, ['Ks', 'Kd']),
      seat(HERO, 'BTN', 3000, ['Ah', '9h']),
      seat('sb', 'SB', 8000),
      seat('bb', 'BB', 8000),
      seat('utg', 'UTG', 8000),
      seat('hj', 'HJ', 8000),
    ];
    const antes = ['CO', HERO, 'sb', 'bb', 'utg', 'hj'].map((n) =>
      makeAction({ playerName: n, actionType: 'post_ante', amount: 10 }),
    );
    const actions = [
      ...antes,
      makeAction({ playerName: 'sb', actionType: 'post_sb', amount: 50 }),
      makeAction({ playerName: 'bb', actionType: 'post_bb', amount: BB }),
      makeAction({ playerName: 'utg', actionType: 'fold' }),
      makeAction({ playerName: 'hj', actionType: 'fold' }),
      makeAction({ playerName: 'CO', actionType: 'raise', amount: 1000, isAllIn: true }),
      makeAction({ playerName: HERO, actionType: 'fold' }),
    ];
    const d = buildHeroDecision(parsed(players, actions, { ante: 10 }), HERO)!;
    // pot = 6*10 antes + 50 + 100 + 1000 = 1210 over BB=100 → 12.1bb.
    expect(d.allInPotBb).toBeCloseTo(12.1, 5);
    expect(d.allInCallCostBb).toBeCloseTo(10, 5); // ante is not part of the street bet
  });

  it('removes the uncallable excess when the shover covers hero (side-pot)', () => {
    const players = [
      seat('CO', 'CO', 1000, ['Ks', 'Kd']),
      seat(HERO, 'BTN', 600, ['Ah', '9h']),
      seat('sb', 'SB', 8000),
      seat('bb', 'BB', 8000),
      seat('utg', 'UTG', 8000),
      seat('hj', 'HJ', 8000),
    ];
    const actions = [
      makeAction({ playerName: 'sb', actionType: 'post_sb', amount: 50 }),
      makeAction({ playerName: 'bb', actionType: 'post_bb', amount: BB }),
      makeAction({ playerName: 'utg', actionType: 'fold' }),
      makeAction({ playerName: 'hj', actionType: 'fold' }),
      makeAction({ playerName: 'CO', actionType: 'raise', amount: 1000, isAllIn: true }),
      makeAction({ playerName: HERO, actionType: 'call', amount: 600, isAllIn: true }),
    ];
    const d = buildHeroDecision(parsed(players, actions), HERO)!;
    // raw pot 1150; hero can only call 600, so 400 of the shove is uncallable.
    expect(d.allInPotBb).toBeCloseTo(7.5, 5);
    expect(d.allInCallCostBb).toBeCloseTo(6, 5);
    expect(d.allInEffectiveBb).toBeCloseTo(6, 5);
  });

  it('routes an SB cold-facing a shove to FACING_ALL_IN, not FACING_RAISE', () => {
    const players = [
      seat('CO', 'CO', 1000, ['Ks', 'Kd']),
      seat(HERO, 'SB', 3000, ['Ah', '9h']),
      seat('bb', 'BB', 8000),
      seat('utg', 'UTG', 8000),
      seat('hj', 'HJ', 8000),
      seat('btn', 'BTN', 8000),
    ];
    const actions = [
      makeAction({ playerName: HERO, actionType: 'post_sb', amount: 50 }),
      makeAction({ playerName: 'bb', actionType: 'post_bb', amount: BB }),
      makeAction({ playerName: 'utg', actionType: 'fold' }),
      makeAction({ playerName: 'hj', actionType: 'fold' }),
      makeAction({ playerName: 'CO', actionType: 'raise', amount: 1000, isAllIn: true }),
      makeAction({ playerName: 'btn', actionType: 'fold' }),
      makeAction({ playerName: HERO, actionType: 'fold' }),
    ];
    const d = buildHeroDecision(parsed(players, actions), HERO)!;
    expect(d.scenario).toBe('FACING_ALL_IN');
    expect(d.facingAllInOpenShove).toBe(true);
    expect(d.allInCallCostBb).toBeCloseTo(9.5, 5); // 1000 to-amount − 50 SB already in
  });

  it('refuses a shove that came over a prior open (not first-in)', () => {
    const players = [
      seat('utg', 'UTG', 5000),
      seat('CO', 'CO', 1000, ['Ks', 'Kd']),
      seat(HERO, 'BTN', 3000, ['Ah', '9h']),
      seat('sb', 'SB', 8000),
      seat('bb', 'BB', 8000),
      seat('hj', 'HJ', 8000),
    ];
    const actions = [
      makeAction({ playerName: 'sb', actionType: 'post_sb', amount: 50 }),
      makeAction({ playerName: 'bb', actionType: 'post_bb', amount: BB }),
      makeAction({ playerName: 'utg', actionType: 'raise', amount: 250 }),
      makeAction({ playerName: 'hj', actionType: 'fold' }),
      makeAction({ playerName: 'CO', actionType: 'raise', amount: 1000, isAllIn: true }),
      makeAction({ playerName: HERO, actionType: 'fold' }),
    ];
    const d = buildHeroDecision(parsed(players, actions), HERO)!;
    expect(d.scenario).toBe('FACING_ALL_IN');
    expect(d.facingAllInOpenShove).toBe(false);
    expect(checkCompliance(d)).toBeNull();
    expect(complianceExclusionReasonForDecision(d)).toContain('over prior action');
  });

  it('refuses a multiway shove with a caller already in', () => {
    const players = [
      seat('CO', 'CO', 1000, ['Ks', 'Kd']),
      seat('btn', 'BTN', 5000),
      seat(HERO, 'SB', 3000, ['Ah', '9h']),
      seat('bb', 'BB', 8000),
      seat('utg', 'UTG', 8000),
      seat('hj', 'HJ', 8000),
    ];
    const actions = [
      makeAction({ playerName: HERO, actionType: 'post_sb', amount: 50 }),
      makeAction({ playerName: 'bb', actionType: 'post_bb', amount: BB }),
      makeAction({ playerName: 'utg', actionType: 'fold' }),
      makeAction({ playerName: 'hj', actionType: 'fold' }),
      makeAction({ playerName: 'CO', actionType: 'raise', amount: 1000, isAllIn: true }),
      makeAction({ playerName: 'btn', actionType: 'call', amount: 1000 }),
      makeAction({ playerName: HERO, actionType: 'fold' }),
    ];
    const d = buildHeroDecision(parsed(players, actions), HERO)!;
    expect(d.scenario).toBe('FACING_ALL_IN');
    expect(d.facingAllInOpenShove).toBe(false);
    expect(checkCompliance(d)).toBeNull();
  });
});
