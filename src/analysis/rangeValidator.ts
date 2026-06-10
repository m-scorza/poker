/**
 * Range accuracy validation against solver outputs.
 *
 * Compares the app's hardcoded RFI ranges (from the Baseline strategy)
 * against solver-derived baselines (GTO Wizard / HRC references)
 * to identify discrepancies and confidence levels.
 *
 * Sources:
 * - docs/knowledge/strategy/02-ranges-and-position.md §3 (solver RFI % by position/stack)
 * - docs/knowledge/strategy/02-ranges-and-position.md §4 (open shove ranges at 10bb)
 * - CLAUDE.md "Theoretical Ranges"
 */

import { RFI_RANGES } from '../data/ranges';
import { PUSH_RANGES } from '../data/pushFoldRanges';
import type { Position } from '../types/analysis';
import { loadCustomRange } from '../data/store';

export interface RangeValidationResult {
  position: Position;
  /** Number of hands in our range */
  ourCount: number;
  /** Our range as % of 169 combos */
  ourPct: number;
  /** Solver reference % (at default stack depth) */
  solverPct: number;
  /** Absolute difference in percentage points */
  delta: number;
  /** Whether our range is wider or tighter than solver */
  direction: 'wider' | 'tighter' | 'match';
  /** Confidence in the comparison */
  confidence: 'high' | 'medium' | 'low';
  /** Notes about the comparison */
  note: string;
}

/**
 * Solver-derived RFI % baselines by position at various stack depths.
 * Source: docs/knowledge/strategy/02-ranges-and-position.md §3
 *
 * Our Baseline ranges are designed for early tournament play (~50-75bb),
 * so we compare against the 50bb column primarily.
 */
const SOLVER_RFI_BASELINES: Record<string, {
  /** RFI % at 30bb (standard tournament stack) */
  pct30bb: number;
  /** RFI % at 50bb (deep tournament) */
  pct50bb: number;
  /** RFI % at 100bb (very deep / cash game) */
  pct100bb: number;
}> = {
  UTG:     { pct30bb: 16, pct50bb: 17, pct100bb: 17 },
  'UTG+1': { pct30bb: 16, pct50bb: 17, pct100bb: 17 }, // Approximated from MP
  MP1:     { pct30bb: 18, pct50bb: 19, pct100bb: 20 },
  MP2:     { pct30bb: 18, pct50bb: 19, pct100bb: 20 }, // Same as MP1
  HJ:      { pct30bb: 27, pct50bb: 28.5, pct100bb: 30 },
  CO:      { pct30bb: 36, pct50bb: 40, pct100bb: 44 },
  BTN:     { pct30bb: 50, pct50bb: 54, pct100bb: 58 },
  SB:      { pct30bb: 44, pct50bb: 48, pct100bb: 52 },
};

/**
 * Solver-derived open shove % at 10bb by position.
 * Source: docs/knowledge/strategy/02-ranges-and-position.md §4
 */
const SOLVER_PUSH_BASELINES: Record<string, number> = {
  UTG:     16,
  'UTG+1': 16, // Same as UTG at 10bb
  MP1:     20,
  MP2:     20, // Same as MP
  HJ:      28,
  CO:      36,
  BTN:     48,
  SB:      69,
};

const TOTAL_COMBOS = 169;

/**
 * Validate RFI ranges against solver baselines.
 *
 * @param stackDepth - Stack depth to compare against (30, 50, or 100bb)
 * @returns Validation results per position
 */
export function validateRFIRanges(
  stackDepth: 30 | 50 | 100 = 50,
): RangeValidationResult[] {
  const results: RangeValidationResult[] = [];

  for (const [pos, range] of Object.entries(RFI_RANGES)) {
    const baseline = SOLVER_RFI_BASELINES[pos];
    if (!baseline) continue;

    const custom = loadCustomRange(pos);
    const activeRange = custom || range;

    const ourCount = activeRange.size;
    const ourPct = (ourCount / TOTAL_COMBOS) * 100;
    const solverPct = stackDepth === 30 ? baseline.pct30bb
      : stackDepth === 100 ? baseline.pct100bb
      : baseline.pct50bb;

    const delta = Math.abs(ourPct - solverPct);
    const direction: RangeValidationResult['direction'] =
      delta < 2 ? 'match' : ourPct > solverPct ? 'wider' : 'tighter';

    // Confidence: high if delta < 3%, medium if < 6%, low if >= 6%
    const confidence: RangeValidationResult['confidence'] =
      delta < 3 ? 'high' : delta < 6 ? 'medium' : 'low';

    let note: string;
    if (direction === 'match') {
      note = `Range aligned with solver (${stackDepth}bb).`;
    } else if (direction === 'wider') {
      note = `Range ${delta.toFixed(1)}pp wider than solver at ${stackDepth}bb. Baseline is more aggressive at this position.`;
    } else {
      note = `Range ${delta.toFixed(1)}pp tighter than solver at ${stackDepth}bb. Baseline is more conservative at this position.`;
    }

    results.push({
      position: pos as Position,
      ourCount,
      ourPct: Math.round(ourPct * 10) / 10,
      solverPct,
      delta: Math.round(delta * 10) / 10,
      direction,
      confidence,
      note,
    });
  }

  return results;
}

/**
 * Validate push/fold ranges at 10bb against solver baselines.
 */
export function validatePushRanges(): RangeValidationResult[] {
  const results: RangeValidationResult[] = [];

  for (const [pos, range] of Object.entries(PUSH_RANGES)) {
    const solverPct = SOLVER_PUSH_BASELINES[pos];
    if (solverPct === undefined) continue;

    const custom = loadCustomRange(pos);
    const activeRange = custom || range;

    const ourCount = activeRange.size;
    const ourPct = (ourCount / TOTAL_COMBOS) * 100;
    const delta = Math.abs(ourPct - solverPct);
    const direction: RangeValidationResult['direction'] =
      delta < 2 ? 'match' : ourPct > solverPct ? 'wider' : 'tighter';

    const confidence: RangeValidationResult['confidence'] =
      delta < 3 ? 'high' : delta < 6 ? 'medium' : 'low';

    let note: string;
    if (direction === 'match') {
      note = `Push range aligned with solver (10bb chipEV).`;
    } else if (direction === 'wider') {
      note = `Push range ${delta.toFixed(1)}pp wider than solver. May increase variance.`;
    } else {
      note = `Push range ${delta.toFixed(1)}pp tighter than solver. May be leaving EV in push spots.`;
    }

    results.push({
      position: pos as Position,
      ourCount,
      ourPct: Math.round(ourPct * 10) / 10,
      solverPct,
      delta: Math.round(delta * 10) / 10,
      direction,
      confidence,
      note,
    });
  }

  return results;
}

/**
 * Overall range accuracy score (0-100).
 * Weighted average of per-position confidence.
 */
export function rangeAccuracyScore(results: RangeValidationResult[]): number {
  if (results.length === 0) return 100;

  const total = results.reduce((sum, r) => {
    // Score: 100 for match, penalize proportionally for delta
    const positionScore = Math.max(0, 100 - r.delta * 5);
    return sum + positionScore;
  }, 0);

  return Math.round(total / results.length);
}

/**
 * Summary report of range validation suitable for display.
 */
export function rangeValidationSummary(): {
  rfi: { results: RangeValidationResult[]; score: number };
  push: { results: RangeValidationResult[]; score: number };
  overallScore: number;
} {
  const rfiResults = validateRFIRanges(50);
  const pushResults = validatePushRanges();

  const rfiScore = rangeAccuracyScore(rfiResults);
  const pushScore = rangeAccuracyScore(pushResults);
  const overallScore = Math.round((rfiScore * 0.6 + pushScore * 0.4));

  return {
    rfi: { results: rfiResults, score: rfiScore },
    push: { results: pushResults, score: pushScore },
    overallScore,
  };
}
