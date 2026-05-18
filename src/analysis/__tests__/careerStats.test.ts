import { describe, it, expect } from 'vitest';
import { 
  computeBustOutDistribution, 
  computeStakeEvolution, 
  estimateHourlyRate, 
  computeRakeAdjustedRoi 
} from '../careerStats';
import type { Tournament } from '../../types/hand';

const mockTournaments: Tournament[] = [
  {
    id: '1',
    buyIn: 10,
    fee: 1,
    format: 'MTT',
    finishPosition: 1,
    prize: 100,
    bounty: 0,
    handsPlayed: 75,
    startDate: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: '2',
    buyIn: 20,
    fee: 2,
    format: 'MTT',
    finishPosition: 50,
    prize: 0,
    bounty: 0,
    handsPlayed: 75,
    startDate: new Date('2024-01-02T10:00:00Z')
  }
];

describe('careerStats', () => {
  it('computeBustOutDistribution buckets finishes correctly', () => {
    const dist = computeBustOutDistribution(mockTournaments);
    expect(dist.find(b => b.label === 'Wins')?.count).toBe(1);
    expect(dist.find(b => b.label === 'Mid-Stage')?.count).toBe(1);
  });

  it('computeStakeEvolution tracks ABI progression', () => {
    const evo = computeStakeEvolution(mockTournaments);
    expect(evo).toHaveLength(2);
    expect(evo[0].abi).toBe(11); // (10+1)/1
    expect(evo[1].abi).toBe(16.5); // (11 + 22)/2
  });

  it('estimateHourlyRate calculates $/hr based on hands', () => {
    // 100 - 11 = 89 profit (T1)
    // 0 - 22 = -22 profit (T2)
    // Total profit = 67
    // Total hands = 150 -> 2 hours at 75 hands/hr
    // $/hr = 67 / 2 = 33.5
    const rate = estimateHourlyRate(mockTournaments);
    expect(rate).toBe(33.5);
  });

  it('computeRakeAdjustedRoi ignores fees', () => {
    // Revenue = 100
    // Buy-in only = 10 + 20 = 30
    // Technical Profit = 70
    // ROI = 70 / 30 * 100 = 233.33...
    const roi = computeRakeAdjustedRoi(mockTournaments);
    expect(roi).toBeCloseTo(233.33);
  });

  it('computeRakeAdjustedRoi excludes non-cash currencies from technical ROI', () => {
    const tournaments: Tournament[] = [
      { ...mockTournaments[0]!, bounty: 10, currency: 'USD' },
      { ...mockTournaments[1]!, currency: 'PLAY', prize: 1000, bounty: 1000 },
      { ...mockTournaments[1]!, id: '3', currency: 'TICKET', prize: 500, bounty: 50 },
    ];

    const roi = computeRakeAdjustedRoi(tournaments);

    // Cash revenue = 100 prize + 10 bounty; cash buy-in only = 10.
    expect(roi).toBeCloseTo(1000);
  });
});
