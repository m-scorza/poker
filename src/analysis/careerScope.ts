import type { Tournament } from '../types/hand';
import { getTournamentCost, getTournamentNet, getTournamentRevenue, isCashTournamentCurrency } from './financials';
import { sumUsd } from '../parser/money';

export type CareerScopeForm = 'Hot' | 'Uptrend' | 'Stable' | 'Rebuild' | 'Insufficient Sample';

export interface CareerScopePoint {
  index: number;
  date: string;
  profit: number;
  trend: number;
}

export interface CareerScopeProfile {
  totalTournaments: number;
  activeDays: number;
  gamesPerActiveDay: number;
  mostGamesInDay: number;
  firstGameDate: Date | null;
  lastGameDate: Date | null;
  totalStake: number;
  totalRake: number;
  totalCashes: number;
  totalProfit: number;
  averageProfit: number;
  averageStake: number;
  totalRoi: number;
  averageRoi: number;
  itmRate: number;
  wins: number;
  maxCashingStreak: number;
  maxLosingStreak: number;
  winningDays: number;
  losingDays: number;
  breakEvenDays: number;
  last20Roi: number | null;
  bankrollTrendSlope: number;
  abilityRating: number;
  formLabel: CareerScopeForm;
  bankroll: CareerScopePoint[];
}

function sortByDate(tournaments: Tournament[]): Tournament[] {
  return [...tournaments].sort((a, b) => {
    const at = a.startDate?.getTime() ?? 0;
    const bt = b.startDate?.getTime() ?? 0;
    if (at !== bt) return at - bt;
    return a.id.localeCompare(b.id);
  });
}

function dayKey(date: Date | undefined): string {
  return (date ?? new Date(0)).toISOString().slice(0, 10);
}

function pct(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function maxStreak(tournaments: Tournament[], predicate: (tournament: Tournament) => boolean): number {
  let current = 0;
  let longest = 0;
  for (const tournament of tournaments) {
    if (predicate(tournament)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;

  for (let x = 0; x < n; x += 1) {
    numerator += (x - meanX) * (values[x]! - meanY);
    denominator += (x - meanX) ** 2;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

function averageTournamentRoi(tournaments: Tournament[]): number {
  const rois = tournaments
    .filter(isCashTournamentCurrency)
    .map((tournament) => {
      const cost = getTournamentCost(tournament);
      if (cost <= 0) return null;
      return pct(getTournamentNet(tournament), cost);
    })
    .filter((roi): roi is number => roi !== null);

  return rois.length === 0 ? 0 : rois.reduce((sum, roi) => sum + roi, 0) / rois.length;
}

function calculateAbilityRating(args: {
  totalTournaments: number;
  totalRoi: number;
  averageRoi: number;
  itmRate: number;
  wins: number;
  totalProfit: number;
  bankrollTrendSlope: number;
  maxLosingStreak: number;
}): number {
  const sampleScore = clamp((Math.log(args.totalTournaments + 1) / Math.log(501)) * 22, 0, 22);
  const totalRoiScore = clamp((args.totalRoi + 40) / 80, 0, 1) * 24;
  const averageRoiScore = clamp((args.averageRoi + 30) / 80, 0, 1) * 16;
  const itmScore = clamp(args.itmRate / 35, 0, 1) * 12;
  const winScore = clamp(args.wins / Math.max(1, args.totalTournaments * 0.08), 0, 1) * 8;
  const trendScore = clamp((args.bankrollTrendSlope + 2) / 4, 0, 1) * 10;
  const profitScore = args.totalProfit > 0 ? 8 : 0;
  const streakPenalty = clamp(args.maxLosingStreak / 40, 0, 1) * 10;

  return Math.round(clamp(sampleScore + totalRoiScore + averageRoiScore + itmScore + winScore + trendScore + profitScore - streakPenalty));
}

function formLabel(totalTournaments: number, last20Roi: number | null, slope: number, totalRoi: number): CareerScopeForm {
  const recentRoi = last20Roi ?? totalRoi;
  if (recentRoi < -10 || totalRoi < -20) return 'Rebuild';
  if (totalTournaments < 10) return 'Insufficient Sample';
  if (recentRoi >= 35 && slope > 0) return 'Hot';
  if (recentRoi > 0 && slope > 0) return 'Uptrend';
  return 'Stable';
}

export function buildCareerScopeProfile(tournaments: Tournament[]): CareerScopeProfile {
  const sorted = sortByDate(tournaments);
  const cashTournaments = sorted.filter(isCashTournamentCurrency);
  const totalTournaments = sorted.length;
  const totalCashTournaments = cashTournaments.length;

  const byDay = new Map<string, { count: number; profit: number }>();
  for (const tournament of sorted) {
    const key = dayKey(tournament.startDate);
    const current = byDay.get(key) ?? { count: 0, profit: 0 };
    current.count += 1;
    current.profit += getTournamentNet(tournament);
    byDay.set(key, current);
  }

  const activeDays = byDay.size;
  const totalStake = sumUsd(cashTournaments.map(t => t.buyIn || 0));
  const totalRake = sumUsd(cashTournaments.map(t => t.fee || 0));
  const totalCashes = sumUsd(cashTournaments.map(getTournamentRevenue));
  const totalCost = sumUsd(cashTournaments.map(getTournamentCost));
  const totalProfit = sumUsd(cashTournaments.map(getTournamentNet));
  const totalRoi = pct(totalProfit, totalCost);
  const averageRoi = averageTournamentRoi(sorted);
  const itmRate = pct(cashTournaments.filter((tournament) => getTournamentRevenue(tournament) > 0).length, totalCashTournaments);
  const wins = cashTournaments.filter((tournament) => tournament.finishPosition === 1).length;

  let runningProfit = 0;
  const runningValues: number[] = [];
  const bankroll = cashTournaments.map((tournament, index) => {
    runningProfit = sumUsd([runningProfit, getTournamentNet(tournament)]);
    runningValues.push(runningProfit);
    return {
      index: index + 1,
      date: (tournament.startDate ?? new Date(0)).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      profit: Number(runningProfit.toFixed(2)),
      trend: 0,
    };
  });

  const bankrollTrendSlope = linearRegressionSlope(runningValues);
  const trendStart = runningValues.length > 0 ? runningValues[0]! : 0;
  const trendEnd = trendStart + bankrollTrendSlope * Math.max(0, runningValues.length - 1);
  bankroll.forEach((point, index) => {
    point.trend = Number((trendStart + ((trendEnd - trendStart) * index) / Math.max(1, bankroll.length - 1)).toFixed(2));
  });

  const last20 = cashTournaments.slice(-20);
  const last20Cost = sumUsd(last20.map(getTournamentCost));
  const last20Profit = sumUsd(last20.map(getTournamentNet));
  const last20Roi = last20.length === 0 ? null : pct(last20Profit, last20Cost);

  const maxCashingStreak = maxStreak(cashTournaments, (tournament) => getTournamentRevenue(tournament) > 0);
  const maxLosingStreak = maxStreak(cashTournaments, (tournament) => getTournamentRevenue(tournament) <= 0);

  const dailyResults = [...byDay.values()];
  const winningDays = dailyResults.filter((day) => day.profit > 0).length;
  const losingDays = dailyResults.filter((day) => day.profit < 0).length;
  const breakEvenDays = dailyResults.filter((day) => day.profit === 0).length;

  const abilityRating = calculateAbilityRating({
    totalTournaments: totalCashTournaments,
    totalRoi,
    averageRoi,
    itmRate,
    wins,
    totalProfit,
    bankrollTrendSlope,
    maxLosingStreak,
  });

  return {
    totalTournaments,
    activeDays,
    gamesPerActiveDay: activeDays === 0 ? 0 : totalTournaments / activeDays,
    mostGamesInDay: dailyResults.reduce((max, day) => Math.max(max, day.count), 0),
    firstGameDate: sorted[0]?.startDate ?? null,
    lastGameDate: sorted.length > 0 ? sorted[sorted.length - 1]!.startDate ?? null : null,
    totalStake,
    totalRake,
    totalCashes,
    totalProfit,
    averageProfit: totalCashTournaments === 0 ? 0 : totalProfit / totalCashTournaments,
    averageStake: totalCashTournaments === 0 ? 0 : totalStake / totalCashTournaments,
    totalRoi,
    averageRoi,
    itmRate,
    wins,
    maxCashingStreak,
    maxLosingStreak,
    winningDays,
    losingDays,
    breakEvenDays,
    last20Roi,
    bankrollTrendSlope,
    abilityRating,
    formLabel: formLabel(totalCashTournaments, last20Roi, bankrollTrendSlope, totalRoi),
    bankroll,
  };
}
