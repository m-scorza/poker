/**
 * Push/Fold checker for short stack play (≤10bb).
 *
 * When stack drops to 10bb or below, strategy simplifies to all-in or fold.
 * No raise/fold, no postflop play.
 *
 * Also handles resteal spots: facing late position open with ≤20bb,
 * hero in BTN, SB, or BB can shove with the resteal range.
 *
 * Sources:
 * - CLAUDE.md "Short Stack Strategy (10bb or less)"
 * - CLAUDE.md "Resteal Ranges"
 * - docs/knowledge/strategy/02-ranges-and-position.md §4
 */

import type { HeroDecision, Position } from '../types/analysis';
import { isInPushRange, isInRestealRange, getPushRange, RESTEAL_RANGE } from '../data/pushFoldRanges';
import type { RangeSet } from '../types/ranges';

export type PushFoldResult = 'correct_push' | 'correct_fold' | 'missed_push' | 'bad_push' | 'not_applicable';

export interface PushFoldAnalysis {
  result: PushFoldResult;
  inPushRange: boolean;
  stackBb: number;
  position: Position;
  handKey: string;
  note: string;
}

/**
 * Analyze a hero decision for push/fold correctness.
 *
 * Only applies when:
 * - stackBb ≤ 10 AND scenario is RFI or BLIND_WAR (open push spots)
 * - stackBb ≤ 20 AND scenario is FACING_RAISE AND hero is BTN/SB/BB (resteal spots)
 *
 * Returns null if the spot is not a push/fold situation.
 */
export function checkPushFold(decision: HeroDecision): PushFoldAnalysis | null {
  const { stackBb, position, handKey, action, scenario } = decision;

  // --- Open push at ≤10bb ---
  if (stackBb <= 10 && (scenario === 'RFI' || scenario === 'BLIND_WAR' || scenario === 'HU_BTN')) {
    const inRange = isInPushRange(handKey, position);

    if (action === 'raise' && inRange) {
      return {
        result: 'correct_push',
        inPushRange: true,
        stackBb,
        position,
        handKey,
        note: 'Correct shove — hand is within the push range.',
      };
    }

    if (action === 'raise' && !inRange) {
      return {
        result: 'bad_push',
        inPushRange: false,
        stackBb,
        position,
        handKey,
        note: `${handKey} is outside the push range for ${position} at ${stackBb.toFixed(0)}bb.`,
      };
    }

    if (action === 'fold' && inRange) {
      return {
        result: 'missed_push',
        inPushRange: true,
        stackBb,
        position,
        handKey,
        note: `${handKey} should be a shove from ${position} at ${stackBb.toFixed(0)}bb.`,
      };
    }

    if (action === 'fold' && !inRange) {
      return {
        result: 'correct_fold',
        inPushRange: false,
        stackBb,
        position,
        handKey,
        note: 'Correct fold — hand is outside the push range.',
      };
    }

    // Call at ≤10bb is a deviation (should be all-in or fold)
    if (action === 'call') {
      return {
        result: 'bad_push',
        inPushRange: inRange,
        stackBb,
        position,
        handKey,
        note: `At ${stackBb.toFixed(0)}bb the strategy is all-in or fold — not call.`,
      };
    }
  }

  // --- Resteal at ≤20bb (facing CO/BTN open from BTN/SB/BB) ---
  if (
    stackBb <= 20 &&
    scenario === 'FACING_RAISE' &&
    (position === 'BTN' || position === 'SB' || position === 'BB' || position === 'BTN/SB')
  ) {
    const inRange = isInRestealRange(handKey);

    if (action === 'raise' && inRange) {
      return {
        result: 'correct_push',
        inPushRange: true,
        stackBb,
        position,
        handKey,
        note: 'Correct resteal — shove with a hand inside the resteal range.',
      };
    }

    if (action === 'fold' && inRange) {
      return {
        result: 'missed_push',
        inPushRange: true,
        stackBb,
        position,
        handKey,
        note: `${handKey} is a resteal from ${position} at ${stackBb.toFixed(0)}bb vs late open.`,
      };
    }

    // Fold outside resteal range is fine, raise outside is aggressive but not flagged as wrong
    // since resteal ranges are approximate
    return null;
  }

  return null;
}

/**
 * Batch analyze push/fold decisions.
 * Filters to only short-stack spots and returns analyses.
 */
export function batchCheckPushFold(decisions: HeroDecision[]): PushFoldAnalysis[] {
  const results: PushFoldAnalysis[] = [];
  for (const d of decisions) {
    const result = checkPushFold(d);
    if (result) {
      results.push(result);
    }
  }
  return results;
}

/**
 * Compute push/fold accuracy for a set of decisions.
 * Returns percentage of correct decisions in push/fold spots.
 */
export function pushFoldAccuracy(decisions: HeroDecision[]): number {
  const analyses = batchCheckPushFold(decisions);
  if (analyses.length === 0) return 100;

  const correct = analyses.filter(
    (a) => a.result === 'correct_push' || a.result === 'correct_fold',
  ).length;

  return (correct / analyses.length) * 100;
}

/**
 * Get push/fold summary stats.
 */
export function pushFoldSummary(decisions: HeroDecision[]): {
  totalSpots: number;
  correctPush: number;
  correctFold: number;
  missedPush: number;
  badPush: number;
  accuracy: number;
} {
  const analyses = batchCheckPushFold(decisions);
  const correctPush = analyses.filter((a) => a.result === 'correct_push').length;
  const correctFold = analyses.filter((a) => a.result === 'correct_fold').length;
  const missedPush = analyses.filter((a) => a.result === 'missed_push').length;
  const badPush = analyses.filter((a) => a.result === 'bad_push').length;
  const total = analyses.length;

  return {
    totalSpots: total,
    correctPush,
    correctFold,
    missedPush,
    badPush,
    accuracy: total === 0 ? 100 : ((correctPush + correctFold) / total) * 100,
  };
}

/**
 * Get the push range for display in the range grid.
 */
export function getPushRangeForPosition(position: Position): RangeSet | undefined {
  return getPushRange(position);
}

/**
 * Get the resteal range for display.
 */
export function getRestealRange(): RangeSet {
  return RESTEAL_RANGE;
}
