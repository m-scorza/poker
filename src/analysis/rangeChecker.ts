/**
 * Range compliance checker.
 *
 * Compares hero's preflop decisions against theoretical ranges.
 * Compliance is ONLY computed for scenarios with a clear "correct" answer.
 *
 * Source: CLAUDE.md "Range Compliance Scope", "Preflop Scenario Classification"
 */

import type { Position, DeviationType, HeroDecision, Scenario } from '../types/analysis';
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
 * - FACING_3BET (no 3-bet-defense / 4-bet range data yet)
 * - BB_VS_LARGE_RAISE (facing 5x+ or all-in)
 * - BB_VS_LIMP (complex raise sizing decision)
 * - FACING_RAISE from BTN or BB (calling is acceptable)
 *
 * FUTURE (covenant follow-up, see docs/product/ROADMAP.md): replace the
 * FACING_3BET and FACING_ALL_IN exclusions with real grading — 3-bet-defense /
 * 4-bet ranges for FACING_3BET, pot-odds + ICM for FACING_ALL_IN.
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

    // Excluded from compliance (no binary correct answer yet — see header note).
    case 'FACING_3BET':
    case 'FACING_ALL_IN':
    case 'BB_VS_LARGE_RAISE':
    case 'BB_VS_LIMP':
      return null;
  }
}

/**
 * The human reason a scenario is excluded from range compliance, or null if the
 * scenario is graded. Surfaced as an explicit "not graded — here's why" in the
 * UI (refusal-as-UI) instead of a misleading badge. Keep these keys in sync with
 * the excluded `case`s in `checkCompliance` above.
 */
const COMPLIANCE_EXCLUSION_REASONS: Partial<Record<Scenario, string>> = {
  FACING_3BET: 'Facing a 3-bet — there is no 3-bet-defence range yet, so this spot is not graded.',
  FACING_ALL_IN: 'Facing an all-in — a pot-odds and ICM decision, not a range-compliance call.',
  BB_VS_LARGE_RAISE: 'Big blind versus a 5x+ raise or all-in — folding can be correct, so this is not graded.',
  BB_VS_LIMP: 'Big blind versus a limp — a raise-sizing decision we do not grade for compliance.',
};

/** Reason `scenario` is excluded from compliance, or null when it is graded. */
export function complianceExclusionReason(scenario: Scenario): string | null {
  return COMPLIANCE_EXCLUSION_REASONS[scenario] ?? null;
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
/**
 * Graded/excluded breakdown behind the compliance %. `percentage` is null when
 * nothing in the set was gradeable, so the UI can avoid showing a fake 100%
 * for a position whose spots are all refused (facing 3-bets/all-ins, etc.).
 */
export interface ComplianceBreakdown {
  /** Decisions the engine actually graded (checkCompliance returned a verdict). */
  graded: number;
  compliant: number;
  /** Decisions the engine refused to grade (facing 3-bets/all-ins, extreme ICM, …). */
  excluded: number;
  percentage: number | null;
}

export function complianceBreakdown(
  decisions: HeroDecision[],
  profile: StrategyProfile = 'game_plan',
  icmStage: ICMStage = 'early',
): ComplianceBreakdown {
  let graded = 0;
  let compliant = 0;
  let excluded = 0;

  for (const d of decisions) {
    const result = checkCompliance(d, profile, icmStage);
    if (result === null) {
      excluded++;
      continue;
    }
    graded++;
    if (result.isCompliant) compliant++;
  }

  return {
    graded,
    compliant,
    excluded,
    percentage: graded === 0 ? null : (compliant / graded) * 100,
  };
}

export function compliancePercentage(
  decisions: HeroDecision[],
  profile: StrategyProfile = 'game_plan',
  icmStage: ICMStage = 'early',
): number {
  // Back-compat: an all-excluded set reports 100 (no graded deviations).
  return complianceBreakdown(decisions, profile, icmStage).percentage ?? 100;
}

export { getRFIRange } from '../data/ranges';
