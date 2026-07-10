import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  computeNextDrillStep,
  evaluateDrillAction,
  type DrillActionContext,
} from '../arenaDrillEngine';
import { pickRandomDecision } from '../../pages/arena/actionOptions';
import type { HeroDecision } from '../../types/analysis';

function decision(overrides: Partial<HeroDecision> = {}): HeroDecision {
  return {
    handId: 'h1',
    position: 'UTG',
    handKey: '72o',
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

function context(currentDecision: HeroDecision): DrillActionContext {
  return { type: 'fault_fixer', currentDecision, currentPacket: null, currentCurriculumSpot: null };
}

describe('evaluateDrillAction — fault_fixer', () => {
  it('scores a compliant action as correct', () => {
    // UTG 72o is out of the RFI range, so FOLD is the compliant move.
    const result = evaluateDrillAction(context(decision()), 'fold', 'game_plan');
    expect(result).toEqual({
      userIsCorrect: true,
      feedbackStatus: 'correct',
      shouldRecordScore: true,
      note: 'Good. This matches the local baseline check.',
    });
  });

  it('scores a non-compliant action as a deviation naming the correct action', () => {
    const result = evaluateDrillAction(context(decision()), 'raise', 'game_plan');
    expect(result?.userIsCorrect).toBe(false);
    expect(result?.feedbackStatus).toBe('deviation');
    expect(result?.shouldRecordScore).toBe(true);
    expect(result?.note).toBe('The local reference check prefers FOLD.');
  });
});

describe('evaluateDrillAction — rfi_master', () => {
  it('scores a compliant open as correct', () => {
    const ctx: DrillActionContext = {
      type: 'rfi_master',
      currentDecision: decision({ handKey: 'AKs', isCompliant: true }),
      currentPacket: null,
      currentCurriculumSpot: null,
    };
    const result = evaluateDrillAction(ctx, 'raise', 'game_plan');
    expect(result).toEqual({
      userIsCorrect: true,
      feedbackStatus: 'correct',
      shouldRecordScore: true,
      note: 'Good. This matches the local baseline check.',
    });
  });

  it('scores an out-of-range open as a deviation naming the correct action', () => {
    const ctx: DrillActionContext = {
      type: 'rfi_master',
      currentDecision: decision({ handKey: '72o' }),
      currentPacket: null,
      currentCurriculumSpot: null,
    };
    const result = evaluateDrillAction(ctx, 'raise', 'game_plan');
    expect(result?.userIsCorrect).toBe(false);
    expect(result?.feedbackStatus).toBe('deviation');
    expect(result?.note).toBe('The local reference check prefers FOLD.');
  });
});

describe('computeNextDrillStep', () => {
  afterEach(() => vi.restoreAllMocks());

  it('advances to a decision drawn from the pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const a = decision({ handId: 'a' });
    const b = decision({ handId: 'b' });
    expect(computeNextDrillStep([a, b])).toEqual({ kind: 'advance', decision: a });
  });

  it('reports the pool as exhausted when empty (routes to setEmptyDrillType)', () => {
    expect(computeNextDrillStep([])).toEqual({ kind: 'exhausted' });
    expect(pickRandomDecision([])).toBeNull();
  });
});
