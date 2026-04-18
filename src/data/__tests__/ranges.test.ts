import { describe, it, expect } from 'vitest';
import {
  RFI_RANGES,
  SB_BLIND_WAR_RANGE,
  isSuitedHand,
  allHandCombos,
  threeBetSize,
} from '../ranges';

describe('RFI_RANGES', () => {
  it('defines ranges for all non-blind positions', () => {
    expect(RFI_RANGES.UTG).toBeDefined();
    expect(RFI_RANGES['UTG+1']).toBeDefined();
    expect(RFI_RANGES.MP1).toBeDefined();
    expect(RFI_RANGES.MP2).toBeDefined();
    expect(RFI_RANGES.HJ).toBeDefined();
    expect(RFI_RANGES.CO).toBeDefined();
    expect(RFI_RANGES.BTN).toBeDefined();
    expect(RFI_RANGES.SB).toBeDefined();
  });

  it('does not define ranges for BB (never RFI)', () => {
    expect(RFI_RANGES.BB).toBeUndefined();
  });

  it('has progressively wider ranges from UTG to SB', () => {
    const utg = RFI_RANGES.UTG!.size;
    const utg1 = RFI_RANGES['UTG+1']!.size;
    const mp1 = RFI_RANGES.MP1!.size;
    const mp2 = RFI_RANGES.MP2!.size;
    const hj = RFI_RANGES.HJ!.size;
    const co = RFI_RANGES.CO!.size;
    const btn = RFI_RANGES.BTN!.size;
    const sb = RFI_RANGES.SB!.size;

    expect(utg1).toBeGreaterThan(utg);
    expect(mp1).toBeGreaterThan(utg1);
    expect(mp2).toBeGreaterThan(mp1);
    expect(hj).toBeGreaterThan(mp2);
    expect(co).toBeGreaterThan(hj);
    expect(btn).toBeGreaterThan(co);
    expect(sb).toBeGreaterThan(btn);
  });

  describe('UTG range', () => {
    it('includes premium pairs', () => {
      expect(RFI_RANGES.UTG!.has('AA')).toBe(true);
      expect(RFI_RANGES.UTG!.has('KK')).toBe(true);
      expect(RFI_RANGES.UTG!.has('QQ')).toBe(true);
      expect(RFI_RANGES.UTG!.has('66')).toBe(true);
    });

    it('excludes small pairs', () => {
      expect(RFI_RANGES.UTG!.has('55')).toBe(false);
      expect(RFI_RANGES.UTG!.has('22')).toBe(false);
    });

    it('includes AKs-ATs', () => {
      expect(RFI_RANGES.UTG!.has('AKs')).toBe(true);
      expect(RFI_RANGES.UTG!.has('AQs')).toBe(true);
      expect(RFI_RANGES.UTG!.has('ATs')).toBe(true);
    });

    it('includes A5s-A3s (wheel aces)', () => {
      expect(RFI_RANGES.UTG!.has('A5s')).toBe(true);
      expect(RFI_RANGES.UTG!.has('A4s')).toBe(true);
      expect(RFI_RANGES.UTG!.has('A3s')).toBe(true);
    });

    it('excludes A9s and A2s', () => {
      expect(RFI_RANGES.UTG!.has('A9s')).toBe(false);
      expect(RFI_RANGES.UTG!.has('A2s')).toBe(false);
    });

    it('includes KQs-KTs, QJs-QTs, JTs', () => {
      expect(RFI_RANGES.UTG!.has('KQs')).toBe(true);
      expect(RFI_RANGES.UTG!.has('KTs')).toBe(true);
      expect(RFI_RANGES.UTG!.has('QJs')).toBe(true);
      expect(RFI_RANGES.UTG!.has('QTs')).toBe(true);
      expect(RFI_RANGES.UTG!.has('JTs')).toBe(true);
    });

    it('includes AKo-AJo, KQo', () => {
      expect(RFI_RANGES.UTG!.has('AKo')).toBe(true);
      expect(RFI_RANGES.UTG!.has('AQo')).toBe(true);
      expect(RFI_RANGES.UTG!.has('AJo')).toBe(true);
      expect(RFI_RANGES.UTG!.has('KQo')).toBe(true);
    });

    it('excludes ATo (not in UTG range)', () => {
      expect(RFI_RANGES.UTG!.has('ATo')).toBe(false);
    });
  });

  describe('cumulative ranges', () => {
    it('UTG+1 = UTG + A2s', () => {
      expect(RFI_RANGES['UTG+1']!.has('A2s')).toBe(true);
      // Should still have everything UTG has
      expect(RFI_RANGES['UTG+1']!.has('AA')).toBe(true);
      expect(RFI_RANGES['UTG+1']!.has('AKs')).toBe(true);
    });

    it('HJ includes small pairs 55-22', () => {
      expect(RFI_RANGES.HJ!.has('55')).toBe(true);
      expect(RFI_RANGES.HJ!.has('44')).toBe(true);
      expect(RFI_RANGES.HJ!.has('33')).toBe(true);
      expect(RFI_RANGES.HJ!.has('22')).toBe(true);
    });

    it('MP2 includes suited connectors', () => {
      expect(RFI_RANGES.MP2!.has('98s')).toBe(true);
      expect(RFI_RANGES.MP2!.has('87s')).toBe(true);
      expect(RFI_RANGES.MP2!.has('76s')).toBe(true);
      expect(RFI_RANGES.MP2!.has('65s')).toBe(true);
      expect(RFI_RANGES.MP2!.has('54s')).toBe(true);
    });

    it('CO adds A9o-A4o', () => {
      expect(RFI_RANGES.CO!.has('A9o')).toBe(true);
      expect(RFI_RANGES.CO!.has('A4o')).toBe(true);
      // But not A3o (BTN addition)
      expect(RFI_RANGES.CO!.has('A3o')).toBe(false);
    });

    it('BTN is much wider than CO', () => {
      expect(RFI_RANGES.BTN!.has('Q2s')).toBe(true);
      expect(RFI_RANGES.BTN!.has('J2s')).toBe(true);
      expect(RFI_RANGES.BTN!.has('72s')).toBe(true);
      expect(RFI_RANGES.BTN!.has('32s')).toBe(true);
      expect(RFI_RANGES.BTN!.has('54o')).toBe(true);
    });
  });
});

describe('SB_BLIND_WAR_RANGE', () => {
  it('is wider than BTN range', () => {
    expect(SB_BLIND_WAR_RANGE.size).toBeGreaterThan(RFI_RANGES.BTN!.size);
  });

  it('includes BTN range hands plus offsuit additions', () => {
    expect(SB_BLIND_WAR_RANGE.has('K2o')).toBe(true);
    expect(SB_BLIND_WAR_RANGE.has('Q2o')).toBe(true);
    expect(SB_BLIND_WAR_RANGE.has('32o')).toBe(true);
  });
});

describe('isSuitedHand', () => {
  it('returns true for suited hands', () => {
    expect(isSuitedHand('AKs')).toBe(true);
    expect(isSuitedHand('72s')).toBe(true);
  });

  it('returns false for offsuit hands', () => {
    expect(isSuitedHand('AKo')).toBe(false);
  });

  it('returns false for pairs', () => {
    expect(isSuitedHand('AA')).toBe(false);
    expect(isSuitedHand('22')).toBe(false);
  });
});

describe('allHandCombos', () => {
  it('returns exactly 169 combos', () => {
    expect(allHandCombos()).toHaveLength(169);
  });

  it('includes all combo types', () => {
    const combos = allHandCombos();
    expect(combos).toContain('AA');    // Pair
    expect(combos).toContain('AKs');   // Suited
    expect(combos).toContain('AKo');   // Offsuit
    expect(combos).toContain('22');    // Lowest pair
    expect(combos).toContain('32s');   // Lowest suited
    expect(combos).toContain('32o');   // Lowest offsuit
  });
});

describe('threeBetSize', () => {
  it('returns all-in below 17bb', () => {
    expect(threeBetSize(10, true)).toBe('all-in');
    expect(threeBetSize(16, false)).toBe('all-in');
  });

  it('returns correct IP sizes', () => {
    expect(threeBetSize(18, true)).toBe(2.5);
    expect(threeBetSize(25, true)).toBe(2.7);
    expect(threeBetSize(35, true)).toBe(3);
  });

  it('returns correct OOP sizes', () => {
    expect(threeBetSize(18, false)).toBe(3);
    expect(threeBetSize(25, false)).toBe(3.2);
    expect(threeBetSize(35, false)).toBe(3.5);
  });
});
