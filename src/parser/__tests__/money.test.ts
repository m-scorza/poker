import { describe, expect, it } from 'vitest';
import { parseUsdCents, centsToUsd, sumUsd } from '../money';

describe('parseUsdCents', () => {
  it('parses standard US decimal strings into integer cents', () => {
    expect(parseUsdCents('0.49')).toBe(49);
    expect(parseUsdCents('1.40')).toBe(140);
    expect(parseUsdCents('100')).toBe(10000);
    expect(parseUsdCents('0.06')).toBe(6);
  });

  it('strips US thousands commas', () => {
    expect(parseUsdCents('1,250.00')).toBe(125000);
    expect(parseUsdCents('1,000')).toBe(100000);
  });

  it('pads or truncates fractional digits to two places', () => {
    expect(parseUsdCents('1.5')).toBe(150);
    expect(parseUsdCents('1.5')).toBe(150);
    expect(parseUsdCents('1.499')).toBe(149); // truncate, do not round
  });

  it('returns null for unparseable input', () => {
    expect(parseUsdCents('')).toBeNull();
    expect(parseUsdCents('abc')).toBeNull();
    expect(parseUsdCents('1.2.3')).toBeNull();
    expect(parseUsdCents('1,2,3')).toBeNull();
  });

  it('parses locale-aware comma decimals when enabled', () => {
    expect(parseUsdCents('0,49', { localeAware: true })).toBe(49);
    expect(parseUsdCents('1,40', { localeAware: true })).toBe(140);
  });

  it('rejects ambiguous comma input under locale-aware mode', () => {
    expect(parseUsdCents('1,2,3', { localeAware: true })).toBeNull();
  });

  it('rejects malformed thousands grouping by default', () => {
    // Without locale-aware mode, "1,40" isn't a valid US thousands group.
    // Reject rather than guess.
    expect(parseUsdCents('1,40')).toBeNull();
    expect(parseUsdCents('1,234')).toBe(123400);
  });
});

describe('centsToUsd', () => {
  it('converts cents to dollars with a single division', () => {
    expect(centsToUsd(49)).toBe(0.49);
    expect(centsToUsd(140)).toBe(1.4);
    expect(centsToUsd(10000)).toBe(100);
  });
});

describe('sumUsd', () => {
  it('avoids float drift across many small values', () => {
    // 0.1 + 0.2 in raw float = 0.30000000000000004
    const dirty = 0.1 + 0.2;
    expect(dirty).not.toBe(0.3);
    expect(sumUsd([0.1, 0.2])).toBe(0.3);
  });

  it('sums tournament-style buy-ins cleanly', () => {
    // Simulate 100 PKO entries at $0.49 + $0.06 = $0.55 each
    const entries: number[] = [];
    for (let i = 0; i < 100; i++) entries.push(0.55);
    expect(sumUsd(entries)).toBe(55);
  });

  it('ignores non-finite values', () => {
    expect(sumUsd([1, NaN, 2, Infinity, 3])).toBe(6);
  });

  it('handles negative values for net PnL', () => {
    expect(sumUsd([-0.55, -0.55, 1.5])).toBe(0.4);
  });
});
