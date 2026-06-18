import type { Tournament } from '../types/hand';
import { getTournamentNet, getTournamentCost, getTournamentRevenue, isCashTournamentCurrency, hasTournamentCash } from './financials';
import { sumUsd } from '../parser/money';

export interface BustOutBucket {
  label: string;
  count: number;
  color: string;
}

export interface StakePoint {
  date: string;
  abi: number;
}

export interface CareerStreaks {
  currentItmStreak: number;
  longestItmStreak: number;
  currentWinStreak: number;
  longestWinStreak: number;
  longestCashlessStreak: number;
}

export interface FormatBreakdown {
  format: string;
  count: number;
  itmRate: number;
  roi: number;
  buyIns: number;
  prizes: number;
  profit: number;
  avgBuyIn: number;
}

export function classifyTournamentFormat(t: Tournament): 'MTT' | 'Sit & Go' | 'Spin & Go' | 'Heads Up' {
  const name = (t.name || '').toLowerCase();
  const format = (t.format || '').toLowerCase();
  
  if (
    name.includes('spin & go') ||
    name.includes('spin&go') ||
    name.includes('spin') ||
    name.includes('expresso') ||
    name.includes('twister') ||
    format.includes('spin') ||
    format.includes('3-max')
  ) {
    return 'Spin & Go';
  }

  if (
    name.includes('heads up') ||
    name.includes('heads-up') ||
    name.includes(' hu ') ||
    name.endsWith(' hu') ||
    format.includes('heads up') ||
    format.includes('hu')
  ) {
    return 'Heads Up';
  }

  if (
    name.includes('sit & go') ||
    name.includes('sit&go') ||
    name.includes('sng') ||
    format.includes('sit & go') ||
    format.includes('sng')
  ) {
    return 'Sit & Go';
  }

  return 'MTT';
}

export function computeFormatBreakdown(tournaments: Tournament[]): FormatBreakdown[] {
  const breakdownMap = new Map<string, {
    count: number;
    cashes: number;
    buyIns: number;
    prizes: number;
    profit: number;
  }>();

  const formats = ['MTT', 'Sit & Go', 'Spin & Go', 'Heads Up'];
  formats.forEach(f => {
    breakdownMap.set(f, { count: 0, cashes: 0, buyIns: 0, prizes: 0, profit: 0 });
  });

  tournaments.forEach(t => {
    const fmt = classifyTournamentFormat(t);
    const cost = getTournamentCost(t);
    const revenue = getTournamentRevenue(t);
    const profit = revenue - cost;
    const isItm = hasTournamentCash(t);

    const curr = breakdownMap.get(fmt) || { count: 0, cashes: 0, buyIns: 0, prizes: 0, profit: 0 };
    curr.count++;
    if (isItm) curr.cashes++;
    curr.buyIns += cost;
    curr.prizes += revenue;
    curr.profit += profit;

    breakdownMap.set(fmt, curr);
  });

  return Array.from(breakdownMap.entries())
    .map(([format, stats]) => ({
      format,
      count: stats.count,
      itmRate: stats.count > 0 ? (stats.cashes / stats.count) * 100 : 0,
      roi: stats.buyIns > 0 ? (stats.profit / stats.buyIns) * 100 : 0,
      buyIns: stats.buyIns,
      prizes: stats.prizes,
      profit: stats.profit,
      avgBuyIn: stats.count > 0 ? stats.buyIns / stats.count : 0,
    }))
    .filter(item => item.count > 0);
}

export function computeCareerStreaks(tournaments: Tournament[]): CareerStreaks {
  const sorted = [...tournaments]
    .filter(t => t.startDate)
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

  if (sorted.length === 0) {
    return {
      currentItmStreak: 0,
      longestItmStreak: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      longestCashlessStreak: 0,
    };
  }

  let currentItm = 0;
  let longestItm = 0;
  let runningItm = 0;

  let currentWin = 0;
  let longestWin = 0;
  let runningWin = 0;

  let longestCashless = 0;
  let runningCashless = 0;

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (!t) continue;
    const isItm = hasTournamentCash(t);
    const isWin = t.finishPosition === 1;

    // ITM Streak
    if (isItm) {
      runningItm++;
      longestItm = Math.max(longestItm, runningItm);
      runningCashless = 0;
    } else {
      runningItm = 0;
      runningCashless++;
      longestCashless = Math.max(longestCashless, runningCashless);
    }

    // Win Streak
    if (isWin) {
      runningWin++;
      longestWin = Math.max(longestWin, runningWin);
    } else {
      runningWin = 0;
    }
  }

  // Calculate current streaks by looking back from the end
  let i = sorted.length - 1;
  while (i >= 0) {
    const t = sorted[i];
    if (t && hasTournamentCash(t)) {
      currentItm++;
      i--;
    } else {
      break;
    }
  }

  i = sorted.length - 1;
  while (i >= 0) {
    const t = sorted[i];
    if (t && t.finishPosition === 1) {
      currentWin++;
      i--;
    } else {
      break;
    }
  }

  return {
    currentItmStreak: currentItm,
    longestItmStreak: longestItm,
    currentWinStreak: currentWin,
    longestWinStreak: longestWin,
    longestCashlessStreak: longestCashless,
  };
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
    const totalCost = sumUsd(window.map(getTournamentCost));
    const avgBuyIn = totalCost / window.length;
    
    return {
      date: t.startDate!.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      abi: Number(avgBuyIn.toFixed(2))
    };
  });
}

/** Hands assumed per hour when estimating an hourly rate. No real session
 * clock is tracked, so this is only a rough proxy — surface it as an estimate. */
export const ASSUMED_HANDS_PER_HOUR = 75;

export function estimateHourlyRate(tournaments: Tournament[]): number {
  const totalProfit = sumUsd(tournaments.map(getTournamentNet));
  const totalHands = tournaments.reduce((sum, t) => sum + (t.handsPlayed || 0), 0);

  if (totalHands === 0) return 0;

  const estimatedHours = totalHands / ASSUMED_HANDS_PER_HOUR;
  return totalProfit / estimatedHours;
}

/**
 * Lifetime ROI over cash-buy-in tournaments, using the *full* entry cost
 * (buy-in + fee) as the basis: (revenue − buyin − fee) / (buyin + fee).
 *
 * The previous "rake-adjusted ROI" divided profit by the buy-in only and left
 * the fee out of the cost entirely, which inflated the figure (it ignored the
 * rake it claimed to adjust for). Real ROI must include the fee paid.
 */
export function computeLifetimeRoi(tournaments: Tournament[]): number {
  const cashTournaments = tournaments.filter(t => isCashTournamentCurrency(t) && t.buyIn > 0);
  if (cashTournaments.length === 0) return 0;

  const totalCost = sumUsd(cashTournaments.map(getTournamentCost));
  const totalNet = sumUsd(cashTournaments.map(getTournamentNet));

  return totalCost > 0 ? (totalNet / totalCost) * 100 : 0;
}
