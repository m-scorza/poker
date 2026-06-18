/**
 * ICM stage auto-detection from hand history data.
 *
 * Since PokerStars hand histories don't include total remaining players
 * or prize structure, we infer ICM stage from available signals:
 * - Blind level (higher = later in tournament)
 * - Average stack in bb (lower = later)
 * - Active players at table (fewer = possible FT/bubble)
 * - Table format changes (9-max → 6-max → 3-max typically means FT)
 *
 * Sources:
 * - docs/knowledge/strategy/05-icm-and-risk-premium.md §2 "When to Consider ICM"
 * - CLAUDE.md "ICM Concepts"
 */

import type { Hand, PlayerInHand } from '../types/hand';
import type { ICMStage } from '../data/strategyProfiles';

export interface ICMEstimate {
  stage: ICMStage;
  confidence: 'low' | 'medium' | 'high';
  riskPremiumEstimate: number; // Approximate RP in percentage points
  signals: string[];
}

/**
 * Estimate ICM stage for a single hand based on available data.
 *
 * Heuristic rules:
 * - Level 1-3 (low blinds) → early
 * - Level 4-8 (medium blinds) → mid
 * - Level 9+ or avg stack < 20bb → bubble/late
 * - Active players ≤ 6 on a 9-max table → possible FT
 * - Active players ≤ 3 → final table
 *
 * These are rough estimates. For precise ICM, we'd need total field
 * size and prize structure (not available in standard hand histories).
 */
export function estimateICMStage(
  hand: Hand,
  players: PlayerInHand[],
): ICMEstimate {
  const signals: string[] = [];
  let score = 0; // Higher = later in tournament

  // Signal 1: Blind level
  if (hand.level <= 3) {
    signals.push(`Level ${hand.level} (early)`);
    score += 0;
  } else if (hand.level <= 6) {
    signals.push(`Level ${hand.level} (mid-early)`);
    score += 1;
  } else if (hand.level <= 10) {
    signals.push(`Level ${hand.level} (mid-late)`);
    score += 2;
  } else if (hand.level <= 15) {
    signals.push(`Level ${hand.level} (late)`);
    score += 3;
  } else {
    signals.push(`Level ${hand.level} (very late)`);
    score += 4;
  }

  // Signal 2: Average stack depth in bb
  const avgStack = players.length > 0
    ? players.reduce((sum, p) => sum + p.chipsBefore, 0) / players.length
    : 0;
  const avgStackBb = hand.bigBlind > 0 ? avgStack / hand.bigBlind : 100;

  if (avgStackBb > 50) {
    signals.push(`Avg stack ${avgStackBb.toFixed(0)}bb (deep)`);
    score += 0;
  } else if (avgStackBb > 30) {
    signals.push(`Avg stack ${avgStackBb.toFixed(0)}bb (medium)`);
    score += 1;
  } else if (avgStackBb > 15) {
    signals.push(`Avg stack ${avgStackBb.toFixed(0)}bb (short)`);
    score += 2;
  } else {
    signals.push(`Avg stack ${avgStackBb.toFixed(0)}bb (very short)`);
    score += 3;
  }

  // Signal 3: Active players vs table max
  const playerRatio = hand.maxSeats > 0 ? hand.activePlayers / hand.maxSeats : 1;

  if (hand.activePlayers <= 3 && hand.maxSeats >= 6) {
    signals.push(`${hand.activePlayers} players at ${hand.maxSeats}-max (final table)`);
    score += 4;
  } else if (hand.activePlayers <= 4 && hand.maxSeats >= 6) {
    signals.push(`${hand.activePlayers} players at ${hand.maxSeats}-max (near FT)`);
    score += 3;
  } else if (playerRatio < 0.6) {
    signals.push(`${hand.activePlayers}/${hand.maxSeats} seats filled (shrinking)`);
    score += 1;
  }

  // Signal 4: Ante presence and size relative to BB
  if (hand.ante > 0) {
    const anteRatio = hand.ante / hand.bigBlind;
    if (anteRatio >= 0.2) {
      signals.push(`Ante ${hand.ante} (${(anteRatio * 100).toFixed(0)}% of BB — late structure)`);
      score += 1;
    }
  }

  // Map score to ICM stage
  let stage: ICMStage;
  let riskPremiumEstimate: number;

  if (score <= 1) {
    stage = 'early';
    riskPremiumEstimate = 0;
  } else if (score <= 3) {
    stage = 'mid';
    riskPremiumEstimate = 2;
  } else if (score <= 6) {
    stage = 'bubble';
    riskPremiumEstimate = 10;
  } else if (score <= 8) {
    stage = 'itm';
    riskPremiumEstimate = 8;
  } else {
    stage = 'final_table';
    riskPremiumEstimate = 15;
  }

  // Confidence based on signal count and consistency
  const confidence = signals.length >= 3 ? 'medium' : 'low';

  return {
    stage,
    confidence,
    riskPremiumEstimate,
    signals,
  };
}

/**
 * Estimate ICM stage from just the hand data (without player data).
 * Less accurate but usable when player data isn't readily available.
 */
export function estimateICMStageFromHand(hand: Hand): ICMStage {
  // Simple heuristic based on level and player count
  if (hand.activePlayers <= 3 && hand.maxSeats >= 6) return 'final_table';
  if (hand.level >= 15) return 'final_table';
  if (hand.level >= 10 || (hand.activePlayers <= 5 && hand.maxSeats >= 9)) return 'bubble';
  if (hand.level >= 5) return 'mid';
  return 'early';
}

/**
 * Get ICM stage label in English.
 *
 * The stage is a heuristic estimate (a level/stack score ladder with no
 * field-size data — see `estimateICMStage`), so labels are suffixed "(est.)"
 * to avoid presenting e.g. a mid-field level-11 spot as a definitive "Bubble"
 * (B10).
 */
export function icmStageLabel(stage: ICMStage): string {
  const labels: Record<ICMStage, string> = {
    early: 'Early (est.)',
    mid: 'Mid (est.)',
    bubble: 'Bubble (est.)',
    itm: 'ITM (est.)',
    final_table: 'Final Table (est.)',
  };
  return labels[stage];
}

/**
 * Get ICM stage color class for UI display.
 */
export function icmStageColor(stage: ICMStage): string {
  const colors: Record<ICMStage, string> = {
    early: 'text-[var(--accent)]',
    mid: 'text-[var(--sig)]',
    bubble: 'text-[var(--warn)]',
    itm: 'text-[var(--warn)]',
    final_table: 'text-[var(--loss)]',
  };
  return colors[stage];
}
