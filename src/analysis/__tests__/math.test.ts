import { describe, it, expect } from 'vitest';
import { calculateMDF, calculateAlpha, calculatePotOdds, getRecommendedCbetSizing } from '../math';

describe('poker math utilities', () => {
  describe('calculateMDF', () => {
    it('returns 1 if pot and bet are zero', () => {
      expect(calculateMDF(0, 0)).toBe(1);
    });

    it('calculates Minimal Defending Frequency correctly', () => {
      // Pot = 10, Bet = 5 -> MDF = 10 / 15 = 2/3
      expect(calculateMDF(10, 5)).toBeCloseTo(0.6667, 4);
      // Pot = 100, Bet = 100 -> MDF = 100 / 200 = 0.5
      expect(calculateMDF(100, 100)).toBe(0.5);
      // Pot = 0, Bet = 10 -> MDF = 0 / 10 = 0
      expect(calculateMDF(0, 10)).toBe(0);
    });
  });

  describe('calculateAlpha', () => {
    it('returns 0 if pot and bet are zero', () => {
      expect(calculateAlpha(0, 0)).toBe(0);
    });

    it('calculates Alpha (required fold equity) correctly', () => {
      // Pot = 10, Bet = 5 -> Alpha = 5 / 15 = 1/3
      expect(calculateAlpha(10, 5)).toBeCloseTo(0.3333, 4);
      // Pot = 100, Bet = 100 -> Alpha = 100 / 200 = 0.5
      expect(calculateAlpha(100, 100)).toBe(0.5);
      // Pot = 50, Bet = 0 -> Alpha = 0
      expect(calculateAlpha(50, 0)).toBe(0);
    });
  });

  describe('calculatePotOdds', () => {
    it('returns 0 if totalPot and callAmount are zero', () => {
      expect(calculatePotOdds(0, 0)).toBe(0);
    });

    it('calculates Pot Odds (required call equity) correctly', () => {
      // TotalPot = 15, CallAmount = 5 -> Odds = 5 / 20 = 25%
      expect(calculatePotOdds(15, 5)).toBe(0.25);
      // TotalPot = 100, CallAmount = 50 -> Odds = 50 / 150 = 1/3
      expect(calculatePotOdds(100, 50)).toBeCloseTo(0.3333, 4);
      // TotalPot = 100, CallAmount = 0 -> Odds = 0
      expect(calculatePotOdds(100, 0)).toBe(0);
    });
  });

  describe('getRecommendedCbetSizing', () => {
    it('returns correct sizing for high_dry board texture', () => {
      expect(getRecommendedCbetSizing('high_dry')).toEqual({
        minSizing: 0.20,
        maxSizing: 0.35,
        label: 'Small (25-33%)'
      });
    });

    it('returns correct sizing for wet_broadway board texture', () => {
      expect(getRecommendedCbetSizing('wet_broadway')).toEqual({
        minSizing: 0.50,
        maxSizing: 0.80,
        label: 'Large (50-75%)'
      });
    });

    it('returns correct sizing for low_connected board texture', () => {
      expect(getRecommendedCbetSizing('low_connected')).toEqual({
        minSizing: 0.20,
        maxSizing: 0.33,
        label: 'Small or Check'
      });
    });

    it('returns correct sizing for paired_low board texture', () => {
      expect(getRecommendedCbetSizing('paired_low')).toEqual({
        minSizing: 0.20,
        maxSizing: 0.30,
        label: 'Small (25%)'
      });
    });

    it('returns correct sizing for monotone_low board texture', () => {
      expect(getRecommendedCbetSizing('monotone_low')).toEqual({
        minSizing: 0.0,
        maxSizing: 0.33,
        label: 'Check or Small'
      });
    });

    it('returns default medium sizing for unknown board texture', () => {
      expect(getRecommendedCbetSizing('unknown_texture')).toEqual({
        minSizing: 0.25,
        maxSizing: 0.50,
        label: 'Medium (33-50%)'
      });
    });
  });
});
