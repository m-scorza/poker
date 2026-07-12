/**
 * Theoretical RFI ranges from the Baseline Game Plan (SNG/MTT early game).
 * Source: [GamePlan] — Baseline Game Plan SNG
 *
 * These ranges apply when it is folded to hero (RFI scenario).
 * Each position's range is defined as a Set of canonical hand keys (e.g. "AKs", "JJ", "T9o").
 */

import type { Position } from '../types/analysis';
import type { RangeSet, PositionRanges } from '../types/ranges';
import { RANKS, expandPairs, expandSuitedRange, rangeSet } from './rangeExpansion';

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
  // 7/8-max hand histories report a single MP seat. Use MP1 as the
  // conservative middle-position baseline instead of silently skipping it.
  MP: rangeSet(MP1_RANGE),
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

const CO_VS_HJ_RX: string[] = [
  ...expandPairs('A', '8'),
  ...expandSuitedRange('A', 'K', 'J', 's'),
  ...expandSuitedRange('A', '5', '3', 's'),
  'KQs', 'QJs', 'JTs',
  '98s', '87s', '76s',
  'AKo', 'AQo',
];

const SB_VS_LATE_RX: string[] = [
  ...expandPairs('A', '8'),
  ...expandSuitedRange('A', 'K', 'J', 's'),
  ...expandSuitedRange('A', '5', '4', 's'),
  'KQs', 'AKo', 'AQo',
];

const REACTION_RANGES = {
  EP_VS_EP: rangeSet(EP_VS_EP_RX),
  LP_VS_EP: rangeSet(LP_VS_EP_RX),
  BTN_VS_CO: rangeSet(BTN_VS_CO_RX),
  CO_VS_HJ: rangeSet(CO_VS_HJ_RX),
  SB_VS_LATE: rangeSet(SB_VS_LATE_RX),
} satisfies Record<string, RangeSet>;

type ReactionRangeKey = keyof typeof REACTION_RANGES | 'BB_DEFENSE';

export interface ReactionRangeInfo {
  hero: Position;
  opener: Position | null;
  status: 'supported' | 'unsupported';
  range: RangeSet | undefined;
  rangeKey: ReactionRangeKey | null;
  label: string;
  comboCount: number;
  confidence: 'rule-based' | 'partial' | 'none';
  note: string;
}

type StoredReactionRangeKey = keyof typeof REACTION_RANGES;

export const BB_DEFENSE_COVERAGE_NOTE = 'BB suited-fold checks cover normal 2-3x opens only, not all-ins or 5x+ raises. ICM pressure can make suited folds acceptable in Advanced profile. Rule-based coverage only, not solver-backed; it is not a full solver-backed BB strategy.';

const REACTION_RANGE_DETAILS: Record<StoredReactionRangeKey, {
  label: string;
  note: string;
}> = {
  EP_VS_EP: {
    label: 'Early position vs early opener',
    note: 'Rule-based 3-bet/fold chart for early-position reaction spots.',
  },
  LP_VS_EP: {
    label: 'Late position vs early opener',
    note: 'Rule-based 3-bet/fold chart for late position against early opens.',
  },
  BTN_VS_CO: {
    label: 'Button vs cutoff opener',
    note: 'Rule-based button reaction chart; calling may still be valid and is not judged by this chart.',
  },
  CO_VS_HJ: {
    label: 'Cutoff vs hijack opener',
    note: 'Rule-based cutoff reaction chart against hijack opens.',
  },
  SB_VS_LATE: {
    label: 'Small blind vs late opener',
    note: 'Rule-based small blind 3-bet/fold chart against late-position opens.',
  },
};

const EP_POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP', 'MP1', 'MP2'];
const POSITION_ORDER: Position[] = ['UTG', 'UTG+1', 'MP', 'MP1', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const FACING_RAISE_OPENER_POSITIONS: Position[] = ['UTG', 'UTG+1', 'MP', 'MP1', 'MP2', 'HJ', 'CO', 'BTN', 'SB'];

const REACTION_RANGE_BY_POSITION: Partial<Record<Position, Partial<Record<Position, StoredReactionRangeKey>>>> = {
  'UTG+1': { UTG: 'EP_VS_EP' },
  MP: { UTG: 'EP_VS_EP', 'UTG+1': 'EP_VS_EP' },
  MP1: { UTG: 'EP_VS_EP', 'UTG+1': 'EP_VS_EP' },
  MP2: { UTG: 'EP_VS_EP', 'UTG+1': 'EP_VS_EP', MP: 'EP_VS_EP', MP1: 'EP_VS_EP' },
  HJ: Object.fromEntries(EP_POSITIONS.map((position) => [position, 'LP_VS_EP'])) as Partial<Record<Position, StoredReactionRangeKey>>,
  CO: {
    ...Object.fromEntries(EP_POSITIONS.map((position) => [position, 'LP_VS_EP'])),
    HJ: 'CO_VS_HJ',
  } as Partial<Record<Position, StoredReactionRangeKey>>,
  BTN: {
    ...Object.fromEntries(EP_POSITIONS.map((position) => [position, 'LP_VS_EP'])),
    HJ: 'CO_VS_HJ',
    CO: 'BTN_VS_CO',
  } as Partial<Record<Position, StoredReactionRangeKey>>,
  SB: {
    ...Object.fromEntries(EP_POSITIONS.map((position) => [position, 'EP_VS_EP'])),
    HJ: 'SB_VS_LATE',
    CO: 'SB_VS_LATE',
    BTN: 'SB_VS_LATE',
  } as Partial<Record<Position, StoredReactionRangeKey>>,
};

function normalReactionPosition(position: Position): Position {
  return position === 'BTN/SB' ? 'SB' : position;
}

export function getFacingRaiseOpenersForPosition(hero: Position): Position[] {
  const normalizedHero = normalReactionPosition(hero);
  const heroIndex = POSITION_ORDER.indexOf(normalizedHero);
  if (heroIndex <= 0) return [];

  return FACING_RAISE_OPENER_POSITIONS.filter((opener) => {
    const openerIndex = POSITION_ORDER.indexOf(opener);
    return openerIndex >= 0 && openerIndex < heroIndex;
  });
}

export function getReactionRangeInfo(
  hero: Position,
  opener: Position | null | undefined,
): ReactionRangeInfo {
  const normalizedHero = normalReactionPosition(hero);

  if (!opener) {
    return {
      hero,
      opener: null,
      status: 'unsupported',
      range: undefined,
      rangeKey: null,
      label: 'No facing-raise chart selected',
      comboCount: 0,
      confidence: 'none',
      note: 'Choose an opener before reviewing reaction coverage for this position.',
    };
  }

  const validOpeners = getFacingRaiseOpenersForPosition(normalizedHero);
  if (!validOpeners.includes(opener)) {
    return {
      hero,
      opener,
      status: 'unsupported',
      range: undefined,
      rangeKey: null,
      label: `${normalizedHero} vs ${opener}`,
      comboCount: 0,
      confidence: 'none',
      note: `${opener} is not an earlier opener for ${normalizedHero}; no preflop reaction chart applies.`,
    };
  }

  if (normalizedHero === 'BB') {
    return {
      hero,
      opener,
      status: 'supported',
      range: BB_DEFENSE_RANGE,
      rangeKey: 'BB_DEFENSE',
      label: `BB defense vs ${opener} opener`,
      comboCount: BB_DEFENSE_RANGE.size,
      confidence: 'partial',
      note: BB_DEFENSE_COVERAGE_NOTE,
    };
  }

  const rangeKey = REACTION_RANGE_BY_POSITION[normalizedHero]?.[opener];
  if (!rangeKey) {
    return {
      hero,
      opener,
      status: 'unsupported',
      range: undefined,
      rangeKey: null,
      label: `${normalizedHero} vs ${opener}`,
      comboCount: 0,
      confidence: 'none',
      note: 'No dedicated reaction chart is encoded for this hero/opener pair yet; skip compliance instead of guessing.',
    };
  }

  const range = REACTION_RANGES[rangeKey];
  const details = REACTION_RANGE_DETAILS[rangeKey];

  return {
    hero,
    opener,
    status: 'supported',
    range,
    rangeKey,
    label: `${normalizedHero} vs ${opener}: ${details.label}`,
    comboCount: range.size,
    confidence: 'rule-based',
    note: details.note,
  };
}

/** SB raise range for BLIND_WAR scenario. Same as SB RFI range. */
export const SB_BLIND_WAR_RANGE: RangeSet = rangeSet(SB_RANGE);

/** BB defense range: According to [GamePlan], never fold suited hands vs 2.5x open. */
const BB_DEFENSE_RANGE: RangeSet = rangeSet([
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
  return getReactionRangeInfo(hero, opener).range;
}

/** 3-bet sizing based on stack depth (in bb) and position (IP/OOP). Source: [GamePlan] */
export function threeBetSize(stackBb: number, isInPosition: boolean): number | 'all-in' {
  if (stackBb < 17) return 'all-in';
  if (stackBb < 20) return isInPosition ? 2.5 : 3;
  if (stackBb < 30) return isInPosition ? 2.7 : 3.2;
  return isInPosition ? 3 : 3.5;
}
