import { describe, it, expect } from 'vitest';
import {
  checkPushFold,
  batchCheckPushFold,
  pushFoldAccuracy,
  pushFoldSummary,
} from '../pushFoldChecker';
import type { HeroDecision } from '../../types/analysis';

function makeDecision(overrides: Partial<HeroDecision>): HeroDecision {
  return {
    handId: 'test-1',
    position: 'CO',
    handKey: 'AKs',
    stackBb: 8,
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

describe('checkPushFold — open push at ≤10bb', () => {
  it('correct push: AKs from CO at 8bb', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 8,
      position: 'CO',
      handKey: 'AKs',
      action: 'raise',
      scenario: 'RFI',
    }));
    expect(result).not.toBeNull();
    expect(result!.result).toBe('correct_push');
    expect(result!.inPushRange).toBe(true);
  });

  it('missed push: A9s from CO at 10bb folded', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 10,
      position: 'CO',
      handKey: 'A9s',
      action: 'fold',
      scenario: 'RFI',
    }));
    expect(result).not.toBeNull();
    expect(result!.result).toBe('missed_push');
  });

  it('correct fold: 72o from UTG at 9bb', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 9,
      position: 'UTG',
      handKey: '72o',
      action: 'fold',
      scenario: 'RFI',
    }));
    expect(result).not.toBeNull();
    expect(result!.result).toBe('correct_fold');
  });

  it('bad push: 72o from UTG at 8bb raised', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 8,
      position: 'UTG',
      handKey: '72o',
      action: 'raise',
      scenario: 'RFI',
    }));
    expect(result).not.toBeNull();
    expect(result!.result).toBe('bad_push');
  });

  it('call at ≤10bb is flagged as bad push', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 7,
      position: 'CO',
      handKey: 'AKs',
      action: 'call',
      scenario: 'RFI',
    }));
    expect(result).not.toBeNull();
    expect(result!.result).toBe('bad_push');
    expect(result!.note).toContain('all-in ou fold');
  });

  it('works for BLIND_WAR scenario', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 10,
      position: 'SB',
      handKey: 'T6o',
      action: 'raise',
      scenario: 'BLIND_WAR',
    }));
    expect(result).not.toBeNull();
    expect(result!.result).toBe('correct_push');
  });

  it('works for HU_BTN scenario', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 9,
      position: 'BTN/SB',
      handKey: '85o',
      action: 'raise',
      scenario: 'HU_BTN',
    }));
    expect(result).not.toBeNull();
    expect(result!.result).toBe('correct_push');
  });
});

describe('checkPushFold — not applicable', () => {
  it('returns null for stack > 10bb in RFI', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 15,
      scenario: 'RFI',
    }));
    expect(result).toBeNull();
  });

  it('returns null for FACING_ALL_IN', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 8,
      scenario: 'FACING_ALL_IN',
    }));
    expect(result).toBeNull();
  });

  it('returns null for BB_VS_RAISE at 8bb', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 8,
      scenario: 'BB_VS_RAISE',
      position: 'BB',
    }));
    expect(result).toBeNull();
  });
});

describe('checkPushFold — resteal at ≤20bb', () => {
  it('correct resteal: AKs from BTN at 18bb vs raise', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 18,
      position: 'BTN',
      handKey: 'AKs',
      action: 'raise',
      scenario: 'FACING_RAISE',
    }));
    expect(result).not.toBeNull();
    expect(result!.result).toBe('correct_push');
  });

  it('missed resteal: 66 from SB at 15bb folded vs raise', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 15,
      position: 'SB',
      handKey: '66',
      action: 'fold',
      scenario: 'FACING_RAISE',
    }));
    expect(result).not.toBeNull();
    expect(result!.result).toBe('missed_push');
  });

  it('returns null for resteal from non-late position', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 18,
      position: 'UTG',
      handKey: 'AKs',
      action: 'raise',
      scenario: 'FACING_RAISE',
    }));
    expect(result).toBeNull();
  });

  it('returns null for resteal at >20bb', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 25,
      position: 'BTN',
      handKey: 'AKs',
      action: 'raise',
      scenario: 'FACING_RAISE',
    }));
    expect(result).toBeNull();
  });

  it('returns null for hand outside resteal range folded', () => {
    const result = checkPushFold(makeDecision({
      stackBb: 18,
      position: 'BTN',
      handKey: '87o',
      action: 'fold',
      scenario: 'FACING_RAISE',
    }));
    expect(result).toBeNull();
  });
});

describe('batchCheckPushFold', () => {
  it('filters to only push/fold spots', () => {
    const decisions = [
      makeDecision({ stackBb: 8, handKey: 'AA', action: 'raise', scenario: 'RFI' }),
      makeDecision({ stackBb: 30, handKey: 'AA', action: 'raise', scenario: 'RFI' }),
      makeDecision({ stackBb: 10, handKey: '72o', action: 'fold', scenario: 'RFI', position: 'UTG' }),
    ];
    const results = batchCheckPushFold(decisions);
    expect(results).toHaveLength(2); // Only 8bb and 10bb spots
  });
});

describe('pushFoldAccuracy', () => {
  it('returns 100% when all decisions are correct', () => {
    const decisions = [
      makeDecision({ stackBb: 8, handKey: 'AA', action: 'raise', scenario: 'RFI' }),
      makeDecision({ stackBb: 10, handKey: '72o', action: 'fold', scenario: 'RFI', position: 'UTG' }),
    ];
    expect(pushFoldAccuracy(decisions)).toBe(100);
  });

  it('returns 50% with one correct and one incorrect', () => {
    const decisions = [
      makeDecision({ stackBb: 8, handKey: 'AA', action: 'raise', scenario: 'RFI' }),
      makeDecision({ stackBb: 10, handKey: 'AA', action: 'fold', scenario: 'RFI' }),
    ];
    expect(pushFoldAccuracy(decisions)).toBe(50);
  });

  it('returns 100% when no push/fold spots exist', () => {
    const decisions = [
      makeDecision({ stackBb: 30, handKey: 'AA', action: 'raise', scenario: 'RFI' }),
    ];
    expect(pushFoldAccuracy(decisions)).toBe(100);
  });
});

describe('pushFoldSummary', () => {
  it('returns correct breakdown', () => {
    const decisions = [
      makeDecision({ stackBb: 8, handKey: 'AA', action: 'raise', scenario: 'RFI' }),
      makeDecision({ stackBb: 9, handKey: '72o', action: 'fold', scenario: 'RFI', position: 'UTG' }),
      makeDecision({ stackBb: 10, handKey: 'KQs', action: 'fold', scenario: 'RFI' }),
      makeDecision({ stackBb: 7, handKey: '93o', action: 'raise', scenario: 'RFI', position: 'UTG' }),
    ];
    const summary = pushFoldSummary(decisions);
    expect(summary.totalSpots).toBe(4);
    expect(summary.correctPush).toBe(1); // AA raise
    expect(summary.correctFold).toBe(1); // 72o fold from UTG
    expect(summary.missedPush).toBe(1); // KQs fold from CO (in push range)
    expect(summary.badPush).toBe(1); // 93o raise from UTG (not in range)
    expect(summary.accuracy).toBe(50);
  });
});
