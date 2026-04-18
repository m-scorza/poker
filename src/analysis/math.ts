/**
 * Poker Math Utilities.
 * Handles MDF, Pot Odds, and Equity-based calculations.
 * 
 * Source: 01-poker-math.md
 */

/**
 * Minimal Defending Frequency (MDF).
 * The frequency with which a player must defend (call or raise) 
 * to prevent an opponent from profitably bluffing any two cards.
 * 
 * Formula: Pot / (Pot + Bet)
 */
export function calculateMDF(pot: number, bet: number): number {
  if (pot + bet === 0) return 1;
  return pot / (pot + bet);
}

/**
 * Alpha (Required Fold Equity).
 * The frequency with which an opponent must fold for a bluff to be break-even.
 * Also known as "Pot Odds" in reverse.
 * 
 * Formula: Bet / (Pot + Bet)
 */
export function calculateAlpha(pot: number, bet: number): number {
  if (pot + bet === 0) return 0;
  return bet / (pot + bet);
}

/**
 * Pot Odds (Required Equity to Call).
 * The equity needed to make a call break-even.
 * 
 * Formula: CallAmount / (TotalPot + CallAmount)
 */
export function calculatePotOdds(totalPot: number, callAmount: number): number {
  if (totalPot + callAmount === 0) return 0;
  return callAmount / (totalPot + callAmount);
}

/**
 * Strategic Sizing Recommendation.
 * Returns the recommended c-bet sizing based on board texture.
 * 
 * Source: 04-postflop-strategy.md
 */
export interface SizingRecommendation {
  minSizing: number; // as fraction of pot (0.25 = 25%)
  maxSizing: number;
  label: string;
}

export function getRecommendedCbetSizing(texture: string): SizingRecommendation {
  switch (texture) {
    case 'high_dry':
      return { minSizing: 0.20, maxSizing: 0.35, label: 'Small (25-33%)' };
    case 'wet_broadway':
      return { minSizing: 0.50, maxSizing: 0.80, label: 'Large (50-75%)' };
    case 'low_connected':
      return { minSizing: 0.20, maxSizing: 0.33, label: 'Small or Check' };
    case 'paired_low':
      return { minSizing: 0.20, maxSizing: 0.30, label: 'Small (25%)' };
    case 'monotone_low':
      return { minSizing: 0.0, maxSizing: 0.33, label: 'Check or Small' };
    default:
      return { minSizing: 0.25, maxSizing: 0.50, label: 'Medium (33-50%)' };
  }
}
