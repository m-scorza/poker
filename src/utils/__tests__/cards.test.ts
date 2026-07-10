import { describe, it, expect } from 'vitest';
import { RANK_ORDER, rankIndex, rankValue } from '../cards';

describe('card rank utilities', () => {
  it('orders ranks weakest to strongest', () => {
    expect(RANK_ORDER).toBe('23456789TJQKA');
  });

  describe('rankValue', () => {
    it('maps ranks to poker magnitude (2 → 2 … T → 10 … A → 14)', () => {
      expect(rankValue('2')).toBe(2);
      expect(rankValue('9')).toBe(9);
      expect(rankValue('T')).toBe(10);
      expect(rankValue('J')).toBe(11);
      expect(rankValue('A')).toBe(14);
    });

    it('preserves ascending order across every rank', () => {
      const values = [...RANK_ORDER].map(rankValue);
      const sorted = [...values].sort((a, b) => a - b);
      expect(values).toEqual(sorted);
    });

    it('returns 0 for an unknown rank', () => {
      expect(rankValue('X')).toBe(0);
    });
  });

  describe('rankIndex', () => {
    it('returns a zero-based index preserving strength order', () => {
      expect(rankIndex('2')).toBe(0);
      expect(rankIndex('A')).toBe(12);
      expect(rankIndex('2')).toBeLessThan(rankIndex('T'));
      expect(rankIndex('T')).toBeLessThan(rankIndex('J'));
    });

    it('returns -1 for an unknown rank', () => {
      expect(rankIndex('X')).toBe(-1);
    });
  });
});
