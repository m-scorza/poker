/**
 * Theoretical RFI ranges from the Reg Life Game Plan (SNG/MTT early game).
 * Source: [GamePlan] — Plano de Jogo SNG
 *
 * These ranges apply when it is folded to hero (RFI scenario).
 * Each position's range is defined as a Set of canonical hand keys (e.g. "AKs", "JJ", "T9o").
 */

import type { RangeSet, PositionRanges } from '../types/ranges';

// --- Helper to expand range notation into individual hand keys ---

const RANKS = '23456789TJQKA';

function rankIdx(r: string): number {
  return RANKS.indexOf(r);
}

/** Expand "AA-66" into ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66"] */
function expandPairs(high: string, low: string): string[] {
  const hi = rankIdx(high);
  const lo = rankIdx(low);
  const result: string[] = [];
  for (let i = hi; i >= lo; i--) {
    result.push(RANKS[i]! + RANKS[i]!);
  }
  return result;
}

/** Expand "AKs-ATs" into ["AKs", "AQs", "AJs", "ATs"] */
function expandSuitedRange(r1: string, kicker1: string, kicker2: string, suffix: string): string[] {
  const k1 = rankIdx(kicker1);
  const k2 = rankIdx(kicker2);
  const result: string[] = [];
  for (let i = k1; i >= k2; i--) {
    result.push(r1 + RANKS[i]! + suffix);
  }
  return result;
}

/** Build a Set<string> from an array of hand keys */
function rangeSet(hands: string[]): RangeSet {
  return new Set(hands);
}

// --- Individual position ranges (cumulative as documented) ---

// UTG (opens ~13.1%)
const UTG_HANDS: string[] = [
  // Pairs: AA-66
  ...expandPairs('A', '6'),
  // Suited: AKs-ATs, A5s-A3s, KQs-KTs, QJs-QTs, JTs
  ...expandSuitedRange('A', 'K', 'T', 's'),
  ...expandSuitedRange('A', '5', '3', 's'),
  ...expandSuitedRange('K', 'Q', 'T', 's'),
  ...expandSuitedRange('Q', 'J', 'T', 's'),
  'JTs',
  // Offsuit: AKo-AJo, KQo
  ...expandSuitedRange('A', 'K', 'J', 'o'),
  'KQo',
];

// UTG+1 (opens ~14.7%) = UTG + A2s
const UTG1_ADDITIONS: string[] = ['A2s'];

// MP1 (opens ~17.2%) = UTG+1 + A8s, K9s
const MP1_ADDITIONS: string[] = ['A8s', 'K9s'];

// MP2 (opens ~18.4%) = MP1 + listed hands
const MP2_ADDITIONS: string[] = [
  'A7s', 'A6s', 'K8s', 'Q9s', 'J9s', 'T9s',
  '98s', '87s', '76s', '65s', '54s', 'ATo',
];

// HJ (opens ~24.7%) = MP2 + listed hands
const HJ_ADDITIONS: string[] = [
  // A2s is already in UTG+1, but we add it here for completeness
  // (it's inherited from UTG+1 which is already in MP2's base)
  ...expandPairs('5', '2'), // 55-22
  ...expandSuitedRange('K', '7', '5', 's'), // K7s-K5s
  'Q8s', 'J8s', 'T8s',
  // Offsuit: KJo-KTo, QJo
  ...expandSuitedRange('K', 'J', 'T', 'o'),
  'QJo',
];

// CO (opens ~36.6%) = HJ + listed hands
const CO_ADDITIONS: string[] = [
  ...expandSuitedRange('K', '4', '2', 's'), // K4s-K2s
  ...expandSuitedRange('Q', '7', '5', 's'), // Q7s-Q5s
  ...expandSuitedRange('J', '7', '6', 's'), // J7s-J6s
  'T7s',
  '97s', '96s',
  '86s', '75s', '64s', '53s', '43s',
  // Offsuit: A9o-A4o, K9o, QTo, JTo
  ...expandSuitedRange('A', '9', '4', 'o'),
  'K9o', 'QTo', 'JTo',
];

// BTN (opens ~51.1%) = CO + listed hands
const BTN_ADDITIONS: string[] = [
  ...expandSuitedRange('Q', '4', '2', 's'), // Q4s-Q2s
  ...expandSuitedRange('J', '5', '2', 's'), // J5s-J2s
  ...expandSuitedRange('T', '6', '4', 's'), // T6s-T4s
  ...expandSuitedRange('9', '5', '2', 's'), // 95s-92s
  ...expandSuitedRange('8', '5', '2', 's'), // 85s-82s
  ...expandSuitedRange('7', '4', '2', 's'), // 74s-72s
  '63s', '62s',
  '52s', '42s', '32s',
  // Offsuit: A3o-A2o, K8o-K3o, Q9o-Q5o, J9o-J7o, T9o-T7o, 98o-97o, 87o-86o, 76o-75o, 65o-64o, 54o
  'A3o', 'A2o',
  ...expandSuitedRange('K', '8', '3', 'o'),
  ...expandSuitedRange('Q', '9', '5', 'o'),
  ...expandSuitedRange('J', '9', '7', 'o'),
  ...expandSuitedRange('T', '9', '7', 'o'),
  '98o', '97o',
  '87o', '86o',
  '76o', '75o',
  '65o', '64o',
  '54o',
];

// SB Raise / Blind War = BTN + listed hands
const SB_ADDITIONS: string[] = [
  'K2o',
  ...expandSuitedRange('Q', '4', '2', 'o'), // Q4o-Q2o
  ...expandSuitedRange('J', '6', '4', 'o'), // J6o-J4o
  'T6o', 'T5o',
  '96o', '95o',
  '85o', '74o', '63o',
  '53o', '52o',
  '43o', '42o',
  '32o',
];

// --- Build cumulative ranges ---

function cumulativeRange(...additions: string[][]): string[] {
  const all: string[] = [];
  for (const group of additions) {
    all.push(...group);
  }
  return all;
}

const UTG_RANGE = UTG_HANDS;
const UTG1_RANGE = cumulativeRange(UTG_HANDS, UTG1_ADDITIONS);
const MP1_RANGE = cumulativeRange(UTG_HANDS, UTG1_ADDITIONS, MP1_ADDITIONS);
const MP2_RANGE = cumulativeRange(UTG_HANDS, UTG1_ADDITIONS, MP1_ADDITIONS, MP2_ADDITIONS);
const HJ_RANGE = cumulativeRange(UTG_HANDS, UTG1_ADDITIONS, MP1_ADDITIONS, MP2_ADDITIONS, HJ_ADDITIONS);
const CO_RANGE = cumulativeRange(UTG_HANDS, UTG1_ADDITIONS, MP1_ADDITIONS, MP2_ADDITIONS, HJ_ADDITIONS, CO_ADDITIONS);
const BTN_RANGE = cumulativeRange(UTG_HANDS, UTG1_ADDITIONS, MP1_ADDITIONS, MP2_ADDITIONS, HJ_ADDITIONS, CO_ADDITIONS, BTN_ADDITIONS);
const SB_RANGE = cumulativeRange(UTG_HANDS, UTG1_ADDITIONS, MP1_ADDITIONS, MP2_ADDITIONS, HJ_ADDITIONS, CO_ADDITIONS, BTN_ADDITIONS, SB_ADDITIONS);

/** RFI ranges by position. Used for the 'RFI' scenario. */
export const RFI_RANGES: PositionRanges = {
  UTG: rangeSet(UTG_RANGE),
  'UTG+1': rangeSet(UTG1_RANGE),
  MP1: rangeSet(MP1_RANGE),
  MP2: rangeSet(MP2_RANGE),
  HJ: rangeSet(HJ_RANGE),
  CO: rangeSet(CO_RANGE),
  BTN: rangeSet(BTN_RANGE),
  SB: rangeSet(SB_RANGE),
};

/** Reaction Ranges (Facing Raise) - Simplified based on [Vol.2] / [216R] */
const EP_VS_EP_RX: string[] = [
  ...expandPairs('A', 'T'),
  ...expandSuitedRange('A', 'K', 'Q', 's'),
  'AKo',
];

const LP_VS_EP_RX: string[] = [
  ...expandPairs('A', '7'),
  ...expandSuitedRange('A', 'K', 'J', 's'),
  ...expandSuitedRange('A', '5', '4', 's'),
  'KQs', 'AKo', 'AQo',
];

const BTN_VS_CO_RX: string[] = [
  ...expandPairs('A', '2'),
  ...expandSuitedRange('A', 'K', '2', 's'),
  ...expandSuitedRange('K', 'Q', 'T', 's'),
  ...expandSuitedRange('Q', 'J', 'T', 's'),
  'JTs',
  ...expandSuitedRange('A', 'K', 'T', 'o'),
  'KQo',
];

export const REACTION_RANGES: Record<string, RangeSet> = {
  EP_VS_EP: rangeSet(EP_VS_EP_RX),
  LP_VS_EP: rangeSet(LP_VS_EP_RX),
  BTN_VS_CO: rangeSet(BTN_VS_CO_RX),
};

/** SB raise range for BLIND_WAR scenario. Same as SB RFI range. */
export const SB_BLIND_WAR_RANGE: RangeSet = rangeSet(SB_RANGE);

/** BB defense range: According to [GamePlan], never fold suited hands vs 2.5x open. */
export const BB_DEFENSE_RANGE: RangeSet = rangeSet([
  ...allHandCombos().filter(h => h.endsWith('s')),
  'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
  'AKo', 'AQo', 'AJo', 'ATo', 'KQo', 'KJo', 'QJo'
]);

/**
 * Check if a hand is suited (for BB defense rule: never fold suited vs normal open).
 * A canonical hand key ending in 's' is suited; pairs are neither suited nor offsuit.
 */
export function isSuitedHand(handKey: string): boolean {
  return handKey.endsWith('s');
}

/**
 * All 169 canonical hand combos (13x13 grid).
 * Used for range grid visualization.
 */
export function allHandCombos(): string[] {
  const combos: string[] = [];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    for (let j = RANKS.length - 1; j >= 0; j--) {
      const r1 = RANKS[i]!;
      const r2 = RANKS[j]!;
      if (i === j) {
        combos.push(r1 + r2); // Pair
      } else if (i > j) {
        combos.push(r1 + r2 + 's'); // Suited (higher rank first, above diagonal)
      } else {
        combos.push(r2 + r1 + 'o'); // Offsuit (higher rank first, below diagonal)
      }
    }
  }
  return combos;
}

/** Open raise sizing based on stack depth (in bb). Source: [GamePlan] */
export function getRFIRange(position: Position): RangeSet | undefined {
  if (position === 'SB' || position === 'BTN/SB') {
    return SB_BLIND_WAR_RANGE;
  }
  if (position === 'BB') {
    return BB_DEFENSE_RANGE;
  }
  return RFI_RANGES[position];
}

/** 
 * Get reaction range based on Hero position and Opener position.
 */
export function getReactionRange(hero: Position, opener: Position): RangeSet | undefined {
  if (hero === 'BB') return BB_DEFENSE_RANGE;
  
  const isEP = (p: string) => ['UTG', 'UTG+1', 'MP1', 'MP2'].includes(p);
  const isLP = (p: string) => ['HJ', 'CO', 'BTN'].includes(p);

  if (hero === 'BTN' && opener === 'CO') return REACTION_RANGES.BTN_VS_CO;
  if (isLP(hero) && isEP(opener)) return REACTION_RANGES.LP_VS_EP;
  if (isEP(hero) && isEP(opener)) return REACTION_RANGES.EP_VS_EP;
  
  // Default fallback for other pairs: use a standard LP vs EP range
  return REACTION_RANGES.LP_VS_EP;
}

/** 3-bet sizing based on stack depth (in bb) and position (IP/OOP). Source: [GamePlan] */
export function threeBetSize(stackBb: number, isInPosition: boolean): number | 'all-in' {
  if (stackBb < 17) return 'all-in';
  if (stackBb < 20) return isInPosition ? 2.5 : 3;
  if (stackBb < 30) return isInPosition ? 2.7 : 3.2;
  return isInPosition ? 3 : 3.5;
}
