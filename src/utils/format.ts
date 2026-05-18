/**
 * Standardized money formatter.
 * Professionally handles negative numbers (e.g. -$5.00 instead of $-5.00)
 * and optional positive sign display.
 */
export function money(value: number, showPlusSign: boolean = false): string {
  const isNegative = value < 0;
  const isPositive = value > 0;
  const absValue = Math.abs(value);
  const sign = isNegative ? '-' : (isPositive && showPlusSign ? '+' : '');
  return `${sign}$${absValue.toFixed(2)}`;
}

/**
 * Standardized percentage formatter from a pre-calculated percentage value (e.g. 45.2).
 * Supports optional positive sign display.
 */
export function pct(value: number | null, showPlusSign: boolean = false): string {
  if (value === null) return '—';
  const isPositive = value > 0;
  const sign = isPositive && showPlusSign ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Calculates and formats ratio percentages (e.g. 5 out of 10 -> 50.0%).
 */
export function ratioPct(n: number, d: number, emptyPlaceholder: string = '0%'): string {
  return d === 0 ? emptyPlaceholder : `${((n / d) * 100).toFixed(1)}%`;
}
