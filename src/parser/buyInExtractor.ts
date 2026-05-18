/**
 * Shared buy-in extraction logic used by PokerStars and GGPoker parsers
 * (both hand-history and tournament-summary paths).
 *
 * Single place to reason about: GTD prize-pool stripping, comma vs period
 * decimal, a sanity ceiling for real-money tournaments.
 *
 * All numeric parsing routes through integer cents (`parseUsdCents` →
 * `centsToUsd`) so multi-tournament aggregation downstream is drift-free.
 */

import { parseUsdCents, centsToUsd } from './money';

export type Currency = 'USD' | 'T$' | 'PLAY' | 'TICKET';

export interface ExtractedBuyIn {
  buyIn: number;
  fee: number;
  currency: Currency;
  /** True when the input produced no confident match. Callers should
   *  treat buyIn/fee as unknown rather than zero. */
  unresolved: boolean;
}

/**
 * Upper sanity bound for a USD tournament buy-in + fee on the sites we
 * support. PokerStars' High Roller cap is $1,050+$105; Sunday events
 * top out around $530+$20. Anything above this is almost certainly a
 * prize pool / guarantee leaked through our regex.
 */
export const MAX_PLAUSIBLE_USD_BUYIN = 1200;

/** Strip "$X GTD" / "$X Guaranteed" prize-pool text so the real buy-in
 *  isn't confused with a guarantee. Case-insensitive. */
export function stripGuarantees(input: string): string {
  return input.replace(/\$[\d,.]+\s*(?:GTD|Guaranteed)/gi, '');
}

/**
 * Extract buy-in + fee from a PokerStars-style string that may contain:
 *   - `$0.85+$0.15 USD`
 *   - `$0.85+$0.15+$0 USD` (KO / rebuy — three parts)
 *   - `US$ 0,49 + US$ 0,06 USD` (Brazilian locale, comma decimal, spaces)
 *   - `$250,000 GTD $0.98+$0.12 USD` (guaranteed prize pool preceding real buy-in)
 *   - `Freeroll` / `Play Money` / `Ticket` (explicit non-cash)
 *
 * `nameHint` is the tournament name — used for currency classification.
 * `source` is the line / header to pull buy-in numbers from.
 */
export function extractBuyIn(nameHint: string, source: string): ExtractedBuyIn {
  const lowerName = nameHint.toLowerCase();
  const lowerSource = source.toLowerCase();

  // --- Explicit non-cash currencies first ---
  if (
    lowerName.includes('freeroll') ||
    lowerSource.includes('freeroll') ||
    lowerName.includes('play money') ||
    lowerName.includes('pm ')
  ) {
    return { buyIn: 0, fee: 0, currency: 'PLAY', unresolved: false };
  }
  if (lowerName.includes('fpp') || lowerName.includes('starscoin')) {
    return { buyIn: 0, fee: 0, currency: 'PLAY', unresolved: false };
  }
  if (lowerSource.includes('ticket') || lowerName.includes('ticket')) {
    return { buyIn: 0, fee: 0, currency: 'TICKET', unresolved: false };
  }

  // T$ (Tournament Dollars / Player points) — still zero USD impact.
  if (lowerSource.includes('t$') || lowerName.includes('t$')) {
    return { buyIn: 0, fee: 0, currency: 'T$', unresolved: false };
  }

  const cleaned = stripGuarantees(source);

  // Canonical cash pattern: `$X+$Y` (standard) or `$X+$Y+$Z` (PKO/KO).
  // Modern PokerStars PKO format is `$BUYIN+$BOUNTY+$FEE`: parts 1+2 fund the
  // prize pool & bounty (the "real" buy-in cost), part 3 is the rake/fee.
  const canonical = /\$(\d+(?:\.\d+)?)\+\$(\d+(?:\.\d+)?)(?:\+\$(\d+(?:\.\d+)?))?/.exec(cleaned);
  if (canonical) {
    if (canonical[3] !== undefined) {
      const part1 = parseUsdCents(canonical[1]!);
      const part2 = parseUsdCents(canonical[2]!);
      const part3 = parseUsdCents(canonical[3]!);
      if (part1 === null || part2 === null || part3 === null) {
        return { buyIn: 0, fee: 0, currency: 'USD', unresolved: true };
      }
      return applyCeilingCents(part1 + part2, part3);
    }
    const buyInCents = parseUsdCents(canonical[1]!);
    const feeCents = parseUsdCents(canonical[2]!);
    if (buyInCents === null || feeCents === null) {
      return { buyIn: 0, fee: 0, currency: 'USD', unresolved: true };
    }
    return applyCeilingCents(buyInCents, feeCents);
  }

  // Brazilian locale: `US$ 0,49+US$ 0,06` / `US$ 1,40 + US$ 0,10`.
  // Comma is the decimal separator here; accept optional spaces around
  // the `+`. Anchor on `US$` so we don't confuse with other `N,NN+N,NN`.
  const brazilian = /US\$\s*(\d+(?:,\d+)?)\s*\+\s*US\$\s*(\d+(?:,\d+)?)/.exec(cleaned);
  if (brazilian) {
    const buyInCents = parseUsdCents(brazilian[1]!, { localeAware: true });
    const feeCents = parseUsdCents(brazilian[2]!, { localeAware: true });
    if (buyInCents === null || feeCents === null) {
      return { buyIn: 0, fee: 0, currency: 'USD', unresolved: true };
    }
    return applyCeilingCents(buyInCents, feeCents);
  }

  // GGPoker often encodes the full cost as a single cash amount in the
  // tournament name (`Mystery Battle Royale $3 Hold'em`) or summary
  // (`Buy-in: $0.5`). Guarantees were stripped above, so a remaining lone
  // dollar amount is the best available buy-in with zero separated fee.
  const singleCash = /\$(\d+(?:\.\d+)?)\b/.exec(cleaned);
  if (singleCash) {
    const buyInCents = parseUsdCents(singleCash[1]!);
    if (buyInCents === null) {
      return { buyIn: 0, fee: 0, currency: 'USD', unresolved: true };
    }
    return applyCeilingCents(buyInCents, 0);
  }

  // Nothing confidently matched. Do NOT fall back to a greedy
  // "any N+N anywhere on the line" pattern — that's what produced the
  // $250,006.60 phantom buy-in. Leave unresolved and let the caller
  // decide (typically: keep prior value, don't overwrite).
  return { buyIn: 0, fee: 0, currency: 'USD', unresolved: true };
}

/**
 * Apply the USD plausibility ceiling. Inputs are integer cents; output is
 * USD floats. If the parsed buy-in (+ fee) exceeds the ceiling, treat as
 * unresolved so the caller can fall back rather than poison the dashboard.
 */
function applyCeilingCents(buyInCents: number, feeCents: number): ExtractedBuyIn {
  if (!Number.isFinite(buyInCents) || !Number.isFinite(feeCents)) {
    return { buyIn: 0, fee: 0, currency: 'USD', unresolved: true };
  }
  const totalCents = buyInCents + feeCents;
  if (totalCents > MAX_PLAUSIBLE_USD_BUYIN * 100) {
    return { buyIn: 0, fee: 0, currency: 'USD', unresolved: true };
  }
  return {
    buyIn: centsToUsd(buyInCents),
    fee: centsToUsd(feeCents),
    currency: 'USD',
    unresolved: false,
  };
}
