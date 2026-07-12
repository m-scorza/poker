import { describe, it, expect } from 'vitest';
import { money, pct, ratioPct, chipAmount } from '../format';

describe('format utilities', () => {
  describe('money', () => {
    it('formats positive values with and without showPlusSign flag', () => {
      expect(money(5.23)).toBe('$5.23');
      expect(money(10.5)).toBe('$10.50');
      expect(money(5.23, false)).toBe('$5.23');
      expect(money(5.23, true)).toBe('+$5.23');
    });

    it('formats zero correctly with and without showPlusSign flag', () => {
      expect(money(0)).toBe('$0.00');
      expect(money(0, true)).toBe('$0.00');
      expect(money(-0)).toBe('$0.00');
    });

    it('formats negative values correctly with professional minus sign', () => {
      expect(money(-5)).toBe('-$5.00');
      expect(money(-5.234)).toBe('-$5.23');
      expect(money(-5.234, true)).toBe('-$5.23');
    });
  });

  describe('pct', () => {
    it('returns em-dash for null input', () => {
      expect(pct(null)).toBe('—');
      expect(pct(null, true)).toBe('—');
    });

    it('formats positive values with and without showPlusSign flag', () => {
      expect(pct(45.2)).toBe('45.2%');
      expect(pct(100)).toBe('100.0%');
      expect(pct(45.2, false)).toBe('45.2%');
      expect(pct(45.2, true)).toBe('+45.2%');
    });

    it('formats zero correctly without plus sign', () => {
      expect(pct(0)).toBe('0.0%');
      expect(pct(0, true)).toBe('0.0%');
    });

    it('formats negative values correctly', () => {
      expect(pct(-12.34)).toBe('-12.3%');
      expect(pct(-12.34, true)).toBe('-12.3%');
    });
  });

  describe('ratioPct', () => {
    it('calculates and formats ratio percentages', () => {
      expect(ratioPct(5, 10)).toBe('50.0%');
      expect(ratioPct(1, 3)).toBe('33.3%');
      expect(ratioPct(0, 10)).toBe('0.0%');
    });

    it('handles zero denominator with default and custom placeholder', () => {
      expect(ratioPct(5, 0)).toBe('0%');
      expect(ratioPct(5, 0, 'N/A')).toBe('N/A');
    });
  });

  describe('chipAmount', () => {
    it('strips binary floating-point noise and formats to two decimal precision', () => {
      expect(chipAmount(385.00000000000006)).toBe('385');
      expect(chipAmount(87.5)).toBe('87.5');
      expect(chipAmount(10.123)).toBe('10.12');
      expect(chipAmount(10.126)).toBe('10.13');
    });

    it('handles zero and negative amounts', () => {
      expect(chipAmount(0)).toBe('0');
      expect(chipAmount(-5.5)).toBe('-5.5');
    });

    it('returns em-dash for non-finite values', () => {
      expect(chipAmount(Infinity)).toBe('—');
      expect(chipAmount(-Infinity)).toBe('—');
      expect(chipAmount(NaN)).toBe('—');
    });
  });
});
