/** Canonical card-rank ordering, lowest to highest. */
export const RANK_ORDER = '23456789TJQKA';

/** Zero-based rank index (2 → 0 … A → 12). Returns -1 for an unknown rank. */
export function rankIndex(rank: string): number {
  return RANK_ORDER.indexOf(rank);
}

/** Poker rank magnitude (2 → 2 … T → 10 … A → 14). Returns 0 for an unknown rank. */
export function rankValue(rank: string): number {
  const idx = RANK_ORDER.indexOf(rank);
  return idx === -1 ? 0 : idx + 2;
}
