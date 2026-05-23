import { describe, it, expect } from 'vitest';
import {
  classifyTournamentFormat,
  computeFormatBreakdown,
  computeCareerStreaks
} from '../careerStats';
import type { Tournament } from '../../types/hand';

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
});
