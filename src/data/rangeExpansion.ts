import type { RangeSet } from '../types/ranges';

export const RANKS = '23456789TJQKA';

function rankIdx(r: string): number {
  return RANKS.indexOf(r);
}

/** Expand "AA-66" into ["AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66"] */
export function expandPairs(high: string, low: string): string[] {
  const hi = rankIdx(high);
  const lo = rankIdx(low);
  const result: string[] = [];
  for (let i = hi; i >= lo; i--) {
    result.push(RANKS[i]! + RANKS[i]!);
  }
  return result;
}

/** Expand "AKs-ATs" into ["AKs", "AQs", "AJs", "ATs"] */
export function expandSuitedRange(r1: string, kicker1: string, kicker2: string, suffix: string): string[] {
  const k1 = rankIdx(kicker1);
  const k2 = rankIdx(kicker2);
  const result: string[] = [];
  for (let i = k1; i >= k2; i--) {
    result.push(r1 + RANKS[i]! + suffix);
  }
  return result;
}

/** Build a Set<string> from an array of hand keys */
export function rangeSet(hands: string[]): RangeSet {
  return new Set(hands);
}
