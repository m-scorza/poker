import { describe, it, expect } from 'vitest';
import { parseCard, toCanonicalHandKey, rankIndex } from '../handKey';

describe('parseCard', () => {
  it('parses a card string into rank and suit', () => {
    expect(parseCard('Ah')).toEqual({ rank: 'A', suit: 'h' });
    expect(parseCard('Tc')).toEqual({ rank: 'T', suit: 'c' });
    expect(parseCard('2s')).toEqual({ rank: '2', suit: 's' });
  });

  it('handles whitespace', () => {
    expect(parseCard(' Kd ')).toEqual({ rank: 'K', suit: 'd' });
  });
});

describe('rankIndex', () => {
  it('returns correct ordering', () => {
    expect(rankIndex('2')).toBeLessThan(rankIndex('A'));
    expect(rankIndex('T')).toBeLessThan(rankIndex('J'));
    expect(rankIndex('K')).toBeLessThan(rankIndex('A'));
    expect(rankIndex('9')).toBeLessThan(rankIndex('T'));
  });
});

describe('toCanonicalHandKey', () => {
  it('converts a pair', () => {
    expect(toCanonicalHandKey('Js', 'Jd')).toBe('JJ');
    expect(toCanonicalHandKey('Ah', 'Ac')).toBe('AA');
    expect(toCanonicalHandKey('2d', '2h')).toBe('22');
  });

  it('converts suited hands (same suit)', () => {
    expect(toCanonicalHandKey('Ah', 'Kh')).toBe('AKs');
    expect(toCanonicalHandKey('Ts', '9s')).toBe('T9s');
  });

  it('converts offsuit hands (different suits)', () => {
    expect(toCanonicalHandKey('Ah', 'Kd')).toBe('AKo');
    expect(toCanonicalHandKey('Qc', 'Jh')).toBe('QJo');
  });

  it('always puts higher rank first', () => {
    expect(toCanonicalHandKey('5h', 'Ah')).toBe('A5s');
    expect(toCanonicalHandKey('3d', 'Kc')).toBe('K3o');
    expect(toCanonicalHandKey('2c', 'Tc')).toBe('T2s');
  });

  it('is order-independent', () => {
    expect(toCanonicalHandKey('Kh', 'Ah')).toBe(
      toCanonicalHandKey('Ah', 'Kh'),
    );
    expect(toCanonicalHandKey('9d', 'Ts')).toBe(
      toCanonicalHandKey('Ts', '9d'),
    );
  });
});
