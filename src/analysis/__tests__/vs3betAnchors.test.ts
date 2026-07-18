/**
 * Anchor-fidelity suite (plan §5.1): the 25 vault quiz answer keys,
 * transcribed brand-neutral (hand, hero position, stack, expected action).
 * If a grid edit ever breaks an anchor, this fails in CI.
 *
 * Mixed answers list every compliant action. For every anchor we also assert
 * the complement: actions outside the answer set are NOT compliant.
 */

import { describe, it, expect } from 'vitest';
import { checkCompliance, complianceExclusionReasonForDecision } from '../rangeChecker';
import type { HeroDecision, Position } from '../../types/analysis';

type Vs3BetTestAction = 'fold' | 'call' | 'raise';
const ALL_ACTIONS: Vs3BetTestAction[] = ['fold', 'call', 'raise'];

function vs3betDecision(overrides: Partial<HeroDecision>): HeroDecision {
  return {
    handId: 'vs3bet-1',
    position: 'UTG',
    handKey: 'AKs',
    stackBb: 50,
    scenario: 'FACING_3BET',
    action: 'fold',
    heroOpenedBefore3Bet: true,
    threeBetAllIn: false,
    isCompliant: false,
    deviationType: null,
    sawFlop: false,
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

interface AnchorSpot {
  cell: string;
  position: Position;
  stackBb: number;
  handKey: string;
  allowed: Vs3BetTestAction[];
}

// "raise" = 4-bet or all-in (sizing is not graded in v1).
const ANCHORS: AnchorSpot[] = [
  // C1 — EP opened, 3-bet behind, 50bb
  { cell: 'C1', position: 'UTG', stackBb: 50, handKey: 'AJo', allowed: ['fold'] },
  { cell: 'C1', position: 'UTG', stackBb: 50, handKey: '55', allowed: ['call'] },
  { cell: 'C1', position: 'UTG', stackBb: 50, handKey: '65s', allowed: ['call'] },
  // C2 — EP opened, 3-bet behind, 25bb
  { cell: 'C2', position: 'UTG', stackBb: 25, handKey: 'K9s', allowed: ['call'] },
  { cell: 'C2', position: 'UTG', stackBb: 25, handKey: 'A4s', allowed: ['call', 'raise'] },
  { cell: 'C2', position: 'UTG', stackBb: 25, handKey: 'KJo', allowed: ['fold'] },
  // C3 — CO opened, 3-bet behind, 25bb
  { cell: 'C3', position: 'CO', stackBb: 25, handKey: '88', allowed: ['raise'] },
  { cell: 'C3', position: 'CO', stackBb: 25, handKey: 'AJo', allowed: ['call', 'raise'] },
  { cell: 'C3', position: 'CO', stackBb: 25, handKey: 'A8o', allowed: ['fold'] },
  { cell: 'C3', position: 'CO', stackBb: 25, handKey: 'K7s', allowed: ['call'] },
  // C4 — CO opened, 3-bet behind, 50bb
  { cell: 'C4', position: 'CO', stackBb: 50, handKey: 'TT', allowed: ['raise'] },
  { cell: 'C4', position: 'CO', stackBb: 50, handKey: 'A9o', allowed: ['fold', 'raise'] },
  { cell: 'C4', position: 'CO', stackBb: 50, handKey: 'KTo', allowed: ['fold'] },
  { cell: 'C4', position: 'CO', stackBb: 50, handKey: 'AJs', allowed: ['call'] },
  { cell: 'C4', position: 'CO', stackBb: 50, handKey: '76s', allowed: ['call'] },
  // C5 — BTN opened, SB 3-bet, 25bb
  { cell: 'C5', position: 'BTN', stackBb: 25, handKey: 'ATs', allowed: ['call'] },
  { cell: 'C5', position: 'BTN', stackBb: 25, handKey: 'AJo', allowed: ['raise'] },
  { cell: 'C5', position: 'BTN', stackBb: 25, handKey: 'QTo', allowed: ['fold'] },
  { cell: 'C5', position: 'BTN', stackBb: 25, handKey: 'K6s', allowed: ['call'] },
  // C6 — BTN opened, SB 3-bet, 50bb
  { cell: 'C6', position: 'BTN', stackBb: 50, handKey: '99', allowed: ['raise'] },
  { cell: 'C6', position: 'BTN', stackBb: 50, handKey: 'A2s', allowed: ['call', 'raise'] },
  { cell: 'C6', position: 'BTN', stackBb: 50, handKey: 'KJo', allowed: ['call'] },
  { cell: 'C6', position: 'BTN', stackBb: 50, handKey: 'J8s', allowed: ['call'] },
  { cell: 'C6', position: 'BTN', stackBb: 50, handKey: 'A7o', allowed: ['fold'] },
  { cell: 'C6', position: 'BTN', stackBb: 50, handKey: 'K9o', allowed: ['fold'] },
];

describe('vs-3-bet anchor fidelity (25 vault answer keys)', () => {
  it('transcribes all 25 anchors', () => {
    expect(ANCHORS).toHaveLength(25);
  });

  for (const anchor of ANCHORS) {
    const label = `${anchor.cell} ${anchor.position} ${anchor.stackBb}bb ${anchor.handKey}`;
    it(`${label} → ${anchor.allowed.join('/')}`, () => {
      for (const action of ALL_ACTIONS) {
        const result = checkCompliance(vs3betDecision({
          position: anchor.position,
          stackBb: anchor.stackBb,
          handKey: anchor.handKey,
          action,
        }));
        expect(result, `${label} action=${action}`).not.toBeNull();
        expect(result!.isCompliant, `${label} action=${action}`).toBe(
          anchor.allowed.includes(action),
        );
      }
    });
  }
});

describe('checkCompliance — FACING_3BET grading semantics', () => {
  it('≤15bb (Q1): folding a premium is the only flag', () => {
    const overfold = checkCompliance(vs3betDecision({ stackBb: 15, handKey: 'QQ', action: 'fold' }));
    expect(overfold).toEqual({ isCompliant: false, deviationType: 'VS3BET_OVERFOLD' });

    expect(checkCompliance(vs3betDecision({ stackBb: 15, handKey: 'A9o', action: 'fold' }))!.isCompliant).toBe(true);
    expect(checkCompliance(vs3betDecision({ stackBb: 12, handKey: '72o', action: 'call' }))!.isCompliant).toBe(true);
    expect(checkCompliance(vs3betDecision({ stackBb: 10, handKey: 'AKo', action: 'raise' }))!.isCompliant).toBe(true);
  });

  it('≤15bb (Q1): grades even when the 3-bet was all-in', () => {
    const result = checkCompliance(vs3betDecision({
      stackBb: 12, handKey: 'AA', action: 'fold', threeBetAllIn: true,
    }));
    expect(result).toEqual({ isCompliant: false, deviationType: 'VS3BET_OVERFOLD' });
  });

  it('above 15bb an all-in 3-bet is a pot-odds spot — not graded', () => {
    const d = vs3betDecision({ stackBb: 25, handKey: 'AQs', action: 'fold', threeBetAllIn: true });
    expect(checkCompliance(d)).toBeNull();
    expect(complianceExclusionReasonForDecision(d)).toContain('all-in');
  });

  it('cold facing-3-bet spots (no hero open) stay ungraded', () => {
    const d = vs3betDecision({ heroOpenedBefore3Bet: undefined, threeBetAllIn: undefined, handKey: 'AQs', action: 'call' });
    expect(checkCompliance(d)).toBeNull();
    expect(complianceExclusionReasonForDecision(d)).toContain('Cold facing');
  });

  it('Q2 boundary: 40bb uses the 25bb grids, above 40bb the 50bb grids', () => {
    // 88 jams in C3 (25bb grid) but is a call in C4 (50bb grid).
    expect(checkCompliance(vs3betDecision({ position: 'CO', stackBb: 40, handKey: '88', action: 'raise' }))!.isCompliant).toBe(true);
    const above = checkCompliance(vs3betDecision({ position: 'CO', stackBb: 41, handKey: '88', action: 'raise' }));
    expect(above).toEqual({ isCompliant: false, deviationType: 'VS3BET_WRONG_CONTINUE' });
  });

  it('15bb boundary: 15bb is the premium rule, just above uses the grids', () => {
    expect(checkCompliance(vs3betDecision({ stackBb: 15, handKey: 'AQs', action: 'fold' }))!.isCompliant).toBe(true);
    const gridFold = checkCompliance(vs3betDecision({ stackBb: 16, handKey: 'AQs', action: 'fold' }));
    expect(gridFold).toEqual({ isCompliant: false, deviationType: 'VS3BET_OVERFOLD' });
  });

  it('Q4 mixed classes accept both listed actions and nothing else', () => {
    // C6 KTs+ ⚠ → call or fold; a 4-bet is the wrong continue.
    expect(checkCompliance(vs3betDecision({ position: 'BTN', stackBb: 50, handKey: 'KQs', action: 'fold' }))!.isCompliant).toBe(true);
    expect(checkCompliance(vs3betDecision({ position: 'BTN', stackBb: 50, handKey: 'KQs', action: 'call' }))!.isCompliant).toBe(true);
    expect(checkCompliance(vs3betDecision({ position: 'BTN', stackBb: 50, handKey: 'KQs', action: 'raise' })))
      .toEqual({ isCompliant: false, deviationType: 'VS3BET_WRONG_CONTINUE' });

    // C5 99+ ⚠ → jam or call; folding AA is still an overfold.
    expect(checkCompliance(vs3betDecision({ position: 'BTN', stackBb: 25, handKey: 'AA', action: 'call' }))!.isCompliant).toBe(true);
    expect(checkCompliance(vs3betDecision({ position: 'BTN', stackBb: 25, handKey: 'AA', action: 'raise' }))!.isCompliant).toBe(true);
    expect(checkCompliance(vs3betDecision({ position: 'BTN', stackBb: 25, handKey: 'AA', action: 'fold' })))
      .toEqual({ isCompliant: false, deviationType: 'VS3BET_OVERFOLD' });
  });

  it('unlisted hands are pure folds: continuing is a loose continue', () => {
    expect(checkCompliance(vs3betDecision({ stackBb: 50, handKey: '72o', action: 'fold' }))!.isCompliant).toBe(true);
    expect(checkCompliance(vs3betDecision({ stackBb: 50, handKey: '72o', action: 'call' })))
      .toEqual({ isCompliant: false, deviationType: 'VS3BET_LOOSE_CONTINUE' });
    expect(checkCompliance(vs3betDecision({ stackBb: 50, handKey: 'QTo', action: 'raise' })))
      .toEqual({ isCompliant: false, deviationType: 'VS3BET_LOOSE_CONTINUE' });
  });

  it('exclusion reasons agree with grading: null reason ⇔ graded', () => {
    const variants: HeroDecision[] = [
      vs3betDecision({}),
      vs3betDecision({ stackBb: 12 }),
      vs3betDecision({ stackBb: 25, threeBetAllIn: true }),
      vs3betDecision({ heroOpenedBefore3Bet: undefined }),
      vs3betDecision({ position: 'HJ', stackBb: 25, handKey: 'A8o', action: 'call' }),
    ];
    for (const d of variants) {
      const graded = checkCompliance(d) !== null;
      const reason = complianceExclusionReasonForDecision(d);
      expect(reason === null, `${d.position} ${d.stackBb}bb open=${String(d.heroOpenedBefore3Bet)} allin=${String(d.threeBetAllIn)}`).toBe(graded);
    }
  });
});
