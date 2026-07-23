import { describe, it, expect } from 'vitest';
import {
  classifyTournamentFormat,
  computeFormatBreakdown,
  computeCareerStreaks,
  computeBustOutDistribution,
  computeLifetimeRoi,
  estimateHourlyRate,
  ASSUMED_HANDS_PER_HOUR,
} from '../careerStats';
import { buildCareerCoachReport } from '../careerCoach';
import { buildCareerScopeProfile } from '../careerScope';
import type { Tournament } from '../../types/hand';

function makeTourney(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 't', name: '', buyIn: 10, fee: 1, format: '9-Max',
    finishPosition: null, prize: 0, bounty: 0, handsPlayed: 0,
    currency: 'USD', ...overrides,
  } as Tournament;
}

describe('careerStats helpers', () => {
  describe('classifyTournamentFormat', () => {
    it('correctly classifies Spin & Go', () => {
      const t1: Tournament = { id: '1', name: 'Spin & Go $10', buyIn: 10, fee: 0, format: '3-Max', finishPosition: 2, prize: 0, bounty: 0, handsPlayed: 10 };
      const t2: Tournament = { id: '2', name: 'Expresso $2', buyIn: 2, fee: 0, format: 'Spin', finishPosition: 1, prize: 4, bounty: 0, handsPlayed: 8 };
      expect(classifyTournamentFormat(t1)).toBe('Spin & Go');
      expect(classifyTournamentFormat(t2)).toBe('Spin & Go');
    });

    it('correctly classifies Heads Up', () => {
      const t: Tournament = { id: '3', name: '$5 HU Hyper', buyIn: 5, fee: 0, format: 'Heads Up', finishPosition: 1, prize: 10, bounty: 0, handsPlayed: 20 };
      expect(classifyTournamentFormat(t)).toBe('Heads Up');
    });

    it('correctly classifies Sit & Go', () => {
      const t: Tournament = { id: '4', name: '$1.50 9-Max SNG', buyIn: 1.5, fee: 0.1, format: 'SNG', finishPosition: 4, prize: 0, bounty: 0, handsPlayed: 35 };
      expect(classifyTournamentFormat(t)).toBe('Sit & Go');
    });

    it('defaults to MTT', () => {
      const t: Tournament = { id: '5', name: 'The Big $11', buyIn: 10, fee: 1, format: 'MTT', finishPosition: 85, prize: 0, bounty: 0, handsPlayed: 120 };
      expect(classifyTournamentFormat(t)).toBe('MTT');
    });
  });

  describe('computeFormatBreakdown', () => {
    it('groups statistics by format', () => {
      const tourns: Tournament[] = [
        { id: '1', name: 'Spin & Go $10', buyIn: 10, fee: 0, format: '3-Max', finishPosition: 2, prize: 0, bounty: 0, handsPlayed: 10 },
        { id: '2', name: 'Spin & Go $10', buyIn: 10, fee: 0, format: '3-Max', finishPosition: 1, prize: 30, bounty: 0, handsPlayed: 12 },
        { id: '3', name: 'The Big $11', buyIn: 10, fee: 1, format: 'MTT', finishPosition: 85, prize: 0, bounty: 0, handsPlayed: 120 }
      ];

      const breakdown = computeFormatBreakdown(tourns);
      expect(breakdown).toHaveLength(2); // Spin & Go, MTT

      const spin = breakdown.find(b => b.format === 'Spin & Go')!;
      expect(spin.count).toBe(2);
      expect(spin.itmRate).toBe(50);
      expect(spin.profit).toBe(10); // 30 - 20
      expect(spin.roi).toBe(50); // 10 / 20 * 100

      const mtt = breakdown.find(b => b.format === 'MTT')!;
      expect(mtt.count).toBe(1);
      expect(mtt.itmRate).toBe(0);
      expect(mtt.profit).toBe(-11);
    });
  });

  describe('computeCareerStreaks', () => {
    it('handles empty tournament list', () => {
      const streaks = computeCareerStreaks([]);
      expect(streaks.currentItmStreak).toBe(0);
      expect(streaks.longestItmStreak).toBe(0);
    });

    it('calculates ITM and Win streaks', () => {
      const tourns: Tournament[] = [
        { id: '1', buyIn: 10, fee: 0, format: '', finishPosition: 5, prize: 20, bounty: 0, handsPlayed: 10, startDate: new Date('2026-05-01') },
        { id: '2', buyIn: 10, fee: 0, format: '', finishPosition: 1, prize: 100, bounty: 0, handsPlayed: 10, startDate: new Date('2026-05-02') },
        { id: '3', buyIn: 10, fee: 0, format: '', finishPosition: 1, prize: 100, bounty: 0, handsPlayed: 10, startDate: new Date('2026-05-03') },
        { id: '4', buyIn: 10, fee: 0, format: '', finishPosition: 15, prize: 0, bounty: 0, handsPlayed: 10, startDate: new Date('2026-05-04') },
        { id: '5', buyIn: 10, fee: 0, format: '', finishPosition: 8, prize: 25, bounty: 0, handsPlayed: 10, startDate: new Date('2026-05-05') },
        { id: '6', buyIn: 10, fee: 0, format: '', finishPosition: 1, prize: 100, bounty: 0, handsPlayed: 10, startDate: new Date('2026-05-06') }
      ];

      const streaks = computeCareerStreaks(tourns);
      expect(streaks.currentItmStreak).toBe(2); // tourns 5 and 6 are ITM
      expect(streaks.longestItmStreak).toBe(3); // tourns 1, 2, 3
      expect(streaks.currentWinStreak).toBe(1); // tourn 6 is a win
      expect(streaks.longestWinStreak).toBe(2); // tourns 2 and 3
      expect(streaks.longestCashlessStreak).toBe(1); // only tourn 4 was cashless
    });
  });

  describe('computeBustOutDistribution', () => {
    it('uses mutually exclusive position bands with one recorded-finish denominator', () => {
      const positions = [1, 2, 9, 10, 45, 46, 150, 151];
      const tournaments = positions.map((finishPosition, index) => makeTourney({
        id: `finish-${index}`,
        finishPosition,
      }));

      // Results without a valid recorded finish are excluded from the stated
      // denominator instead of being silently assigned to a finish band.
      tournaments.push(
        makeTourney({ id: 'missing', finishPosition: null }),
        makeTourney({ id: 'invalid-zero', finishPosition: 0 }),
        makeTourney({ id: 'invalid-fraction', finishPosition: 1.5 }),
      );

      const distribution = computeBustOutDistribution(tournaments);

      expect(distribution.map(({ rangeLabel, count }) => ({ rangeLabel, count }))).toEqual([
        { rangeLabel: '1st', count: 1 },
        { rangeLabel: '2nd–9th', count: 2 },
        { rangeLabel: '10th–45th', count: 2 },
        { rangeLabel: '46th–150th', count: 2 },
        { rangeLabel: '151st+', count: 1 },
      ]);
      expect(distribution.every((bucket) => bucket.denominator === 8)).toBe(true);
      expect(distribution.map((bucket) => bucket.percentage)).toEqual([12.5, 25, 25, 25, 12.5]);
      expect(distribution.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(8);
      expect(distribution.reduce((sum, bucket) => sum + bucket.percentage, 0)).toBe(100);
    });

    it('keeps zero-count bands visible so every chart uses the same definitions', () => {
      const distribution = computeBustOutDistribution([
        makeTourney({ finishPosition: 1 }),
      ]);

      expect(distribution).toHaveLength(5);
      expect(distribution.map((bucket) => bucket.count)).toEqual([1, 0, 0, 0, 0]);
    });

    it('returns no distribution when no valid finish position was recorded', () => {
      expect(computeBustOutDistribution([
        makeTourney({ finishPosition: null }),
        makeTourney({ finishPosition: 0 }),
      ])).toEqual([]);
    });
  });

  describe('computeLifetimeRoi (A5)', () => {
    it('uses full entry cost (buy-in + fee) as the basis', () => {
      // One $10+$1 entry that returned $100: net = 100 - 11 = 89, cost = 11.
      // ROI = 89/11 ~= 809.1%. The old buy-in-only formula gave 900%.
      const roi = computeLifetimeRoi([makeTourney({ buyIn: 10, fee: 1, prize: 100 })]);
      expect(roi).toBeCloseTo((89 / 11) * 100, 5);
      expect(roi).toBeLessThan(900); // not the inflated buy-in-only figure
    });

    it('returns -100% when every cash entry busts', () => {
      const roi = computeLifetimeRoi([
        makeTourney({ buyIn: 10, fee: 1, prize: 0 }),
        makeTourney({ buyIn: 20, fee: 2, prize: 0 }),
      ]);
      expect(roi).toBeCloseTo(-100, 5);
    });

    it('ignores play-money tournaments and returns 0 with no cash entries', () => {
      expect(computeLifetimeRoi([makeTourney({ currency: 'PLAY', prize: 999 })])).toBe(0);
      expect(computeLifetimeRoi([])).toBe(0);
    });
  });

  describe('cash freeroll ROI consistency (buyIn=0, prize>0)', () => {
    // A cash-currency freeroll (no buy-in) plus one busted $10+$1 entry. The
    // freeroll costs exactly $0, so in the pooled ratio it only adds its $5
    // prize to totalNet without touching the denominator: totalNet -6 over
    // totalCost 11 = -54.55%. The prize is never discarded.
    const freeroll = makeTourney({ id: 'fr', buyIn: 0, fee: 0, prize: 5, finishPosition: 1, startDate: new Date('2026-05-01') });
    const cashBust = makeTourney({ id: 'cb', buyIn: 10, fee: 1, prize: 0, startDate: new Date('2026-05-02') });
    const portfolio = [freeroll, cashBust];

    it('includes the freeroll prize in lifetime ROI', () => {
      expect(computeLifetimeRoi(portfolio)).toBeCloseTo((-6 / 11) * 100, 5);
    });

    it('agrees across lifetime, coach, and scope ROI', () => {
      const lifetime = computeLifetimeRoi(portfolio);
      const coach = buildCareerCoachReport(portfolio, [], []);
      const scope = buildCareerScopeProfile(portfolio);

      expect(lifetime).toBeCloseTo((-6 / 11) * 100, 5);
      expect(coach.roi).toBeCloseTo(lifetime, 5);
      expect(scope.totalRoi).toBeCloseTo(lifetime, 5);

      // The freeroll prize lands in net profit as well.
      expect(coach.trackedProfit).toBeCloseTo(-6, 5);
      expect(scope.totalProfit).toBeCloseTo(-6, 5);
    });
  });

  describe('estimateHourlyRate (A5)', () => {
    it('uses the assumed hands-per-hour constant', () => {
      // net = 100 - 11 = 89 over ASSUMED_HANDS_PER_HOUR hands = 1 hour.
      const rate = estimateHourlyRate([
        makeTourney({ buyIn: 10, fee: 1, prize: 100, handsPlayed: ASSUMED_HANDS_PER_HOUR }),
      ]);
      expect(rate).toBeCloseTo(89, 5);
    });

    it('returns 0 when no hands were played', () => {
      expect(estimateHourlyRate([makeTourney({ handsPlayed: 0 })])).toBe(0);
    });
  });
});
