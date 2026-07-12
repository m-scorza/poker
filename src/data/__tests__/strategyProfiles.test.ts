import { describe, it, expect } from 'vitest';
import {
  getThresholds,
  getCbetRule,
  advancedThreeBetSize,
  BB_DEFENSE_ICM_ADJUSTMENTS,
} from '../strategyProfiles';

describe('strategyProfiles', () => {
  describe('getThresholds()', () => {
    it('returns exact Game Plan profile leak thresholds', () => {
      const thresholds = getThresholds('game_plan');
      expect(thresholds).toEqual({
        vpip: { min: 20, max: 30 },
        pfr: { min: 15, max: 23 },
        threeBetPct: null,
        cbetTotal: { min: 60, max: 70 },
        cbetHU: { min: 100, max: 100 },
        foldToCbet: null,
        wtsd: { min: 25, max: 35 },
        wonSD: { min: 50, max: 100 },
        af: { min: 2, max: 3 },
        vpipPfrGap: null,
        rangeCompliance: { min: 90 },
        limpPct: { max: 0 },
      });
    });

    it('returns exact Advanced profile leak thresholds', () => {
      const thresholds = getThresholds('advanced');
      expect(thresholds).toEqual({
        vpip: { min: 20, max: 28 },
        pfr: { min: 18, max: 25 },
        threeBetPct: { min: 7, max: 10 },
        cbetTotal: { min: 50, max: 60 },
        cbetHU: { min: 80, max: 100 },
        foldToCbet: { min: 35, max: 45 },
        wtsd: { min: 25, max: 30 },
        wonSD: { min: 50, max: 100 },
        af: { min: 2, max: 3 },
        vpipPfrGap: { max: 10 },
        rangeCompliance: { min: 90 },
        limpPct: { max: 0 },
      });
    });
  });

  describe('getCbetRule()', () => {
    describe('Game Plan c-bet rule', () => {
      it('returns profile as game_plan', () => {
        const rule = getCbetRule('game_plan');
        expect(rule.profile).toBe('game_plan');
      });

      it('recommends c-betting only when hero is PFR, HU, and in position', () => {
        const rule = getCbetRule('game_plan');
        expect(
          rule.shouldCbet({
            boardTexture: 'neutral',
            isInPosition: true,
            isHU: true,
            heroIsPFR: true,
            bbHasNutsAdvantage: false,
            hasRangeAdvantage: false,
          })
        ).toBe(true);

        expect(
          rule.shouldCbet({
            boardTexture: 'neutral',
            isInPosition: false,
            isHU: true,
            heroIsPFR: true,
            bbHasNutsAdvantage: false,
            hasRangeAdvantage: false,
          })
        ).toBe(false);

        expect(
          rule.shouldCbet({
            boardTexture: 'neutral',
            isInPosition: true,
            isHU: false,
            heroIsPFR: true,
            bbHasNutsAdvantage: false,
            hasRangeAdvantage: false,
          })
        ).toBe(false);

        expect(
          rule.shouldCbet({
            boardTexture: 'neutral',
            isInPosition: true,
            isHU: true,
            heroIsPFR: false,
            bbHasNutsAdvantage: false,
            hasRangeAdvantage: false,
          })
        ).toBe(false);
      });

      it('always recommends 0.33 sizing regardless of context', () => {
        const rule = getCbetRule('game_plan');
        expect(
          rule.recommendedSizing({
            boardTexture: 'wet_broadway',
            isInPosition: true,
            isHU: true,
            heroIsPFR: true,
            bbHasNutsAdvantage: false,
            hasRangeAdvantage: false,
          })
        ).toBe(0.33);
      });
    });

    describe('Advanced c-bet rule', () => {
      it('returns profile as advanced', () => {
        const rule = getCbetRule('advanced');
        expect(rule.profile).toBe('advanced');
      });

      it('requires hero to be PFR and flop to be heads-up to c-bet', () => {
        const rule = getCbetRule('advanced');
        expect(
          rule.shouldCbet({
            boardTexture: 'high_dry',
            isInPosition: true,
            isHU: true,
            heroIsPFR: false,
            bbHasNutsAdvantage: false,
            hasRangeAdvantage: true,
          })
        ).toBe(false);

        expect(
          rule.shouldCbet({
            boardTexture: 'high_dry',
            isInPosition: true,
            isHU: false,
            heroIsPFR: true,
            bbHasNutsAdvantage: false,
            hasRangeAdvantage: true,
          })
        ).toBe(false);
      });

      it('evaluates board textures and advantages correctly', () => {
        const rule = getCbetRule('advanced');
        const baseCtx = {
          isInPosition: true,
          isHU: true,
          heroIsPFR: true,
          bbHasNutsAdvantage: false,
          hasRangeAdvantage: false,
        };

        expect(rule.shouldCbet({ ...baseCtx, boardTexture: 'high_dry' })).toBe(true);
        expect(rule.shouldCbet({ ...baseCtx, boardTexture: 'wet_broadway' })).toBe(true);
        expect(rule.shouldCbet({ ...baseCtx, boardTexture: 'low_connected' })).toBe(false);

        expect(
          rule.shouldCbet({
            ...baseCtx,
            boardTexture: 'paired_low',
            bbHasNutsAdvantage: true,
            hasRangeAdvantage: true,
          })
        ).toBe(false);

        expect(
          rule.shouldCbet({
            ...baseCtx,
            boardTexture: 'paired_low',
            bbHasNutsAdvantage: false,
            hasRangeAdvantage: true,
          })
        ).toBe(true);

        expect(rule.shouldCbet({ ...baseCtx, boardTexture: 'monotone_low' })).toBe(false);
        expect(rule.shouldCbet({ ...baseCtx, boardTexture: 'monotone_high' })).toBe(false);

        expect(
          rule.shouldCbet({
            ...baseCtx,
            boardTexture: 'neutral',
            hasRangeAdvantage: true,
          })
        ).toBe(true);

        expect(
          rule.shouldCbet({
            ...baseCtx,
            boardTexture: 'neutral',
            hasRangeAdvantage: false,
          })
        ).toBe(false);
      });

      it('recommends sizing based on board texture', () => {
        const rule = getCbetRule('advanced');
        const baseCtx = {
          isInPosition: true,
          isHU: true,
          heroIsPFR: true,
          bbHasNutsAdvantage: false,
          hasRangeAdvantage: true,
        };

        expect(rule.recommendedSizing({ ...baseCtx, boardTexture: 'wet_broadway' })).toBe(0.66);
        expect(rule.recommendedSizing({ ...baseCtx, boardTexture: 'paired_low' })).toBe(0.25);
        expect(rule.recommendedSizing({ ...baseCtx, boardTexture: 'high_dry' })).toBe(0.33);
        expect(rule.recommendedSizing({ ...baseCtx, boardTexture: 'neutral' })).toBe(0.33);
      });
    });
  });

  describe('advancedThreeBetSize() boundary characterization', () => {
    it('handles boundary around 17 BB cutoff', () => {
      // 1 BB below 17
      expect(advancedThreeBetSize(16, true)).toBe('all-in');
      expect(advancedThreeBetSize(16, false)).toBe('all-in');
      // Exactly at 17
      expect(advancedThreeBetSize(17, true)).toBe(2.5);
      expect(advancedThreeBetSize(17, false)).toBe(3);
      // 1 BB above 17
      expect(advancedThreeBetSize(18, true)).toBe(2.5);
      expect(advancedThreeBetSize(18, false)).toBe(3);
    });

    it('handles boundary around 20 BB cutoff', () => {
      // 1 BB below 20
      expect(advancedThreeBetSize(19, true)).toBe(2.5);
      expect(advancedThreeBetSize(19, false)).toBe(3);
      // Exactly at 20
      expect(advancedThreeBetSize(20, true)).toBe(2.7);
      expect(advancedThreeBetSize(20, false)).toBe(3.2);
      // 1 BB above 20
      expect(advancedThreeBetSize(21, true)).toBe(2.7);
      expect(advancedThreeBetSize(21, false)).toBe(3.2);
    });

    it('handles boundary around 30 BB cutoff', () => {
      // 1 BB below 30
      expect(advancedThreeBetSize(29, true)).toBe(2.7);
      expect(advancedThreeBetSize(29, false)).toBe(3.2);
      // Exactly at 30
      expect(advancedThreeBetSize(30, true)).toBe(3);
      expect(advancedThreeBetSize(30, false)).toBe(3.5);
      // 1 BB above 30
      expect(advancedThreeBetSize(31, true)).toBe(3);
      expect(advancedThreeBetSize(31, false)).toBe(3.5);
    });

    it('handles boundary around 50 BB cutoff', () => {
      // 1 BB below 50
      expect(advancedThreeBetSize(49, true)).toBe(3);
      expect(advancedThreeBetSize(49, false)).toBe(3.5);
      // Exactly at 50
      expect(advancedThreeBetSize(50, true)).toBe(3.25);
      expect(advancedThreeBetSize(50, false)).toBe(3.75);
      // 1 BB above 50
      expect(advancedThreeBetSize(51, true)).toBe(3.25);
      expect(advancedThreeBetSize(51, false)).toBe(3.75);
    });

    it('handles boundary around 100 BB cutoff', () => {
      // 1 BB below 100
      expect(advancedThreeBetSize(99, true)).toBe(3.25);
      expect(advancedThreeBetSize(99, false)).toBe(3.75);
      // Exactly at 100
      expect(advancedThreeBetSize(100, true)).toBe(4);
      expect(advancedThreeBetSize(100, false)).toBe(5);
      // 1 BB above 100
      expect(advancedThreeBetSize(101, true)).toBe(4);
      expect(advancedThreeBetSize(101, false)).toBe(5);
    });
  });

  describe('BB_DEFENSE_ICM_ADJUSTMENTS', () => {
    it('pins exact ICM adjustments table for all stages', () => {
      expect(BB_DEFENSE_ICM_ADJUSTMENTS).toEqual({
        early: { foldSuitedAcceptable: false, approxFoldPct: 0 },
        mid: { foldSuitedAcceptable: false, approxFoldPct: 5 },
        bubble: { foldSuitedAcceptable: true, approxFoldPct: 40 },
        itm: { foldSuitedAcceptable: true, approxFoldPct: 30 },
        final_table: { foldSuitedAcceptable: true, approxFoldPct: 50 },
      });
    });
  });
});
