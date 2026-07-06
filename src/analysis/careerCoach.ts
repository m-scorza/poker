import type { Tournament } from '../types/hand';
import type { HeroDecision } from '../types/analysis';
import type { Leak, LeakSeverity } from './leakDetector';
import { getTournamentCost, getTournamentRevenue } from './financials';
import { money } from '../utils/format';
import { sumUsd } from '../parser/money';

export type CareerRecommendation =
  | 'Move Up Candidate'
  | 'Hold Current Stake'
  | 'Move Down / Rebuild'
  | 'Need More Sample';

export type SampleConfidence = 'low' | 'medium' | 'high';

export interface CareerCoachReport {
  tournamentsPlayed: number;
  trackedProfit: number;
  totalBuyIns: number;
  totalPrizes: number;
  avgBuyIn: number;
  roi: number;
  last20Roi: number | null;
  itmRate: number;
  maxDrawdown: number;
  maxDrawdownBuyIns: number;
  longestNoCashStreak: number;
  sampleConfidence: SampleConfidence;
  stakeReadinessScore: number;
  recommendation: CareerRecommendation;
  currentAbiBankrollTarget: number;
  nextStakeBankrollTarget: number;
  complianceRate: number | null;
  topBlocker: CareerBlocker | null;
  nextActions: string[];
}

export interface CareerBlocker {
  title: string;
  detail: string;
  severity: LeakSeverity | 'sample' | 'drawdown' | 'profitability';
}

const SEVERITY_PENALTY: Record<LeakSeverity, number> = {
  critical: 15,
  high: 10,
  medium: 5,
  low: 2,
};

const SEVERITY_RANK: Record<LeakSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function pct(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function tournamentCost(tournament: Tournament): number {
  return getTournamentCost(tournament);
}

function tournamentReturn(tournament: Tournament): number {
  return getTournamentRevenue(tournament);
}

function sortByCareerDate(tournaments: Tournament[]): Tournament[] {
  return [...tournaments].sort((a, b) => {
    const aTime = a.startDate?.getTime() ?? 0;
    const bTime = b.startDate?.getTime() ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });
}

function computeMaxDrawdown(profits: number[]): number {
  let peak = 0;
  let maxDrawdown = 0;
  let running = 0;

  for (const profit of profits) {
    running += profit;
    peak = Math.max(peak, running);
    maxDrawdown = Math.max(maxDrawdown, peak - running);
  }

  return maxDrawdown;
}

function computeLongestNoCashStreak(tournaments: Tournament[]): number {
  let current = 0;
  let longest = 0;

  for (const tournament of tournaments) {
    if (tournamentReturn(tournament) > 0) {
      current = 0;
    } else {
      current += 1;
      longest = Math.max(longest, current);
    }
  }

  return longest;
}

function sampleConfidence(tournamentsPlayed: number): SampleConfidence {
  if (tournamentsPlayed >= 100) return 'high';
  if (tournamentsPlayed >= 30) return 'medium';
  return 'low';
}

function complianceRate(decisions: HeroDecision[]): number | null {
  const eligible = decisions.filter((d) => d.deviationType !== null || d.isCompliant);
  if (eligible.length === 0) return null;
  const compliant = eligible.filter((d) => d.isCompliant).length;
  return pct(compliant, eligible.length);
}

function chooseTopLeak(leaks: Leak[]): Leak | null {
  if (leaks.length === 0) return null;
  return [...leaks].sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    return b.deviation - a.deviation;
  })[0] ?? null;
}

function buildTopBlocker(
  tournamentsPlayed: number,
  roi: number,
  maxDrawdownBuyIns: number,
  leaks: Leak[],
): CareerBlocker | null {
  if (tournamentsPlayed < 30) {
    return {
      title: 'Sample size is still thin',
      detail: `Only ${tournamentsPlayed} tournaments tracked. Use this as a directional read until you import 30+ tournaments.`,
      severity: 'sample',
    };
  }

  const topLeak = chooseTopLeak(leaks);
  if (topLeak) {
    return {
      title: topLeak.name,
      detail: `${topLeak.description}. Current ${topLeak.value}, target ${topLeak.target[0]}–${topLeak.target[1]}.`,
      severity: topLeak.severity,
    };
  }

  if (maxDrawdownBuyIns > 40) {
    return {
      title: 'Drawdown control',
      detail: `Largest downswing is ${maxDrawdownBuyIns.toFixed(1)} ABI. Keep stakes conservative until the curve stabilizes.`,
      severity: 'drawdown',
    };
  }

  if (roi < 0) {
    return {
      title: 'Negative tracked ROI',
      detail: `Tracked ROI is ${roi.toFixed(1)}%. Prioritize review volume before adding tables or moving up.`,
      severity: 'profitability',
    };
  }

  return null;
}

function buildNextActions(report: Omit<CareerCoachReport, 'nextActions'>, leaks: Leak[]): string[] {
  const actions: string[] = [];
  const topLeak = chooseTopLeak(leaks);

  if (report.tournamentsPlayed < 30) {
    actions.push('Import at least 30 tournament summaries before making stake decisions.');
  } else if (report.tournamentsPlayed < 100) {
    actions.push('Treat the recommendation as provisional until the sample reaches 100 tournaments.');
  }

  if (topLeak) {
    actions.push(`Fix ${topLeak.name} first: ${topLeak.description.toLowerCase()}.`);
  } else if (report.complianceRate !== null && report.complianceRate >= 90) {
    actions.push('Protect the edge: keep reviewing starred hands after each session to maintain range discipline.');
  } else {
    actions.push('Use the Leaks and Hands tabs to tag the first repeat mistake after every session.');
  }

  if (report.recommendation === 'Move Up Candidate') {
    actions.push(`Take controlled shots only when your bankroll is near ${money(report.nextStakeBankrollTarget)} and move back down after a 20 ABI shot-loss.`);
  } else if (report.recommendation === 'Move Down / Rebuild') {
    actions.push(`Rebuild at a lower ABI until drawdown is under 30 ABI and ROI turns positive over the next 30 tournaments.`);
  } else {
    actions.push(`Stay near the current ${money(report.avgBuyIn)} ABI and review the next 20 tournaments before changing stakes.`);
  }

  if (report.maxDrawdownBuyIns > 30) {
    actions.push('Reduce table count during downswings; the biggest leak right now may be decision quality under pressure.');
  }

  return actions.slice(0, 3);
}

export function buildCareerCoachMarkdownReport(report: CareerCoachReport): string {
  const lines = [
    '# Poker Career Coach Report',
    '',
    `Recommendation: ${report.recommendation}`,
    `Stake-readiness score: ${report.stakeReadinessScore}/100`,
    `Sample confidence: ${report.sampleConfidence}`,
    '',
    '## Career Snapshot',
    `- Tournaments: ${report.tournamentsPlayed}`,
    `- ABI: ${money(report.avgBuyIn)}`,
    `- Tracked profit: ${money(report.trackedProfit)}`,
    `- ROI: ${report.roi.toFixed(1)}%`,
    `- Last 20 ROI: ${report.last20Roi === null ? '—' : `${report.last20Roi.toFixed(1)}%`}`,
    `- ITM rate: ${report.itmRate.toFixed(1)}%`,
    `- Max drawdown: ${money(report.maxDrawdown)} (${report.maxDrawdownBuyIns.toFixed(1)} ABI)`,
    `- Longest no-cash streak: ${report.longestNoCashStreak}`,
    '',
    '## Bankroll Guardrails',
    `- Current ABI target (100 BI): ${money(report.currentAbiBankrollTarget)}`,
    `- Move-up target (150 BI): ${money(report.nextStakeBankrollTarget)}`,
    '',
    '## Top Blocker',
    report.topBlocker ? `- ${report.topBlocker.title}: ${report.topBlocker.detail}` : '- No dominant blocker detected.',
    '',
    '## Next 3 Actions',
    ...report.nextActions.map((action, index) => `${index + 1}. ${action}`),
    '',
    '_Generated locally by Poker Analyzer. This is a tracked-results risk signal, not financial advice._',
  ];

  return `${lines.join('\n')}\n`;
}

export function buildCareerCoachReport(
  tournaments: Tournament[],
  decisions: HeroDecision[],
  leaks: Leak[],
): CareerCoachReport {
  const sorted = sortByCareerDate(tournaments);
  const tournamentsPlayed = sorted.length;
  const totalBuyIns = sumUsd(sorted.map(tournamentCost));
  const totalPrizes = sumUsd(sorted.map(tournamentReturn));
  const trackedProfit = sumUsd([totalPrizes, -totalBuyIns]);
  const avgBuyIn = tournamentsPlayed > 0 ? totalBuyIns / tournamentsPlayed : 0;
  const roi = pct(trackedProfit, totalBuyIns);
  const itmRate = pct(sorted.filter((t) => tournamentReturn(t) > 0).length, tournamentsPlayed);
  const profits = sorted.map((t) => sumUsd([tournamentReturn(t), -tournamentCost(t)]));
  const maxDrawdown = computeMaxDrawdown(profits);
  const maxDrawdownBuyIns = avgBuyIn > 0 ? maxDrawdown / avgBuyIn : 0;
  const longestNoCashStreak = computeLongestNoCashStreak(sorted);
  const confidence = sampleConfidence(tournamentsPlayed);
  const compliance = complianceRate(decisions);

  const last20 = sorted.slice(-20);
  const last20Cost = sumUsd(last20.map(tournamentCost));
  const last20Prize = sumUsd(last20.map(tournamentReturn));
  const last20Roi = last20.length >= 5 && last20Cost > 0 ? pct(sumUsd([last20Prize, -last20Cost]), last20Cost) : null;

  let score = 50;
  if (roi > 20) score += 25;
  else if (roi > 10) score += 20;
  else if (roi > 0) score += 10;
  else if (roi < -25) score -= 30;
  else if (roi < -10) score -= 20;
  else if (roi < 0) score -= 10;

  if (last20Roi !== null) {
    if (last20Roi > 10) score += 8;
    if (last20Roi < -15) score -= 8;
  }

  if (itmRate >= 18) score += 10;
  else if (itmRate >= 15) score += 6;
  else if (tournamentsPlayed >= 30 && itmRate < 10) score -= 8;

  if (tournamentsPlayed >= 100) score += 10;
  else if (tournamentsPlayed >= 30) score += 5;
  else score -= 18;

  if (maxDrawdownBuyIns > 50) score -= 18;
  else if (maxDrawdownBuyIns > 30) score -= 10;
  else if (maxDrawdownBuyIns <= 15 && tournamentsPlayed >= 30) score += 5;

  if (compliance !== null) {
    if (compliance >= 92) score += 8;
    else if (compliance < 80) score -= 12;
    else if (compliance < 90) score -= 6;
  }

  const leakPenalty = leaks.reduce((sum, leak) => sum + SEVERITY_PENALTY[leak.severity], 0);
  score -= Math.min(30, leakPenalty);

  const stakeReadinessScore = clampScore(score);
  let recommendation: CareerRecommendation;
  if (tournamentsPlayed < 30) recommendation = 'Need More Sample';
  else if (stakeReadinessScore >= 75 && roi > 0 && maxDrawdownBuyIns <= 35) recommendation = 'Move Up Candidate';
  else if (stakeReadinessScore < 40 || (roi < -10 && maxDrawdownBuyIns > 35)) recommendation = 'Move Down / Rebuild';
  else recommendation = 'Hold Current Stake';

  const baseReport = {
    tournamentsPlayed,
    trackedProfit,
    totalBuyIns,
    totalPrizes,
    avgBuyIn,
    roi,
    last20Roi,
    itmRate,
    maxDrawdown,
    maxDrawdownBuyIns,
    longestNoCashStreak,
    sampleConfidence: confidence,
    stakeReadinessScore,
    recommendation,
    currentAbiBankrollTarget: avgBuyIn * 100,
    nextStakeBankrollTarget: avgBuyIn * 150,
    complianceRate: compliance,
    topBlocker: buildTopBlocker(tournamentsPlayed, roi, maxDrawdownBuyIns, leaks),
  } satisfies Omit<CareerCoachReport, 'nextActions'>;

  return {
    ...baseReport,
    nextActions: buildNextActions(baseReport, leaks),
  };
}
