import { rankIndex } from '../utils/cards';

export { rankIndex };

export interface ParsedCard {
  rank: string;
  suit: string;
}

/** Parse a card string like "Ah" into rank and suit. */
export function parseCard(cardStr: string): ParsedCard {
  const trimmed = cardStr.trim();
  return {
    rank: trimmed[0]!,
    suit: trimmed[1]!,
  };
}

/**
 * Convert two hole cards to canonical form.
 * Always puts higher rank first.
 * - Same rank → pair: "JJ"
 * - Same suit → suited: "AKs"
 * - Diff suit → offsuit: "AKo"
 */
export function toCanonicalHandKey(card1: string, card2: string): string {
  const c1 = parseCard(card1);
  const c2 = parseCard(card2);

  const idx1 = rankIndex(c1.rank);
  const idx2 = rankIndex(c2.rank);

  // Order: higher rank first
  const [high, low] = idx1 >= idx2 ? [c1, c2] : [c2, c1];

  if (high.rank === low.rank) {
    return `${high.rank}${low.rank}`;
  }

  const suffix = high.suit === low.suit ? 's' : 'o';
  return `${high.rank}${low.rank}${suffix}`;
}
