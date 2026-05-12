/**
 * Bounty tournament analyzer.
 *
 * Detects PKO/PSKO tournaments from hand history data and calculates
 * equity drop from bounty considerations.
 *
 * Sources:
 * - docs/strategy/06-bounty-tournaments.md §1-9
 * - CLAUDE.md "Bounty Tournament Support"
 * - [Vol.2, D#11, D#06, D#13, D#14, D#18]
 */

import type { Hand, PlayerInHand } from '../types/hand';

export type BountyTournamentType = 'regular' | 'knockout' | 'progressive_ko';

export interface BountyContext {
  tournamentType: BountyTournamentType;
  /** Estimated equity drop from bounty (percentage points) */
  equityDrop: number;
  /** Whether hero covers the villain (can win their bounty) */
  heroCoversVillain: boolean;
  /** Relative bounty size (bounty / buy-in ratio) */
  bountyRatio: number;
  /** Tournament stage impact on bounty value */
  stageAdjustment: 'early' | 'mid' | 'late';
  note: string;
}

/**
 * Detect if a tournament is a bounty/knockout format.
 *
 * PokerStars bounty tournaments include "Knockout" or "Bounty" in the
 * tournament name or have specific buy-in structures. Since we only
 * have buy-in/fee from hand history, we use heuristics.
 *
 * Heuristic: In PKO/PSKO, the buy-in structure often has a bounty
 * component. Standard is $X+$Y (buy-in + fee). PKO adds a third
 * component or has specific patterns.
 *
 * For now, we flag tournaments based on format string if available,
 * or allow manual tagging.
 */
export function detectBountyTournament(
  format: string,
  _buyIn: number,
): BountyTournamentType {
  const lower = format.toLowerCase();
  if (lower.includes('progressive') || lower.includes('psko') || lower.includes('pko')) {
    return 'progressive_ko';
  }
  if (lower.includes('knockout') || lower.includes('bounty') || lower.includes('ko')) {
    return 'knockout';
  }
  return 'regular';
}

/**
 * Calculate Bounty Power (BPWR) — converts bounty value into equity drop.
 *
 * BPWR = bountyValue / (pot + bountyValue) approximately
 *
 * This is a simplified in-game approximation. For exact calculations,
 * use HRC (Holdem Resources Calculator).
 *
 * Source: docs/strategy/06-bounty-tournaments.md §2
 *
 * @param bountyChipValue - Bounty value converted to chip equivalent
 * @param potSize - Current pot size in chips
 * @param heroStack - Hero's stack
 * @param villainStack - Villain's stack (the one being called)
 * @returns Equity drop in percentage points (e.g., 8.7 means -8.7%)
 */
export function calculateBPWR(
  bountyChipValue: number,
  potSize: number,
  heroStack: number,
  villainStack: number,
): number {
  if (potSize <= 0) return 0;

  // BPWR approximation: bounty value as portion of total pot + bounty
  const effectivePot = potSize + bountyChipValue;
  const equityDrop = (bountyChipValue / effectivePot) * 100;

  // Adjust for coverage: if hero doesn't cover villain, partial bounty
  const coverageMultiplier = heroStack >= villainStack ? 1.0 : 0.5;

  return Math.round(equityDrop * coverageMultiplier * 10) / 10;
}

/**
 * Estimate bounty context for a specific hand.
 *
 * Since PokerStars hand histories don't include explicit bounty values,
 * we estimate based on buy-in and tournament stage.
 *
 * Progressive KO: bounty starts at ~50% of buy-in, doubles with each elimination.
 * Standard KO: fixed bounty, typically 50% of buy-in.
 */
export function estimateBountyContext(
  hand: Hand,
  hero: PlayerInHand,
  villain: PlayerInHand | null,
  tournamentType: BountyTournamentType,
  buyIn: number,
): BountyContext | null {
  if (tournamentType === 'regular') return null;

  // Estimate initial bounty as ~50% of buy-in
  const initialBounty = buyIn * 0.5;

  // Estimate stage based on blind level
  let stageAdjustment: BountyContext['stageAdjustment'];
  let bountyMultiplier: number;

  if (hand.level <= 5) {
    stageAdjustment = 'early';
    bountyMultiplier = 1.0; // Initial bounty
  } else if (hand.level <= 12) {
    stageAdjustment = 'mid';
    bountyMultiplier = tournamentType === 'progressive_ko' ? 2.0 : 1.0;
  } else {
    stageAdjustment = 'late';
    bountyMultiplier = tournamentType === 'progressive_ko' ? 4.0 : 1.0;
  }

  const estimatedBounty = initialBounty * bountyMultiplier;
  const bountyRatio = buyIn > 0 ? estimatedBounty / buyIn : 0;

  // Calculate coverage
  const heroCoversVillain = villain ? hero.chipsBefore >= villain.chipsBefore : false;

  // Estimate equity drop
  // Convert bounty $ to chip equivalent (rough: bounty$ / buyIn$ * startingStack)
  const startingStack = 1500; // PokerStars default starting stack
  const bountyChipValue = buyIn > 0 ? (estimatedBounty / buyIn) * startingStack : 0;
  const potEstimate = hand.totalPot > 0 ? hand.totalPot : hand.bigBlind * 5;

  const equityDrop = calculateBPWR(
    bountyChipValue,
    potEstimate,
    hero.chipsBefore,
    villain?.chipsBefore ?? hero.chipsBefore,
  );

  let note: string;
  if (equityDrop > 15) {
    note = 'Very high equity drop — call with any reasonable hand.';
  } else if (equityDrop > 10) {
    note = 'Significant equity drop — widen call/3-bet ranges.';
  } else if (equityDrop > 5) {
    note = 'Moderate equity drop — adjust ranges slightly looser.';
  } else {
    note = 'Small equity drop — play close to standard with minor adjustment.';
  }

  return {
    tournamentType,
    equityDrop,
    heroCoversVillain,
    bountyRatio,
    stageAdjustment,
    note,
  };
}

/**
 * Quick reference: equity drop ranges by scenario.
 * Source: docs/strategy/06-bounty-tournaments.md §9
 */
export const BOUNTY_HEURISTICS = {
  coveringVillain: { minDrop: 5, maxDrop: 15, description: 'Hero covers villain — significant equity drop' },
  notCovering: { minDrop: 2, maxDrop: 8, description: 'Villain covers hero — partial equity drop (progressive KO)' },
  multiWay: { minDrop: 10, maxDrop: 25, description: 'Multi-way all-in — accumulated bounties widen range dramatically' },
  earlyGame: { minDrop: 5, maxDrop: 10, description: 'Early — bounties small relative to stack' },
  lateGame: { minDrop: 10, maxDrop: 20, description: 'Late — inflated bounties, hunting dominates' },
} as const;
