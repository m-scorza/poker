/**
 * Strategy Profile system — Game Plan (simplified) vs Advanced (context-dependent).
 *
 * Game Plan: binary rules from Baseline SNG.
 * Advanced: nuanced rules from full knowledge base (docs/knowledge/strategy/).
 *
 * Source: CLAUDE.md "Strategy Profiles (Modular Analysis)"
 */

export type StrategyProfile = 'game_plan' | 'advanced';

// --- Board Texture Classification (Advanced profile) ---

export type BoardTexture =
  | 'high_dry'         // A-7-2, K-Q-x rainbow
  | 'wet_broadway'     // K-Q-9 with flush draw
  | 'low_connected'    // 7-6-5, 8-7-4
  | 'paired_low'       // 9-6-6, 7-7-3
  | 'monotone_low'     // 8c-6c-3c
  | 'monotone_h'       // 8h-Kh-2h
  | 'monotone_c'
  | 'monotone_d'
  | 'monotone_s'
  | 'neutral';         // Default

// --- C-bet Rules ---

interface CbetContext {
  boardTexture: BoardTexture;
  isInPosition: boolean;
  isHU: boolean;         // Heads-up on flop
  heroIsPFR: boolean;
  bbHasNutsAdvantage: boolean;
  hasRangeAdvantage: boolean;
}

export interface CbetRule {
  profile: StrategyProfile;
  shouldCbet: (context: CbetContext) => boolean;
  recommendedSizing: (context: CbetContext) => number;
}

/**
 * Game Plan: always c-bet 100% at 33% when HU IP as PFR.
 * Source: [GamePlan] "C-bet 100% of hands with 33% pot sizing"
 */
const gamePlanCbet: CbetRule = {
  profile: 'game_plan',
  shouldCbet: (ctx) => ctx.heroIsPFR && ctx.isHU && ctx.isInPosition,
  recommendedSizing: () => 0.33,
};

/**
 * Advanced: texture-dependent c-bet decisions.
 * Source: [Vol.2, D#09, D#10], docs/knowledge/strategy/04-postflop-strategy.md §2
 */
const advancedCbet: CbetRule = {
  profile: 'advanced',
  shouldCbet: (ctx) => {
    if (!ctx.heroIsPFR) return false;
    if (!ctx.isHU) return false; // Multiway: selective only

    if (ctx.boardTexture === 'high_dry') return true;
    if (ctx.boardTexture === 'wet_broadway') return true;
    if (ctx.boardTexture === 'low_connected') return false;
    if (ctx.boardTexture === 'paired_low' && ctx.bbHasNutsAdvantage) return false;
    if (ctx.boardTexture.startsWith('monotone')) return false;

    return ctx.hasRangeAdvantage;
  },
  recommendedSizing: (ctx) => {
    if (ctx.boardTexture === 'wet_broadway') return 0.66;
    if (ctx.boardTexture === 'paired_low') return 0.25;
    return 0.33;
  },
};

// --- Leak Detection Thresholds ---

export interface LeakThresholds {
  vpip: { min: number; max: number };
  pfr: { min: number; max: number };
  threeBetPct: { min: number; max: number } | null;
  cbetTotal: { min: number; max: number };
  cbetHU: { min: number; max: number };
  foldToCbet: { min: number; max: number } | null;
  wtsd: { min: number; max: number };
  wonSD: { min: number; max: number };
  af: { min: number; max: number };
  vpipPfrGap: { max: number } | null;
  rangeCompliance: { min: number };
  limpPct: { max: number };
}

/**
 * Game Plan thresholds — from CLAUDE.md Metrics & Targets.
 * Source: [GamePlan]
 */
const GAME_PLAN_THRESHOLDS: LeakThresholds = {
  vpip: { min: 20, max: 30 },
  pfr: { min: 15, max: 23 },
  threeBetPct: null, // Not tracked in Game Plan
  cbetTotal: { min: 60, max: 70 },
  cbetHU: { min: 100, max: 100 }, // 100% required
  foldToCbet: null, // Not tracked in Game Plan
  wtsd: { min: 25, max: 35 },
  wonSD: { min: 50, max: 100 },
  af: { min: 2, max: 3 },
  vpipPfrGap: null, // Not tracked in Game Plan
  rangeCompliance: { min: 90 },
  limpPct: { max: 0 }, // Zero tolerance
};

/**
 * Advanced thresholds — from docs/knowledge/strategy/09-study-methods-and-tools.md §4.
 * Source: [Vol.3, 09-study §4]
 */
const ADVANCED_THRESHOLDS: LeakThresholds = {
  vpip: { min: 20, max: 28 },
  pfr: { min: 18, max: 25 },
  threeBetPct: { min: 7, max: 10 },
  cbetTotal: { min: 50, max: 60 },
  cbetHU: { min: 80, max: 100 },
  foldToCbet: { min: 35, max: 45 },
  wtsd: { min: 25, max: 30 },
  wonSD: { min: 50, max: 100 },
  af: { min: 2, max: 3 },
  vpipPfrGap: { max: 10 }, // Leak if > 15
  rangeCompliance: { min: 90 },
  limpPct: { max: 0 },
};

/** Get thresholds for a given profile. */
export function getThresholds(profile: StrategyProfile): LeakThresholds {
  return profile === 'game_plan' ? GAME_PLAN_THRESHOLDS : ADVANCED_THRESHOLDS;
}

/** Get c-bet rule for a given profile. */
export function getCbetRule(profile: StrategyProfile): CbetRule {
  return profile === 'game_plan' ? gamePlanCbet : advancedCbet;
}

// --- ICM Stage for Advanced BB Defense ---

export type ICMStage = 'early' | 'mid' | 'bubble' | 'itm' | 'final_table';

/**
 * BB defense fold percentage adjustment by ICM stage.
 * Source: [Vol.3, 05-icm §5], CLAUDE.md "Corrections to Previous Rules" #4
 *
 * In Game Plan profile, this is ignored (always "never fold suited").
 * In Advanced profile, folding suited is acceptable at bubble+.
 */
export const BB_DEFENSE_ICM_ADJUSTMENTS: Record<ICMStage, { foldSuitedAcceptable: boolean; approxFoldPct: number }> = {
  early: { foldSuitedAcceptable: false, approxFoldPct: 0 },
  mid: { foldSuitedAcceptable: false, approxFoldPct: 5 },
  bubble: { foldSuitedAcceptable: true, approxFoldPct: 40 },
  itm: { foldSuitedAcceptable: true, approxFoldPct: 30 },
  final_table: { foldSuitedAcceptable: true, approxFoldPct: 50 },
};

// --- 3-bet Sizing (Advanced profile, deep stack additions) ---

/**
 * Advanced 3-bet sizing by stack depth.
 * Source: [Vol.2, 02-ranges §5], CLAUDE.md "Corrections" #3
 */
export function advancedThreeBetSize(stackBb: number, isInPosition: boolean): number | 'all-in' {
  if (stackBb < 17) return 'all-in';
  if (stackBb < 20) return isInPosition ? 2.5 : 3;
  if (stackBb < 30) return isInPosition ? 2.7 : 3.2;
  if (stackBb < 50) return isInPosition ? 3 : 3.5;
  if (stackBb < 100) return isInPosition ? 3.25 : 3.75;
  return isInPosition ? 4 : 5;
}
