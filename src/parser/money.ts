/**
 * Currency helpers — keep parser/aggregator math drift-free.
 *
 * Floats can't represent most decimal cents exactly:
 *   parseFloat("0.49") + parseFloat("0.06") === 0.55          ← ok this one
 *   parseFloat("0.10") + parseFloat("0.20") === 0.30000...004 ← drift
 *
 * Drift compounds when summing many small currency values (PnL across 500
 * tournaments, bounty totals, prize aggregation). Solution: parse to integer
 * cents, compute in cents space, divide by 100 only at the display/storage
 * boundary.
 *
 * Locale-aware parsing is supported but disabled by default — see
 * `parseUsdCents` opts.
 */

export interface ParseUsdOptions {
  /**
   * When true, treat comma as a decimal separator if the string has a single
   * comma and no dot (e.g. "0,49" → 49 cents). When false (default), commas
   * are always treated as thousands separators and stripped.
   *
   * Set true for Brazilian / European locale strings; leave false for
   * US-locale PokerStars where commas are thousands.
   */
  localeAware?: boolean;
}

/**
 * Parse a USD-style numeric string into integer cents. Returns null if the
 * string can't be confidently parsed.
 *
 * Accepts: "0.49", "1,250.00", "1500", ".50", "0,49" (localeAware).
 * Rejects: "abc", "", "1.234.567" (ambiguous), "1,2,3".
 */
export function parseUsdCents(input: string, opts: ParseUsdOptions = {}): number | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hasDot = trimmed.includes('.');
  const hasComma = trimmed.includes(',');

  let normalized: string;

  if (opts.localeAware && hasComma && !hasDot) {
    // Single comma, no dot → comma is decimal separator.
    if ((trimmed.match(/,/g) || []).length !== 1) return null;
    normalized = trimmed.replace(',', '.');
  } else if (hasDot && hasComma) {
    // Both: dot is decimal, comma is thousands. Require valid thousands
    // grouping (1,234.56 ok; 1,2,3.4 not).
    if (!/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed)) return null;
    normalized = trimmed.replace(/,/g, '');
  } else if (hasComma) {
    // Only commas — treat as thousands. Require valid grouping.
    if (!/^-?\d{1,3}(,\d{3})+$/.test(trimmed)) return null;
    normalized = trimmed.replace(/,/g, '');
  } else {
    normalized = trimmed;
    if ((normalized.match(/\./g) || []).length > 1) return null;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const [intPart, fracPartRaw = ''] = normalized.split('.');
  const fracPart = fracPartRaw.padEnd(2, '0').slice(0, 2);

  const sign = intPart!.startsWith('-') ? -1 : 1;
  const intAbs = intPart!.replace(/^-/, '');

  const intCents = Number(intAbs) * 100;
  const fracCents = Number(fracPart);

  if (!Number.isFinite(intCents) || !Number.isFinite(fracCents)) return null;

  return sign * (intCents + fracCents);
}

/** Convert integer cents to a USD float. Single division — no compounding drift. */
export function centsToUsd(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Sum a list of USD floats without float-accumulation drift. Each value is
 * converted to cents (rounded), summed as integers, then divided by 100.
 *
 * Use this at aggregation boundaries (PnL totals, prize sums, bounty totals).
 */
export function sumUsd(values: readonly number[]): number {
  let cents = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    cents += Math.round(v * 100);
  }
  return cents / 100;
}
