import type { Tournament } from '../types/hand';
import { getTournamentNet, getTournamentCost } from './financials';

export interface BustOutBucket {
  label: string;
  count: number;
  color: string;
}

export interface StakePoint {
  date: string;
  abi: number;
}

export function computeBustOutDistribution(tournaments: Tournament[]): BustOutBucket[] {
  const buckets = {
    Win: { label: 'Wins', count: 0, color: '#fbbf24' }, // amber-400
    FT: { label: 'Final Table', count: 0, color: '#f59e0b' }, // amber-500
    Deep: { label: 'Deep Run', count: 0, color: '#10b981' }, // emerald-500
    Mid: { label: 'Mid-Stage', count: 0, color: '#3b82f6' }, // blue-500
    Early: { label: 'Early Exit', count: 0, color: '#ef4444' }, // red-500
  };

  tournaments.forEach(t => {
    const pos = t.finishPosition;
    if (!pos) return;

    if (pos === 1) {
      buckets.Win.count++;
    } else if (pos <= 9) {
      buckets.FT.count++;
    } else if (pos <= 45) {
      buckets.Deep.count++;
    } else if (pos <= 150) {
      buckets.Mid.count++;
    } else {
      buckets.Early.count++;
    }
  });

  return Object.values(buckets).filter(b => b.count > 0);
}

export function computeStakeEvolution(tournaments: Tournament[]): StakePoint[] {
  const sorted = [...tournaments]
    .filter(t => t.startDate)
    .sort((a, b) => (a.startDate!.getTime() - b.startDate!.getTime()));
  
  if (sorted.length === 0) return [];

  const windowSize = 20;
  return sorted.map((t, i) => {
    const window = sorted.slice(Math.max(0, i - windowSize + 1), i + 1);
    const totalCost = window.reduce((sum, curr) => sum + getTournamentCost(curr), 0);
    const avgBuyIn = totalCost / window.length;
    
    return {
      date: t.startDate!.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      abi: Number(avgBuyIn.toFixed(2))
    };
  });
}

export function estimateHourlyRate(tournaments: Tournament[]): number {
  const totalProfit = tournaments.reduce((sum, t) => sum + getTournamentNet(t), 0);
  const totalHands = tournaments.reduce((sum, t) => sum + (t.handsPlayed || 0), 0);
  
  if (totalHands === 0) return 0;
  
  // Assume average of 75 hands per hour (MTT standard)
  const estimatedHours = totalHands / 75;
  return totalProfit / estimatedHours;
}

export function computeRakeAdjustedRoi(tournaments: Tournament[]): number {
  const cashTournaments = tournaments.filter(t => t.buyIn > 0);
  if (cashTournaments.length === 0) return 0;

  const totalBuyInOnly = cashTournaments.reduce((sum, t) => sum + (t.buyIn || 0), 0);
  const totalRevenue = cashTournaments.reduce((sum, t) => sum + ((t.prize || 0) + (t.bounty || 0)), 0);
  const totalTechnicalProfit = totalRevenue - totalBuyInOnly;
  
  return totalBuyInOnly > 0 ? (totalTechnicalProfit / totalBuyInOnly) * 100 : 0;
}
