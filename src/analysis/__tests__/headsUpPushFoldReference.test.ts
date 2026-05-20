import { describe, expect, it } from 'vitest';
import type { HeroDecision } from '../../types/analysis';
import {
  analyzeHeadsUpPushFoldReference,
  lookupHeadsUpFrequency,
  parseHeadsUpFrequencyCsv,
} from '../headsUpPushFoldReference';

const FIXTURE_CSV = [
  'stack,AA,AKs,A2o,72o',
  '8.00,1,1,0.75,0',
  '8.05,1,1,0.8,0',
  '12.00,1,0.65,0.5,0',
].join('\n');

function makeDecision(overrides: Partial<HeroDecision>): HeroDecision {
  return {
    handId: 'test-hand',
    position: 'BTN/SB',
    handKey: 'A2o',
    stackBb: 8.03,
    scenario: 'HU_BTN',
    action: 'fold',
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

describe('parseHeadsUpFrequencyCsv', () => {
  it('parses stack-indexed hand frequency tables without source-specific labels', () => {
    const table = parseHeadsUpFrequencyCsv(FIXTURE_CSV, 'push');

    expect(table.kind).toBe('push');
    expect(table.handKeys).toEqual(['AA', 'AKs', 'A2o', '72o']);
    expect(table.rows).toHaveLength(3);
    expect(table.rows[1]).toEqual({ stackBb: 8.05, frequencies: { AA: 1, AKs: 1, A2o: 0.8, '72o': 0 } });
  });

  it('rejects invalid frequencies instead of silently trusting malformed reference data', () => {
    expect(() => parseHeadsUpFrequencyCsv('stack,AA\n8.00,1.2', 'push')).toThrow(/frequency/i);
  });
});

describe('lookupHeadsUpFrequency', () => {
  it('uses nearest stack row and canonical hand keys', () => {
    const table = parseHeadsUpFrequencyCsv(FIXTURE_CSV, 'push');

    expect(lookupHeadsUpFrequency(table, { stackBb: 8.03, handKey: '2Ao' })).toEqual({
      frequency: 0.8,
      matchedStackBb: 8.05,
      handKey: 'A2o',
    });
  });

  it('returns null outside table coverage or unknown hands', () => {
    const table = parseHeadsUpFrequencyCsv(FIXTURE_CSV, 'push');

    expect(lookupHeadsUpFrequency(table, { stackBb: 0.5, handKey: 'AA' })).toBeNull();
    expect(lookupHeadsUpFrequency(table, { stackBb: 8, handKey: 'KQs' })).toBeNull();
  });
});

describe('analyzeHeadsUpPushFoldReference', () => {
  const push = parseHeadsUpFrequencyCsv(FIXTURE_CSV, 'push');
  const call = parseHeadsUpFrequencyCsv(FIXTURE_CSV, 'call');

  it('flags a heads-up button fold when the local reference mostly pushes the hand', () => {
    const result = analyzeHeadsUpPushFoldReference(makeDecision({ action: 'fold', scenario: 'HU_BTN' }), { push, call });

    expect(result).toMatchObject({
      result: 'missed_aggression',
      spot: 'hu_button_push_fold',
      recommendedAction: 'raise',
      actualAction: 'fold',
      evidenceKind: 'rule_based',
      evLossBb: null,
      frequency: 0.8,
      matchedStackBb: 8.05,
    });
    expect(result!.note).toContain('local heads-up push/fold reference');
    expect(result!.note).not.toContain('solver');
  });

  it('flags a big-blind fold versus all-in when the local reference mostly calls the hand', () => {
    const result = analyzeHeadsUpPushFoldReference(makeDecision({
      position: 'BB',
      scenario: 'FACING_ALL_IN',
      action: 'fold',
      handKey: 'AKs',
      stackBb: 12,
    }), { push, call });

    expect(result).toMatchObject({
      result: 'missed_call',
      spot: 'hu_big_blind_call_all_in',
      recommendedAction: 'call',
      actualAction: 'fold',
      frequency: 0.65,
    });
  });

  it('returns null for mixed-frequency or non-heads-up spots to avoid overclaiming', () => {
    expect(analyzeHeadsUpPushFoldReference(makeDecision({ handKey: 'A2o', stackBb: 12 }), { push, call })).toBeNull();
    expect(analyzeHeadsUpPushFoldReference(makeDecision({ scenario: 'RFI', position: 'CO' }), { push, call })).toBeNull();
  });
});
