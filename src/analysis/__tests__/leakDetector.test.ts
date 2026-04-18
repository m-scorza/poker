import { describe, it, expect } from 'vitest';
import {
  detectLeaks,
  computeAggregateStats,
} from '../leakDetector';
import type { AggregateStats } from '../leakDetector';
import type { HeroDecision } from '../../types/analysis';

function makeDecision(overrides: Partial<HeroDecision>): HeroDecision {
  return {
    handId: '1',
    position: 'UTG',
    handKey: 'AKs',
    stackBb: 30,
    scenario: 'RFI',
    action: 'raise',
    isCompliant: true,
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

function makeStats(overrides: Partial<AggregateStats>): AggregateStats {
  return {
    totalHands: 100,
    vpipHands: 25,
    pfrHands: 20,
    threeBetOpps: 15,
    threeBetMade: 2,
    cbetOpps: 10,
    cbetMade: 7,
    cbetHUOpps: 6,
    cbetHUMade: 6,
    doubleBarrelOpps: 5,
    doubleBarrelMade: 3,
    wtsdHands: 8,
    wonSDHands: 5,
    limpHands: 0,
    totalBets: 10,
    totalRaises: 15,
    totalCalls: 12,
    complianceEligible: 50,
    complianceCompliant: 47,
    postflopErrors: new Map(),
    ...overrides,
  };
}

describe('computeAggregateStats', () => {
  it('counts VPIP correctly', () => {
    const decisions = [
      makeDecision({ action: 'raise' }),
      makeDecision({ action: 'call' }),
      makeDecision({ action: 'fold' }),
      makeDecision({ action: 'check' }),
    ];
    const stats = computeAggregateStats(decisions);
    expect(stats.vpipHands).toBe(2); // raise + call
    expect(stats.totalHands).toBe(4);
  });

  it('counts PFR correctly', () => {
    const decisions = [
      makeDecision({ wasPreFlopRaiser: true }),
      makeDecision({ wasPreFlopRaiser: false }),
    ];
    const stats = computeAggregateStats(decisions);
    expect(stats.pfrHands).toBe(1);
  });

  it('counts limps correctly', () => {
    const decisions = [
      makeDecision({ action: 'call', scenario: 'RFI' }), // limp
      makeDecision({ action: 'call', scenario: 'BB_VS_RAISE' }), // not a limp
      makeDecision({ action: 'call', scenario: 'FACING_LIMP' }), // limp behind
    ];
    const stats = computeAggregateStats(decisions);
    expect(stats.limpHands).toBe(2);
  });

  it('counts c-bet opportunities and executions', () => {
    const decisions = [
      makeDecision({ cbetOpportunity: true, cbetMade: true, cbetHU: true }),
      makeDecision({ cbetOpportunity: true, cbetMade: false, cbetHU: true }),
      makeDecision({ cbetOpportunity: false }),
    ];
    const stats = computeAggregateStats(decisions);
    expect(stats.cbetOpps).toBe(2);
    expect(stats.cbetMade).toBe(1);
    expect(stats.cbetHUOpps).toBe(2);
    expect(stats.cbetHUMade).toBe(1);
  });
});

describe('detectLeaks — Game Plan profile', () => {
  it('returns no leaks for stats within targets', () => {
    const stats = makeStats({
      totalHands: 200,
      vpipHands: 50,      // 25%
      pfrHands: 40,       // 20%
      cbetOpps: 20,
      cbetMade: 14,       // 70%
      cbetHUOpps: 10,
      cbetHUMade: 10,     // 100%
      wtsdHands: 15,      // 30% of VPIP (15/50)
      wonSDHands: 8,      // 53% won at SD (8/15)
      limpHands: 0,
      complianceEligible: 50,
      complianceCompliant: 47, // 94%
    });
    const leaks = detectLeaks(stats, 'game_plan');
    expect(leaks).toHaveLength(0);
  });

  it('detects low VPIP', () => {
    const stats = makeStats({ totalHands: 200, vpipHands: 20 }); // 10%
    const leaks = detectLeaks(stats, 'game_plan');
    const vpipLeak = leaks.find((l) => l.id === 'vpip');
    expect(vpipLeak).toBeDefined();
    expect(vpipLeak!.description).toContain('too tight');
  });

  it('detects high VPIP', () => {
    const stats = makeStats({ totalHands: 100, vpipHands: 40 }); // 40%
    const leaks = detectLeaks(stats, 'game_plan');
    const vpipLeak = leaks.find((l) => l.id === 'vpip');
    expect(vpipLeak).toBeDefined();
    expect(vpipLeak!.description).toContain('too loose');
  });

  it('detects missed HU c-bets (critical leak)', () => {
    const stats = makeStats({ cbetHUOpps: 10, cbetHUMade: 6 }); // 60%
    const leaks = detectLeaks(stats, 'game_plan');
    const cbetLeak = leaks.find((l) => l.id === 'cbet_hu');
    expect(cbetLeak).toBeDefined();
    expect(cbetLeak!.severity).toBe('critical');
  });

  it('detects limping', () => {
    const stats = makeStats({ limpHands: 5 }); // 5%
    const leaks = detectLeaks(stats, 'game_plan');
    const limpLeak = leaks.find((l) => l.id === 'limps');
    expect(limpLeak).toBeDefined();
  });

  it('detects high WTSD', () => {
    const stats = makeStats({ vpipHands: 25, wtsdHands: 12 }); // 48%
    const leaks = detectLeaks(stats, 'game_plan');
    const wtsdLeak = leaks.find((l) => l.id === 'wtsd');
    expect(wtsdLeak).toBeDefined();
    expect(wtsdLeak!.description).toContain('showdown too often');
  });

  it('detects low compliance', () => {
    const stats = makeStats({ complianceEligible: 50, complianceCompliant: 30 }); // 60%
    const leaks = detectLeaks(stats, 'game_plan');
    const compLeak = leaks.find((l) => l.id === 'compliance');
    expect(compLeak).toBeDefined();
  });

  it('sorts by severity (critical first)', () => {
    const stats = makeStats({
      cbetHUOpps: 10,
      cbetHUMade: 3,         // 30% -> critical
      totalHands: 100,
      vpipHands: 10,          // 10% -> medium
      pfrHands: 5,
      limpHands: 3,           // 3%
    });
    const leaks = detectLeaks(stats, 'game_plan');
    if (leaks.length >= 2) {
      expect(leaks[0]!.severity).toBe('critical');
    }
  });

  it('detects postflop leaks from aggregated errors', () => {
    const postflopErrors = new Map();
    postflopErrors.set('PROBE_TURN', { count: 3, sample: 3, note: 'Missed probe', source: '[D#07]' });
    const stats = makeStats({ postflopErrors });
    
    const leaks = detectLeaks(stats, 'game_plan');
    const probeLeak = leaks.find(l => l.id === 'postflop_probe_turn');
    expect(probeLeak).toBeDefined();
    expect(probeLeak!.description).toContain('[D#07]');
    expect(probeLeak!.severity).toBe('medium');
  });
});

describe('detectLeaks — Advanced profile', () => {
  it('detects VPIP-PFR gap', () => {
    const stats = makeStats({
      totalHands: 200,
      vpipHands: 60,    // 30%
      pfrHands: 20,     // 10%  -> gap = 20
    });
    const leaks = detectLeaks(stats, 'advanced');
    const gapLeak = leaks.find((l) => l.id === 'vpip_pfr_gap');
    expect(gapLeak).toBeDefined();
    expect(gapLeak!.description).toContain('passive');
  });

  it('does not detect VPIP-PFR gap in Game Plan profile', () => {
    const stats = makeStats({
      totalHands: 200,
      vpipHands: 60,
      pfrHands: 20,
    });
    const leaks = detectLeaks(stats, 'game_plan');
    const gapLeak = leaks.find((l) => l.id === 'vpip_pfr_gap');
    expect(gapLeak).toBeUndefined();
  });

  it('detects 3-bet frequency issues', () => {
    const stats = makeStats({
      threeBetOpps: 20,
      threeBetMade: 1, // 5%
    });
    const leaks = detectLeaks(stats, 'advanced');
    const tbLeak = leaks.find((l) => l.id === 'three_bet');
    expect(tbLeak).toBeDefined();
  });
});
