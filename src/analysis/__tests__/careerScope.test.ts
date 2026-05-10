import { describe, expect, it } from 'vitest';
import { buildCareerScopeProfile } from '../careerScope';
import type { Tournament } from '../../types/hand';

function tournament(index: number, overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: `t-${index}`,
    name: `Tournament ${index}`,
    startDate: new Date(2026, 0, index),
    buyIn: 10,
    fee: 1,
    format: 'MTT',
    finishPosition: null,
    prize: 0,
    bounty: 0,
    handsPlayed: 25,
    ...overrides,
  };
}

describe('buildCareerScopeProfile', () => {
  it('computes SharkScope-style profitability, average ROI, and activity metrics from local tournaments', () => {
    const profile = buildCareerScopeProfile([
      tournament(1, { prize: 33, finishPosition: 1 }), // +22, 200% ROI
      tournament(1, { id: 't-1b', prize: 0 }), // -11, -100% ROI, same active day
      tournament(3, { buyIn: 20, fee: 2, prize: 0 }), // -22, -100% ROI
    ]);

    expect(profile.totalTournaments).toBe(3);
    expect(profile.activeDays).toBe(2);
    expect(profile.gamesPerActiveDay).toBe(1.5);
    expect(profile.mostGamesInDay).toBe(2);
    expect(profile.totalStake).toBe(40);
    expect(profile.totalRake).toBe(4);
    expect(profile.totalCashes).toBe(33);
    expect(profile.totalProfit).toBe(-11);
    expect(profile.totalRoi).toBeCloseTo(-25);
    expect(profile.averageRoi).toBeCloseTo(0); // (200 - 100 - 100) / 3
    expect(profile.itmRate).toBeCloseTo(33.333, 2);
    expect(profile.wins).toBe(1);
  });

  it('tracks cashing/losing streaks and daily form', () => {
    const profile = buildCareerScopeProfile([
      tournament(1, { prize: 0 }),
      tournament(2, { prize: 0 }),
      tournament(3, { prize: 22, finishPosition: 2 }),
      tournament(4, { prize: 35, finishPosition: 1 }),
      tournament(5, { prize: 0 }),
    ]);

    expect(profile.maxLosingStreak).toBe(2);
    expect(profile.maxCashingStreak).toBe(2);
    expect(profile.winningDays).toBe(2);
    expect(profile.losingDays).toBe(3);
    expect(profile.breakEvenDays).toBe(0);
    expect(profile.formLabel).toBe('Insufficient Sample');
  });

  it('returns a bounded ability estimate that improves with ROI, sample, ITM, wins, and positive trend', () => {
    const losing = buildCareerScopeProfile(Array.from({ length: 30 }, (_, i) => tournament(i + 1, { prize: i % 10 === 0 ? 12 : 0 })));
    const winning = buildCareerScopeProfile(Array.from({ length: 80 }, (_, i) => tournament(i + 1, {
      prize: i % 3 === 0 ? 42 : 0,
      finishPosition: i % 18 === 0 ? 1 : (i % 3 === 0 ? 5 : null),
    })));

    expect(losing.abilityRating).toBeGreaterThanOrEqual(0);
    expect(winning.abilityRating).toBeLessThanOrEqual(100);
    expect(winning.abilityRating).toBeGreaterThan(losing.abilityRating);
    expect(winning.formLabel).toMatch(/Hot|Uptrend|Stable/);
  });

  it('ignores play-money and ticket tournaments for cash stake/profit metrics', () => {
    const profile = buildCareerScopeProfile([
      tournament(1, { currency: 'PLAY', buyIn: 1000, fee: 0, prize: 5000 }),
      tournament(2, { currency: 'TICKET', buyIn: 50, fee: 0, prize: 100 }),
      tournament(3, { buyIn: 5, fee: 0.5, prize: 12 }),
    ]);

    expect(profile.totalTournaments).toBe(3);
    expect(profile.totalStake).toBe(5);
    expect(profile.totalRake).toBe(0.5);
    expect(profile.totalCashes).toBe(12);
    expect(profile.totalProfit).toBe(6.5);
  });
});
