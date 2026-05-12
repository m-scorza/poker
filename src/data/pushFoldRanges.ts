/**
 * Push/Fold ranges for short stack play (≤10bb).
 *
 * At 10bb or less, strategy simplifies to all-in or fold.
 * No raise/fold, no postflop play.
 *
 * Sources:
 * - CLAUDE.md "Short Stack Strategy (10bb or less)"
 * - docs/knowledge/strategy/02-ranges-and-position.md §4 "Open Shove Ranges"
 * - [Vol.2, NERD]
 *
 * Resteal ranges apply when facing a late position open with ≤20bb.
 */

import type { Position } from '../types/analysis';
import type { RangeSet, PositionRanges } from '../types/ranges';

const RANKS = '23456789TJQKA';

function rankIdx(r: string): number {
  return RANKS.indexOf(r);
}

function expandPairs(high: string, low: string): string[] {
  const hi = rankIdx(high);
  const lo = rankIdx(low);
  const result: string[] = [];
  for (let i = hi; i >= lo; i--) {
    result.push(RANKS[i]! + RANKS[i]!);
  }
  return result;
}

function expandSuitedRange(r1: string, kicker1: string, kicker2: string, suffix: string): string[] {
  const k1 = rankIdx(kicker1);
  const k2 = rankIdx(kicker2);
  const result: string[] = [];
  for (let i = k1; i >= k2; i--) {
    result.push(r1 + RANKS[i]! + suffix);
  }
  return result;
}

function rangeSet(hands: string[]): RangeSet {
  return new Set(hands);
}

// --- Push ranges at 10bb by position ---
// Source: CLAUDE.md + docs/knowledge/strategy/02-ranges-and-position.md §4

// UTG (~16%): Pairs 22+, A2s+, A7o+, KTs+, KQo
const UTG_PUSH: string[] = [
  ...expandPairs('A', '2'),
  ...expandSuitedRange('A', 'K', '2', 's'),
  ...expandSuitedRange('A', 'K', '7', 'o'),
  ...expandSuitedRange('K', 'Q', 'T', 's'),
  'KQo',
];

// MP (~20%): UTG + A5o+, K9s+, QTs+
const MP_PUSH: string[] = [
  ...UTG_PUSH,
  ...expandSuitedRange('A', '6', '5', 'o'), // A5o-A6o (A7o+ already in UTG)
  'K9s',
  ...expandSuitedRange('Q', 'J', 'T', 's'),
];

// HJ (~28%): MP + A2o+, K6s+, Q8s+, J9s+
// Note: docs say LJ at 24% and HJ at 28%, we use HJ
const HJ_PUSH: string[] = [
  ...MP_PUSH,
  ...expandSuitedRange('A', '4', '2', 'o'), // A2o-A4o (A5o+ already in MP)
  ...expandSuitedRange('K', '8', '6', 's'), // K6s-K8s (K9s+ already in MP)
  ...expandSuitedRange('Q', '9', '8', 's'), // Q8s-Q9s (QTs+ already in MP)
  ...expandSuitedRange('J', 'T', '9', 's'), // J9s-JTs
];

// CO (~36%): HJ + K2s+, K9o+, Q5s+, J8s+, T8s+
const CO_PUSH: string[] = [
  ...HJ_PUSH,
  ...expandSuitedRange('K', '5', '2', 's'), // K2s-K5s (K6s+ already in HJ)
  ...expandSuitedRange('K', 'J', '9', 'o'), // K9o-KJo (KQo already in UTG)
  ...expandSuitedRange('Q', '7', '5', 's'), // Q5s-Q7s (Q8s+ already in HJ)
  ...expandSuitedRange('J', '8', '8', 's'), // J8s (J9s+ already in HJ)
  ...expandSuitedRange('T', '9', '8', 's'), // T8s-T9s
];

// BTN (~48%): Very wide — K-any suited, Q-most, most connectors
const BTN_PUSH: string[] = [
  ...CO_PUSH,
  ...expandSuitedRange('Q', '4', '2', 's'), // Q2s-Q4s (Q5s+ already in CO)
  ...expandSuitedRange('J', '7', '2', 's'), // J2s-J7s (J8s+ already in CO)
  ...expandSuitedRange('T', '7', '2', 's'), // T2s-T7s (T8s+ already in CO)
  ...expandSuitedRange('9', '8', '2', 's'), // 92s-98s
  ...expandSuitedRange('8', '7', '2', 's'), // 82s-87s
  '76s', '75s', '74s', '73s', '72s',
  '65s', '64s', '63s', '62s',
  '54s', '53s', '52s',
  '43s', '42s',
  '32s',
  // Offsuit broadways
  ...expandSuitedRange('K', '8', '2', 'o'), // K2o-K8o (K9o+ already)
  ...expandSuitedRange('Q', 'J', '5', 'o'), // Q5o-QJo
  ...expandSuitedRange('J', 'T', '7', 'o'), // J7o-JTo
  ...expandSuitedRange('T', '9', '7', 'o'), // T7o-T9o
  '98o', '97o',
  '87o', '86o',
  '76o', '75o',
  '65o', '64o',
  '54o',
];

// SB (~69%): Extremely wide — push nearly ATC vs BB
const SB_PUSH: string[] = [
  ...BTN_PUSH,
  // Add remaining offsuit hands
  ...expandSuitedRange('Q', '4', '2', 'o'), // Q2o-Q4o
  ...expandSuitedRange('J', '6', '2', 'o'), // J2o-J6o
  ...expandSuitedRange('T', '6', '2', 'o'), // T2o-T6o
  '96o', '95o', '94o', '93o', '92o',
  '85o', '84o', '83o', '82o',
  '74o', '73o', '72o',
  '63o', '62o',
  '53o', '52o',
  '43o', '42o',
  '32o',
];

/** Push/fold ranges by position at 10bb. Source: [Vol.2, NERD, GamePlan] */
export const PUSH_RANGES: PositionRanges = {
  UTG: rangeSet(UTG_PUSH),
  'UTG+1': rangeSet(UTG_PUSH), // Same as UTG at 10bb
  MP1: rangeSet(MP_PUSH),
  MP: rangeSet(MP_PUSH),
  MP2: rangeSet(MP_PUSH),
  HJ: rangeSet(HJ_PUSH),
  CO: rangeSet(CO_PUSH),
  BTN: rangeSet(BTN_PUSH),
  SB: rangeSet(SB_PUSH),
  'BTN/SB': rangeSet(SB_PUSH), // HU BTN/SB uses SB range
};

// --- Resteal ranges (≤20bb, facing CO or BTN open) ---
// Source: CLAUDE.md "Resteal Ranges"
// SHOVE: all pairs, all suited broadways, all suited aces

const RESTEAL_HANDS: string[] = [
  // All pairs
  ...expandPairs('A', '2'),
  // All suited aces
  ...expandSuitedRange('A', 'K', '2', 's'),
  // All suited broadways: KQs-KTs, QJs-QTs, JTs
  ...expandSuitedRange('K', 'Q', 'T', 's'),
  ...expandSuitedRange('Q', 'J', 'T', 's'),
  'JTs',
];

/** Resteal (reshove) range for ≤20bb facing late position open. Source: [GamePlan] */
export const RESTEAL_RANGE: RangeSet = rangeSet(RESTEAL_HANDS);

/**
 * Check if a hand is in the push range for a given position at 10bb.
 */
export function isInPushRange(handKey: string, position: Position): boolean {
  const range = PUSH_RANGES[position];
  return range ? range.has(handKey) : false;
}

/**
 * Check if a hand is in the resteal range (≤20bb vs late position open).
 */
export function isInRestealRange(handKey: string): boolean {
  return RESTEAL_RANGE.has(handKey);
}

/**
 * Get the push range for a position.
 */
export function getPushRange(position: Position): RangeSet | undefined {
  return PUSH_RANGES[position];
}
