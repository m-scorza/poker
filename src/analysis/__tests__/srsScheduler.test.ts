import { describe, it, expect } from 'vitest';
import type { HeroDecision } from '../../types/analysis';
import {
  spotKeyOf,
  stackBucket,
  gradeSpot,
  isDue,
  selectQueue,
  requeueLapsedSpot,
  buildFaultSpots,
  BOX_INTERVALS_DAYS,
  MAX_BOX,
  type SrsReviewRecord,
  type FaultSpot,
} from '../srsScheduler';

const DAY_MS = 86_400_000;
const intervalMs = (boxIndex: number): number => (BOX_INTERVALS_DAYS[boxIndex] ?? 0) * DAY_MS;

function mk(over: Partial<HeroDecision>): HeroDecision {
  return {
    handId: 'h1',
    position: 'UTG',
    handKey: 'AA',
    stackBb: 50,
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
    ...over,
  };
}

describe('stackBucket', () => {
  it('splits at the 10bb cliff', () => {
    expect(stackBucket(8)).toBe('lt10');
    expect(stackBucket(9.99)).toBe('lt10');
    expect(stackBucket(10)).toBe('ge10');
    expect(stackBucket(50)).toBe('ge10');
  });
});

describe('spotKeyOf', () => {
  it('produces identical keys for the same pattern (dedup)', () => {
    const a = spotKeyOf(mk({ handId: 'x', netProfit: -100 }));
    const b = spotKeyOf(mk({ handId: 'y', netProfit: -5 }));
    expect(a).toBe(b);
  });

  it('separates decisions across the stack cliff (regression guard)', () => {
    // Same scenario/position/handKey, different stack bucket -> different cards.
    // Without this, an 8bb push/fold spot would hide behind a 50bb open spot.
    const short = spotKeyOf(mk({ stackBb: 8 }));
    const deep = spotKeyOf(mk({ stackBb: 50 }));
    expect(short).not.toBe(deep);
  });

  it('separates FACING_RAISE by opener (the answer-changing dimension)', () => {
    const vsUtg = spotKeyOf(mk({ scenario: 'FACING_RAISE', position: 'CO', handKey: 'A9s', openerPosition: 'UTG' }));
    const vsHj = spotKeyOf(mk({ scenario: 'FACING_RAISE', position: 'CO', handKey: 'A9s', openerPosition: 'HJ' }));
    expect(vsUtg).not.toBe(vsHj);
  });

  it('ignores opener for scenarios the grader does not branch on it', () => {
    const withOpener = spotKeyOf(mk({ scenario: 'RFI', openerPosition: 'CO' }));
    const withoutOpener = spotKeyOf(mk({ scenario: 'RFI', openerPosition: null }));
    expect(withOpener).toBe(withoutOpener);
  });
});

describe('gradeSpot', () => {
  const now = 1_000_000_000;

  it('learns a new card into box 1 due in one day', () => {
    const rec = gradeSpot('k', undefined, true, now);
    expect(rec.box).toBe(1);
    expect(rec.dueAt - now).toBe(intervalMs(0));
    expect(rec.reps).toBe(1);
    expect(rec.lapses).toBe(0);
  });

  it('promotes one box per correct answer using the interval ladder', () => {
    let rec = gradeSpot('k', undefined, true, now); // box 1
    rec = gradeSpot('k', rec, true, now); // box 2
    expect(rec.box).toBe(2);
    expect(rec.dueAt - now).toBe(intervalMs(1));
    rec = gradeSpot('k', rec, true, now); // box 3
    expect(rec.box).toBe(3);
    expect(rec.dueAt - now).toBe(intervalMs(2));
    expect(rec.reps).toBe(3);
  });

  it('caps at MAX_BOX', () => {
    let rec: SrsReviewRecord | undefined;
    for (let i = 0; i < MAX_BOX + 3; i++) rec = gradeSpot('k', rec, true, now);
    expect(rec!.box).toBe(MAX_BOX);
    expect(rec!.dueAt - now).toBe(intervalMs(MAX_BOX - 1));
  });

  it('resets a learned card to box 1 with a near-term relearn and a lapse', () => {
    let rec = gradeSpot('k', undefined, true, now); // box 1
    rec = gradeSpot('k', rec, true, now); // box 2
    const lapsed = gradeSpot('k', rec, false, now);
    expect(lapsed.box).toBe(1);
    expect(lapsed.dueAt - now).toBeGreaterThan(0);
    expect(lapsed.dueAt - now).toBeLessThan(DAY_MS); // sooner than any box interval
    expect(lapsed.lapses).toBe(1);
  });

  it('does not count a lapse for a wrong answer on a brand-new card', () => {
    const rec = gradeSpot('k', undefined, false, now);
    expect(rec.box).toBe(1);
    expect(rec.lapses).toBe(0);
  });
});

describe('isDue', () => {
  const base: SrsReviewRecord = { spotKey: 'k', box: 1, dueAt: 100, lastReviewedAt: 0, reps: 1, lapses: 0 };
  it('is due when now has reached dueAt', () => {
    expect(isDue(base, 100)).toBe(true);
    expect(isDue(base, 200)).toBe(true);
    expect(isDue(base, 99)).toBe(false);
  });
});

describe('selectQueue', () => {
  const now = 1_000_000;
  const spot = (spotKey: string): FaultSpot => ({
    spotKey,
    scenario: 'RFI',
    position: 'UTG',
    handKey: 'AA',
    stackBb: 50,
    representative: mk({}),
    count: 1,
  });
  const rec = (spotKey: string, dueAt: number): SrsReviewRecord => ({
    spotKey,
    box: 1,
    dueAt,
    lastReviewedAt: 0,
    reps: 1,
    lapses: 0,
  });

  it('orders due cards most-overdue first, then caps new cards', () => {
    const spots = [spot('a'), spot('b'), spot('c'), spot('d')];
    const records = new Map<string, SrsReviewRecord>([
      ['a', rec('a', now - 100)], // due, mildly overdue
      ['b', rec('b', now - 5000)], // due, most overdue
      ['c', rec('c', now + 5000)], // not due yet
      // 'd' has no record -> fresh
    ]);
    const q = selectQueue(spots, records, now, 5);
    expect(q.due.map((s) => s.spotKey)).toEqual(['b', 'a']);
    expect(q.fresh.map((s) => s.spotKey)).toEqual(['d']);
    expect(q.queue.map((s) => s.spotKey)).toEqual(['b', 'a', 'd']);
  });

  it('caps fresh cards at maxNew', () => {
    const spots = [spot('a'), spot('b'), spot('c')];
    const q = selectQueue(spots, new Map(), now, 2);
    expect(q.fresh).toHaveLength(2);
    expect(q.due).toHaveLength(0);
  });
});

describe('requeueLapsedSpot', () => {
  const now = 1_000_000;
  const spot = (spotKey: string): FaultSpot => ({
    spotKey,
    scenario: 'RFI',
    position: 'UTG',
    handKey: 'AA',
    stackBb: 50,
    representative: mk({}),
    count: 1,
  });

  it('reinserts a lapsed card so it reappears later in the same session', () => {
    const queue = [spot('a'), spot('b'), spot('c'), spot('d'), spot('e'), spot('f')];
    const lapsed = gradeSpot('a', undefined, false, now); // dueAt = now + RELEARN_MS
    const next = requeueLapsedSpot(queue, 0, lapsed, now);
    // Original card stays in place; a second copy lands a few positions ahead.
    expect(next.map((s) => s.spotKey)).toEqual(['a', 'b', 'c', 'd', 'a', 'e', 'f']);
  });

  it('appends when the current card is at or near the end', () => {
    const queue = [spot('a'), spot('b')];
    const lapsed = gradeSpot('b', undefined, false, now);
    const next = requeueLapsedSpot(queue, 1, lapsed, now);
    expect(next.map((s) => s.spotKey)).toEqual(['a', 'b', 'b']);
  });

  it('leaves the queue untouched for a promoted (correct) card', () => {
    const queue = [spot('a'), spot('b')];
    const promoted = gradeSpot('a', undefined, true, now); // dueAt a day out
    expect(requeueLapsedSpot(queue, 0, promoted, now)).toBe(queue);
  });
});

describe('buildFaultSpots', () => {
  it('keeps only graded, non-compliant decisions and groups by pattern', () => {
    const decisions = [
      mk({ handId: '1', position: 'UTG', handKey: 'AA', action: 'raise' }), // compliant -> dropped
      mk({ handId: '2', position: 'UTG', handKey: '72o', action: 'raise' }), // opened out of range -> fault
      mk({ handId: '3', position: 'UTG', handKey: '72o', action: 'raise', netProfit: -300 }), // same pattern
      mk({ handId: '4', position: 'UTG', handKey: 'AA', action: 'fold' }), // overfold -> different fault
    ];
    const spots = buildFaultSpots(decisions, 'game_plan');
    // Two distinct fault patterns: 72o-open and AA-fold.
    expect(spots).toHaveLength(2);
    const open = spots.find((s) => s.handKey === '72o')!;
    expect(open.count).toBe(2);
    // Representative is the costliest instance.
    expect(open.representative.handId).toBe('3');
  });

  it('returns nothing when all decisions are compliant', () => {
    const decisions = [mk({ handKey: 'AA', action: 'raise' }), mk({ handKey: 'KK', action: 'raise' })];
    expect(buildFaultSpots(decisions, 'game_plan')).toHaveLength(0);
  });
});
