import { describe, it, expect } from 'vitest';
import {
  classifyVillain,
  computeVillainStats,
  emptyCounters,
  getExploitAdvice,
  isRecreational,
  isRegular,
} from '../villainClassifier';
import type { VillainStats, VillainRawCounters } from '../../types/villain';

function makeStats(overrides: Partial<VillainStats>): VillainStats {
  return {
    vpip: 25,
    pfr: 20,
    threeBetPct: 8,
    foldToThreeBet: 50,
    cbetFlop: 65,
    cbetTurn: 50,
    foldToCbet: 40,
    wtsd: 28,
    wsd: 55,
    af: 2.5,
    limpPct: 0,
    ...overrides,
  };
}

describe('classifyVillain', () => {
  it('returns null archetype with insufficient hands', () => {
    const stats = makeStats({});
    const result = classifyVillain(stats, 20);
    expect(result.archetype).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('classifies fish (VPIP-PFR > 15)', () => {
    // AF must be >= 1.5 to avoid calling_station classification
    const stats = makeStats({ vpip: 45, pfr: 10, af: 2.0 });
    const result = classifyVillain(stats, 50);
    expect(result.archetype).toBe('fish');
  });

  it('classifies nit (VPIP < 18, PFR < 14)', () => {
    const stats = makeStats({ vpip: 15, pfr: 12, af: 2.5 });
    const result = classifyVillain(stats, 100);
    expect(result.archetype).toBe('nit');
    expect(result.confidence).toBe('high');
  });

  it('classifies TAG (VPIP 20-28, PFR 18-25, AF > 2)', () => {
    const stats = makeStats({ vpip: 24, pfr: 20, af: 2.5 });
    const result = classifyVillain(stats, 150);
    expect(result.archetype).toBe('tag');
    expect(result.confidence).toBe('high');
  });

  it('classifies LAG (VPIP 28-40, PFR 24-35, AF > 3)', () => {
    const stats = makeStats({ vpip: 32, pfr: 28, af: 3.5 });
    const result = classifyVillain(stats, 80);
    expect(result.archetype).toBe('lag');
    expect(result.confidence).toBe('medium');
  });

  it('classifies calling station (VPIP > 35, AF < 1.5)', () => {
    const stats = makeStats({ vpip: 42, pfr: 8, af: 1.0 });
    // VPIP-PFR = 34 > 15, but calling_station check comes before fish
    // Actually calling_station is checked before fish in the code
    const result = classifyVillain(stats, 50);
    expect(result.archetype).toBe('calling_station');
  });

  it('classifies maniac (VPIP > 40, PFR > 30, AF > 4)', () => {
    const stats = makeStats({ vpip: 50, pfr: 35, af: 5.0 });
    const result = classifyVillain(stats, 50);
    expect(result.archetype).toBe('maniac');
  });

  it('returns null for unclassifiable stats', () => {
    // Stats that don't fit any archetype cleanly
    const stats = makeStats({ vpip: 30, pfr: 22, af: 1.8 });
    const result = classifyVillain(stats, 50);
    expect(result.archetype).toBeNull();
  });

  describe('confidence levels', () => {
    it('low confidence at 30-59 hands', () => {
      const stats = makeStats({ vpip: 15, pfr: 12, af: 2.5 });
      const result = classifyVillain(stats, 40);
      expect(result.confidence).toBe('low');
    });

    it('medium confidence at 60-99 hands', () => {
      const stats = makeStats({ vpip: 15, pfr: 12, af: 2.5 });
      const result = classifyVillain(stats, 75);
      expect(result.confidence).toBe('medium');
    });

    it('high confidence at 100+ hands', () => {
      const stats = makeStats({ vpip: 15, pfr: 12, af: 2.5 });
      const result = classifyVillain(stats, 200);
      expect(result.confidence).toBe('high');
    });
  });
});

describe('computeVillainStats', () => {
  it('computes percentages from raw counters', () => {
    const counters: VillainRawCounters = {
      ...emptyCounters(),
      totalHands: 100,
      vpipHands: 25,
      pfrHands: 20,
      threeBetOpps: 10,
      threeBetMade: 1,
      cbetFlopOpps: 15,
      cbetFlopMade: 10,
      totalBets: 20,
      totalRaises: 15,
      totalCalls: 10,
    };
    const stats = computeVillainStats(counters);
    expect(stats.vpip).toBe(25);
    expect(stats.pfr).toBe(20);
    expect(stats.threeBetPct).toBe(10);
    expect(stats.cbetFlop).toBeCloseTo(66.67, 0);
    expect(stats.af).toBe(3.5); // (20+15)/10
  });

  it('handles zero denominators', () => {
    const counters = emptyCounters();
    const stats = computeVillainStats(counters);
    expect(stats.vpip).toBe(0);
    expect(stats.pfr).toBe(0);
    expect(stats.af).toBe(0);
  });

  it('handles infinite AF (no calls)', () => {
    const counters: VillainRawCounters = {
      ...emptyCounters(),
      totalHands: 50,
      totalBets: 10,
      totalRaises: 5,
      totalCalls: 0,
    };
    const stats = computeVillainStats(counters);
    expect(stats.af).toBe(99); // Capped approximation
  });
});

describe('emptyCounters', () => {
  it('returns all zeros', () => {
    const c = emptyCounters();
    expect(c.totalHands).toBe(0);
    expect(c.vpipHands).toBe(0);
    expect(c.totalBets).toBe(0);
  });
});

describe('getExploitAdvice', () => {
  it('returns advice for each archetype', () => {
    expect(getExploitAdvice('fish')).toContain('bluff less');
    expect(getExploitAdvice('nit')).toContain('Steal wide');
    expect(getExploitAdvice('tag')).toContain('Respect');
    expect(getExploitAdvice('lag')).toContain('Call down');
    expect(getExploitAdvice('calling_station')).toContain('Never bluff');
    expect(getExploitAdvice('maniac')).toContain('hang themselves');
  });
});

describe('population filters', () => {
  it('isRecreational: VPIP-PFR > 15', () => {
    expect(isRecreational(makeStats({ vpip: 40, pfr: 10 }))).toBe(true);
    expect(isRecreational(makeStats({ vpip: 25, pfr: 20 }))).toBe(false);
  });

  it('isRegular: VPIP < 35, VPIP-PFR < 10', () => {
    expect(isRegular(makeStats({ vpip: 24, pfr: 20 }))).toBe(true);
    expect(isRegular(makeStats({ vpip: 40, pfr: 10 }))).toBe(false);
  });
});
