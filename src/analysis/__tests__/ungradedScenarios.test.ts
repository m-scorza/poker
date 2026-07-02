import { describe, expect, it } from 'vitest';
import type { HeroDecision } from '../../types/analysis';
import {
  buildUngradedScenarioImpact,
  buildUngradedScenarioSummary,
  isUngradedDecision,
} from '../ungradedScenarios';

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
    ...overrides,
  };
}

describe('ungraded scenario summaries', () => {
  it('counts refusal scenarios in review order and splits folds from continues', () => {
    const summary = buildUngradedScenarioSummary([
      decision({ handId: 'graded', scenario: 'BB_VS_RAISE', position: 'BB', action: 'call' }),
      decision({ handId: 'threebet', scenario: 'FACING_3BET', action: 'fold' }),
      decision({ handId: 'allin-fold', scenario: 'FACING_ALL_IN', action: 'fold' }),
      decision({ handId: 'allin-call', scenario: 'FACING_ALL_IN', action: 'call' }),
      decision({ handId: 'multiway', scenario: 'BB_VS_RAISE_MULTIWAY', position: 'BB', action: 'raise' }),
    ]);

    expect(summary.map(({ scenario, count, folded, continued }) => ({ scenario, count, folded, continued }))).toEqual([
      { scenario: 'FACING_3BET', count: 1, folded: 1, continued: 0 },
      { scenario: 'FACING_ALL_IN', count: 2, folded: 1, continued: 1 },
      { scenario: 'BB_VS_RAISE_MULTIWAY', count: 1, folded: 0, continued: 1 },
    ]);
    expect(summary[0]!.reason).toContain('3-bet');
  });

  it('marks only explicit compliance-refusal scenarios as ungraded', () => {
    expect(isUngradedDecision(decision({ scenario: 'FACING_ALL_IN' }))).toBe(true);
    expect(isUngradedDecision(decision({
      scenario: 'FACING_RAISE',
      position: 'BTN',
      action: 'call',
      openerPosition: 'CO',
    }))).toBe(true);
    expect(isUngradedDecision(decision({ scenario: 'RFI' }))).toBe(false);
    expect(isUngradedDecision(decision({
      scenario: 'FACING_RAISE',
      position: 'HJ',
      action: 'call',
      openerPosition: 'CO',
    }))).toBe(false);
    expect(buildUngradedScenarioSummary([decision({ scenario: 'RFI' })])).toEqual([]);
  });

  it('routes dynamic facing-raise skips into their own aggregate review rows', () => {
    const summary = buildUngradedScenarioSummary([
      decision({
        handId: 'btn-flat',
        scenario: 'FACING_RAISE',
        position: 'BTN',
        action: 'call',
        openerPosition: 'CO',
      }),
      decision({
        handId: 'unknown-opener',
        scenario: 'FACING_RAISE',
        position: 'HJ',
        action: 'fold',
        openerPosition: null,
      }),
      decision({
        handId: 'graded-cold-call',
        scenario: 'FACING_RAISE',
        position: 'HJ',
        action: 'call',
        openerPosition: 'CO',
      }),
    ]);

    expect(summary.map(({ scenario, count, folded, continued, reason }) => ({
      scenario,
      count,
      folded,
      continued,
      reason,
    }))).toEqual([
      expect.objectContaining({ scenario: 'FACING_RAISE', count: 1, folded: 0, continued: 1 }),
      expect.objectContaining({ scenario: 'FACING_RAISE', count: 1, folded: 1, continued: 0 }),
    ]);
    expect(summary.map((row) => row.reason).join(' | ')).toContain('flat call');
    expect(summary.map((row) => row.reason).join(' | ')).toContain('unknown opener position');
  });

  it('builds a stats-surface impact summary without turning refusals into leaks', () => {
    const impact = buildUngradedScenarioImpact([
      decision({ handId: 'graded-1', scenario: 'RFI' }),
      decision({ handId: 'graded-2', scenario: 'BB_VS_RAISE', position: 'BB' }),
      decision({ handId: 'allin-1', scenario: 'FACING_ALL_IN', action: 'fold' }),
      decision({ handId: 'allin-2', scenario: 'FACING_ALL_IN', action: 'call' }),
      decision({ handId: 'threebet', scenario: 'FACING_3BET', action: 'raise' }),
      decision({ handId: 'bb-limp', scenario: 'BB_VS_LIMP', position: 'BB', action: 'check' }),
    ]);

    expect(impact).toMatchObject({
      total: 4,
      gradeable: 2,
      folded: 1,
      continued: 3,
      scenarioCount: 3,
    });
    expect(impact.rate).toBeCloseTo(4 / 6);
    expect(impact.topScenarios.map((row) => row.scenario)).toEqual([
      'FACING_ALL_IN',
      'FACING_3BET',
      'BB_VS_LIMP',
    ]);
  });
});
