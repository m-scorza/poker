/**
 * Range compliance checker.
 *
 * Compares hero's preflop decisions against theoretical ranges.
 * Compliance is ONLY computed for scenarios with a clear "correct" answer.
 *
 * Source: CLAUDE.md "Range Compliance Scope", "Preflop Scenario Classification"
 */

import type { Position, DeviationType, HeroDecision } from '../types/analysis';
import { SB_BLIND_WAR_RANGE, isSuitedHand, getReactionRange, getRFIRange } from '../data/ranges';
import type { StrategyProfile } from '../data/strategyProfiles';
import { BB_DEFENSE_ICM_ADJUSTMENTS } from '../data/strategyProfiles';
import type { ICMStage } from '../data/strategyProfiles';

export interface ComplianceResult {
  isCompliant: boolean;
  deviationType: DeviationType | null;
}

/**
 * Check range compliance for a single preflop decision.
 *
 * Returns null for scenarios excluded from compliance (no binary correct answer):
 * - FACING_ALL_IN (depends on pot odds, ICM, stack dynamics)
 * - BB_VS_LARGE_RAISE (facing 5x+ or all-in)
 * - BB_VS_LIMP (complex raise sizing decision)
 * - FACING_RAISE from BTN or BB (calling is acceptable)
 */
export function checkCompliance(
  decision: HeroDecision,
  profile: StrategyProfile = 'game_plan',
  icmStage: ICMStage = 'early',
): ComplianceResult | null {
  const { scenario, position, handKey, action, stackBb } = decision;
  const effectiveIcmStage = decision.icmStage ?? icmStage;

  switch (scenario) {
    case 'RFI':
      return checkRFI(position, handKey, action);

    case 'BLIND_WAR':
      return checkBlindWar(handKey, action);

    case 'HU_BTN':
      return checkHUBtn(action, stackBb);

    case 'FACING_RAISE':
      return checkFacingRaise(position, handKey, action, decision.openerPosition);

    case 'FACING_LIMP':
      return checkFacingLimp(action);

    case 'BB_VS_RAISE':
      return checkBBvsRaise(handKey, action, profile, effectiveIcmStage);

    case 'WALK':
      // No decision to evaluate
      return { isCompliant: true, deviationType: null };

    // Excluded from compliance
    case 'FACING_ALL_IN':
    case 'BB_VS_LARGE_RAISE':
    case 'BB_VS_LIMP':
      return null;
  }
}

/**
 * RFI: Raise if in range, fold if not.
 * Calling = limping = deviation. Opening out of range = deviation.
 */
function checkRFI(
  position: Position,
  handKey: string,
  action: 'fold' | 'raise' | 'call' | 'check',
): ComplianceResult {
  if (position === 'BB') {
    return { isCompliant: true, deviationType: null };
  }

  const range = getRFIRange(position);
  if (!range) {
    // Unsupported positions are skipped instead of guessed.
    return { isCompliant: true, deviationType: null };
  }

  const inRange = range.has(handKey);

  if (action === 'call') {
    // Limping is always a deviation
    return { isCompliant: false, deviationType: 'LIMPED' };
  }

  if (inRange && action === 'fold') {
    return { isCompliant: false, deviationType: 'OVERFOLD' };
  }

  if (!inRange && action === 'raise') {
    return { isCompliant: false, deviationType: 'OPENED_OUT_OF_RANGE' };
  }

  return { isCompliant: true, deviationType: null };
}

/**
 * BLIND_WAR: SB should raise if in range, fold if not. Never limp.
 */
function checkBlindWar(
  handKey: string,
  action: 'fold' | 'raise' | 'call' | 'check',
): ComplianceResult {
  const inRange = SB_BLIND_WAR_RANGE.has(handKey);

  if (action === 'call') {
    return { isCompliant: false, deviationType: 'SB_LIMPED' };
  }

  if (inRange && action === 'fold') {
    return { isCompliant: false, deviationType: 'SB_OVERFOLD' };
  }

  if (!inRange && action === 'raise') {
    return { isCompliant: false, deviationType: 'SB_OUT_OF_RANGE' };
  }

  return { isCompliant: true, deviationType: null };
}

/**
 * HU_BTN: With 10bb+, play 100% of hands (never fold).
 * Limping is part of optimal HU strategy, so call is acceptable.
 */
function checkHUBtn(
  action: 'fold' | 'raise' | 'call' | 'check',
  stackBb: number,
): ComplianceResult {
  if (stackBb >= 10 && action === 'fold') {
    return { isCompliant: false, deviationType: 'HU_BTN_FOLD' };
  }
  return { isCompliant: true, deviationType: null };
}

/**
 * FACING_RAISE: From non-BTN, non-BB positions — 3-bet or fold only (no cold-call).
 * Exception: small pairs (66-) can call when deep-stacked (40bb+).
 * BTN and BB may call — return null (excluded from this check).
 */
function checkFacingRaise(
  position: Position,
  handKey: string,
  action: 'fold' | 'raise' | 'call' | 'check',
  openerPosition?: Position | null,
): ComplianceResult | null {
  // If we don't know who opened, we can't evaluate — parser likely lost the
  // raiser's seat-to-position mapping. Surface it so it isn't silent.
  if (!openerPosition) {
    if (typeof console !== 'undefined') {
      console.warn(
        `[rangeChecker] FACING_RAISE with unknown opener (hero=${position}, hand=${handKey}, action=${action}) — skipped from compliance`,
      );
    }
    return null;
  }

  if (action === 'call') {
    // Standard reaction in Baseline is 3-bet or fold (no cold-call)
    // BTN and BB are excluded because flatting can be acceptable.
    if (position === 'BB' || position === 'BTN') return null;
    return { isCompliant: false, deviationType: 'COLD_CALL' };
  }

  const range = getReactionRange(position, openerPosition);
  if (!range) return null;

  const inRange = range.has(handKey);

  if (inRange && action === 'fold') {
    return { isCompliant: false, deviationType: 'OVERFOLD' };
  }

  if (!inRange && action === 'raise') {
    // 3-betting out of range
    return { isCompliant: false, deviationType: 'OPENED_OUT_OF_RANGE' };
  }

  return { isCompliant: true, deviationType: null };
}

/**
 * FACING_LIMP: Should raise (punish limper). Never limp behind (except SB).
 */
function checkFacingLimp(
  action: 'fold' | 'raise' | 'call' | 'check',
): ComplianceResult {
  if (action === 'call') {
    return { isCompliant: false, deviationType: 'LIMP_BEHIND' };
  }
  return { isCompliant: true, deviationType: null };
}

/**
 * BB_VS_RAISE: Never fold suited hands vs a normal open raise (2-3x).
 *
 * In Advanced profile with ICM pressure, folding suited is acceptable.
 * Source: CLAUDE.md "Corrections" #4, [05-icm §5]
 */
function checkBBvsRaise(
  handKey: string,
  action: 'fold' | 'raise' | 'call' | 'check',
  profile: StrategyProfile,
  icmStage: ICMStage,
): ComplianceResult {
  if (action !== 'fold') {
    return { isCompliant: true, deviationType: null };
  }

  // Only flag folding suited hands
  if (!isSuitedHand(handKey)) {
    return { isCompliant: true, deviationType: null };
  }

  // In Advanced profile, check ICM stage
  if (profile === 'advanced') {
    const icmAdj = BB_DEFENSE_ICM_ADJUSTMENTS[icmStage];
    if (icmAdj.foldSuitedAcceptable) {
      // Folding suited is acceptable in high-ICM spots
      return { isCompliant: true, deviationType: null };
    }
  }

  // Game Plan: folding suited vs normal open = always a deviation
  return { isCompliant: false, deviationType: 'BB_FOLD_SUITED' };
}

/**
 * Batch check compliance for an array of decisions.
 * Returns the decisions with isCompliant and deviationType filled in.
 */
export function batchCheckCompliance(
  decisions: HeroDecision[],
  profile: StrategyProfile = 'game_plan',
  icmStage: ICMStage = 'early',
): HeroDecision[] {
  return decisions.map((d) => {
    const result = checkCompliance(d, profile, icmStage);
    if (result === null) {
      // Excluded from compliance — leave as-is
      return d;
    }
    return {
      ...d,
      isCompliant: result.isCompliant,
      deviationType: result.deviationType,
    };
  });
}

/**
 * Compute compliance percentage for a set of decisions.
 * Only counts decisions that are eligible for compliance checking.
 */
export function compliancePercentage(
  decisions: HeroDecision[],
  profile: StrategyProfile = 'game_plan',
  icmStage: ICMStage = 'early',
): number {
  let eligible = 0;
  let compliant = 0;

  for (const d of decisions) {
    const result = checkCompliance(d, profile, icmStage);
    if (result === null) continue;
    eligible++;
    if (result.isCompliant) compliant++;
  }

  if (eligible === 0) return 100;
  return (compliant / eligible) * 100;
}

export { getRFIRange } from '../data/ranges';
