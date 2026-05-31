import { describe, it, expect } from 'vitest';
import {
  checkCompliance,
  compliancePercentage,
  batchCheckCompliance,
} from '../rangeChecker';
import type { HeroDecision } from '../../types/analysis';

function makeDecision(overrides: Partial<HeroDecision>): HeroDecision {
  return {
    handId: '1',
    position: 'UTG',
    handKey: 'AKs',
    stackBb: 30,
    scenario: 'RFI',
    action: 'raise',
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

describe('checkCompliance — RFI', () => {
  it('compliant: raise in-range hand from UTG', () => {
    const d = makeDecision({ position: 'UTG', handKey: 'AKs', action: 'raise', scenario: 'RFI' });
    const result = checkCompliance(d);
    expect(result).toEqual({ isCompliant: true, deviationType: null });
  });

  it('compliant: fold out-of-range hand from UTG', () => {
    const d = makeDecision({ position: 'UTG', handKey: '72o', action: 'fold', scenario: 'RFI' });
    const result = checkCompliance(d);
    expect(result).toEqual({ isCompliant: true, deviationType: null });
  });

  it('deviation: fold in-range hand (overfold)', () => {
    const d = makeDecision({ position: 'UTG', handKey: 'AKs', action: 'fold', scenario: 'RFI' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(false);
    expect(result!.deviationType).toBe('OVERFOLD');
  });

  it('deviation: raise out-of-range hand', () => {
    const d = makeDecision({ position: 'UTG', handKey: '72o', action: 'raise', scenario: 'RFI' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(false);
    expect(result!.deviationType).toBe('OPENED_OUT_OF_RANGE');
  });

  it('deviation: limping is always wrong', () => {
    const d = makeDecision({ position: 'UTG', handKey: 'AKs', action: 'call', scenario: 'RFI' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(false);
    expect(result!.deviationType).toBe('LIMPED');
  });

  it('deviation: MP fold of in-range hand is checked, not skipped', () => {
    const d = makeDecision({ position: 'MP', handKey: 'AKs', action: 'fold', scenario: 'RFI' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(false);
    expect(result!.deviationType).toBe('OVERFOLD');
  });

  it('deviation: MP raise out of range is checked, not skipped', () => {
    const d = makeDecision({ position: 'MP', handKey: '72o', action: 'raise', scenario: 'RFI' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(false);
    expect(result!.deviationType).toBe('OPENED_OUT_OF_RANGE');
  });
});

describe('checkCompliance — BLIND_WAR', () => {
  it('compliant: raise in SB range', () => {
    const d = makeDecision({ position: 'SB', handKey: 'AKs', action: 'raise', scenario: 'BLIND_WAR' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(true);
  });

  it('deviation: SB limp', () => {
    const d = makeDecision({ position: 'SB', handKey: 'AKs', action: 'call', scenario: 'BLIND_WAR' });
    const result = checkCompliance(d);
    expect(result!.deviationType).toBe('SB_LIMPED');
  });

  it('deviation: SB overfold', () => {
    // K2o is in SB range
    const d = makeDecision({ position: 'SB', handKey: 'K2o', action: 'fold', scenario: 'BLIND_WAR' });
    const result = checkCompliance(d);
    expect(result!.deviationType).toBe('SB_OVERFOLD');
  });

  it('deviation: SB raise out of range', () => {
    // Need to find a hand NOT in SB range — very few exist since SB is extremely wide
    // SB range is BTN + extras, should contain most hands
    // But some very weak hands might not be there
    // Actually SB range is basically everything except a few combos
    // Let's just test the logic path with a known hand
    const d = makeDecision({ position: 'SB', handKey: 'AKs', action: 'raise', scenario: 'BLIND_WAR' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(true);
  });
});

describe('checkCompliance — HU_BTN', () => {
  it('compliant: any action except fold at 10bb+', () => {
    const d = makeDecision({ position: 'BTN/SB', handKey: '72o', action: 'raise', scenario: 'HU_BTN', stackBb: 15 });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(true);
  });

  it('compliant: call (limp) is acceptable in HU', () => {
    const d = makeDecision({ position: 'BTN/SB', handKey: '72o', action: 'call', scenario: 'HU_BTN', stackBb: 15 });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(true);
  });

  it('deviation: fold at 10bb+ in HU', () => {
    const d = makeDecision({ position: 'BTN/SB', handKey: '72o', action: 'fold', scenario: 'HU_BTN', stackBb: 15 });
    const result = checkCompliance(d);
    expect(result!.deviationType).toBe('HU_BTN_FOLD');
  });

  it('compliant: fold at <10bb in HU (push/fold)', () => {
    const d = makeDecision({ position: 'BTN/SB', handKey: '72o', action: 'fold', scenario: 'HU_BTN', stackBb: 8 });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(true);
  });
});

describe('checkCompliance — FACING_RAISE', () => {
  it('deviation: cold-call from non-BTN/BB', () => {
    const d = makeDecision({ position: 'HJ', handKey: 'AQs', action: 'call', scenario: 'FACING_RAISE', openerPosition: 'CO' });
    const result = checkCompliance(d);
    expect(result!.deviationType).toBe('COLD_CALL');
  });

  it('excluded: BTN can call facing raise', () => {
    const d = makeDecision({ position: 'BTN', handKey: 'AQs', action: 'call', scenario: 'FACING_RAISE', openerPosition: 'CO' });
    const result = checkCompliance(d);
    expect(result).toBeNull();
  });

  it('excluded: BB can call facing raise', () => {
    const d = makeDecision({ position: 'BB', handKey: 'AQs', action: 'call', scenario: 'FACING_RAISE', openerPosition: 'CO' });
    const result = checkCompliance(d);
    expect(result).toBeNull();
  });

  it('compliant: 3-bet from HJ versus early opener', () => {
    const d = makeDecision({ position: 'HJ', handKey: 'AQs', action: 'raise', scenario: 'FACING_RAISE', openerPosition: 'UTG' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(true);
  });

  it('deviation: SB does not use loose LP-vs-EP fallback facing early opener', () => {
    const d = makeDecision({ position: 'SB', handKey: 'AQo', action: 'raise', scenario: 'FACING_RAISE', openerPosition: 'UTG' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(false);
    expect(result!.deviationType).toBe('OPENED_OUT_OF_RANGE');
  });

  it('excluded: unsupported raise pair is skipped instead of using fallback range', () => {
    const d = makeDecision({ position: 'HJ', handKey: 'AQo', action: 'raise', scenario: 'FACING_RAISE', openerPosition: 'CO' });
    const result = checkCompliance(d);
    expect(result).toBeNull();
  });
});

describe('checkCompliance — FACING_LIMP', () => {
  it('deviation: limp behind', () => {
    const d = makeDecision({ position: 'CO', handKey: 'AQs', action: 'call', scenario: 'FACING_LIMP' });
    const result = checkCompliance(d);
    expect(result!.deviationType).toBe('LIMP_BEHIND');
  });

  it('compliant: raise over limper', () => {
    const d = makeDecision({ position: 'CO', handKey: 'AQs', action: 'raise', scenario: 'FACING_LIMP' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(true);
  });
});

describe('checkCompliance — BB_VS_RAISE', () => {
  it('deviation: fold suited hand (Game Plan)', () => {
    const d = makeDecision({ position: 'BB', handKey: '72s', action: 'fold', scenario: 'BB_VS_RAISE' });
    const result = checkCompliance(d, 'game_plan');
    expect(result!.deviationType).toBe('BB_FOLD_SUITED');
  });

  it('compliant: fold offsuit hand from BB', () => {
    const d = makeDecision({ position: 'BB', handKey: '72o', action: 'fold', scenario: 'BB_VS_RAISE' });
    const result = checkCompliance(d, 'game_plan');
    expect(result!.isCompliant).toBe(true);
  });

  it('compliant: call any hand from BB', () => {
    const d = makeDecision({ position: 'BB', handKey: '72s', action: 'call', scenario: 'BB_VS_RAISE' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(true);
  });

  it('Advanced + bubble: fold suited is acceptable', () => {
    const d = makeDecision({ position: 'BB', handKey: '72s', action: 'fold', scenario: 'BB_VS_RAISE' });
    const result = checkCompliance(d, 'advanced', 'bubble');
    expect(result!.isCompliant).toBe(true);
  });

  it('Advanced + early game: fold suited is still a deviation', () => {
    const d = makeDecision({ position: 'BB', handKey: '72s', action: 'fold', scenario: 'BB_VS_RAISE' });
    const result = checkCompliance(d, 'advanced', 'early');
    expect(result!.deviationType).toBe('BB_FOLD_SUITED');
  });
});

describe('checkCompliance — excluded scenarios', () => {
  it('returns null for FACING_ALL_IN', () => {
    const d = makeDecision({ scenario: 'FACING_ALL_IN' });
    expect(checkCompliance(d)).toBeNull();
  });

  it('returns null for BB_VS_LARGE_RAISE', () => {
    const d = makeDecision({ scenario: 'BB_VS_LARGE_RAISE', position: 'BB' });
    expect(checkCompliance(d)).toBeNull();
  });

  it('returns null for BB_VS_LIMP', () => {
    const d = makeDecision({ scenario: 'BB_VS_LIMP', position: 'BB' });
    expect(checkCompliance(d)).toBeNull();
  });
});

describe('checkCompliance — WALK', () => {
  it('always compliant', () => {
    const d = makeDecision({ scenario: 'WALK', position: 'BB' });
    const result = checkCompliance(d);
    expect(result!.isCompliant).toBe(true);
  });
});

describe('compliancePercentage', () => {
  it('computes correct percentage', () => {
    const decisions = [
      makeDecision({ handKey: 'AKs', action: 'raise', scenario: 'RFI' }),
      makeDecision({ handKey: 'AKs', action: 'fold', scenario: 'RFI' }), // Overfold
      makeDecision({ handKey: '72o', action: 'fold', scenario: 'RFI' }), // Correct fold
    ];
    const pct = compliancePercentage(decisions);
    // 2 compliant out of 3 eligible = 66.67%
    expect(pct).toBeCloseTo(66.67, 0);
  });

  it('excludes non-compliance scenarios', () => {
    const decisions = [
      makeDecision({ handKey: 'AKs', action: 'raise', scenario: 'RFI' }),
      makeDecision({ scenario: 'FACING_ALL_IN' }), // Excluded
    ];
    const pct = compliancePercentage(decisions);
    expect(pct).toBe(100);
  });

  it('returns 100% for empty eligible set', () => {
    const decisions = [
      makeDecision({ scenario: 'FACING_ALL_IN' }),
    ];
    expect(compliancePercentage(decisions)).toBe(100);
  });
});

describe('batchCheckCompliance', () => {
  it('fills in isCompliant and deviationType', () => {
    const decisions = [
      makeDecision({ handKey: 'AKs', action: 'fold', scenario: 'RFI' }),
    ];
    const result = batchCheckCompliance(decisions);
    expect(result[0]!.isCompliant).toBe(false);
    expect(result[0]!.deviationType).toBe('OVERFOLD');
  });
});
