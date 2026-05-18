import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { CareerDashboard } from '../components/career/CareerDashboard';
import { CareerCoachCard } from '../components/career/CareerCoachCard';
import { CareerScopePanel } from '../components/career/CareerScopePanel';
import { TimelineFeed, type TimelineEvent } from '../components/career/TimelineFeed';
import { LifetimeScorecard } from '../components/career/LifetimeScorecard';
import { DayHourHeatmap } from '../components/career/DayHourHeatmap';
import { buildCareerCoachReport } from '../analysis/careerCoach';
import { buildCareerScopeProfile } from '../analysis/careerScope';
import { computeBustOutDistribution, computeStakeEvolution } from '../analysis/careerStats';
import { BustOutChart } from '../components/career/BustOutChart';
import { StakeTrendChart } from '../components/career/StakeTrendChart';
import { computeAggregateStats, detectLeaks } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { useAppStore } from '../data/appStore';
import { getRecentImportRuns, summarizeDataHealth } from '../data/importRuns';
import type { Tournament } from '../types/hand';
import type { HeroDecision } from '../types/analysis';
import { History, Trophy, TrendingUp, AlertTriangle } from 'lucide-react';
import { getTournamentCost, getTournamentNet, getTournamentRevenue, hasTournamentCash } from '../analysis/financials';
import { sumUsd } from '../parser/money';

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1: return `${value}st`;
    case 2: return `${value}nd`;
    case 3: return `${value}rd`;
    default: return `${value}th`;
  }
}

export function CareerPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [decisions, setDecisions] = useState<HeroDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const { strategyProfile } = useAppStore();
  const recentImportRuns = useLiveQuery(() => getRecentImportRuns(1), [], []);
  const dataHealth = summarizeDataHealth(recentImportRuns ?? []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [allTourns, allDecisions] = await Promise.all([
      db.tournaments.toArray(),
      db.heroDecisions.toArray(),
    ]);
    // Sort tournaments by startDate (if available) or ID
    const sorted = allTourns.sort((a, b) => {
      if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
      return a.id.localeCompare(b.id);
    });
    setTournaments(sorted);
    setDecisions(batchCheckCompliance(allDecisions, strategyProfile));
    setLoading(false);
  }, [strategyProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const played = tournaments.length;
    if (played === 0) return { totalWinnings: 0, totalProfit: 0, itmRate: 0, roi: 0, avgBuyIn: 0, tournamentsPlayed: 0 };

    const totalWinnings = sumUsd(tournaments.map(getTournamentRevenue));
    const totalBuyIns = sumUsd(tournaments.map(getTournamentCost));
    const itms = tournaments.filter(hasTournamentCash).length;

    return {
      totalWinnings,
      totalProfit: totalWinnings - totalBuyIns,
      itmRate: (itms / played) * 100,
      roi: totalBuyIns > 0 ? ((totalWinnings - totalBuyIns) / totalBuyIns) * 100 : 0,
      avgBuyIn: totalBuyIns / played,
      tournamentsPlayed: played
    };
  }, [tournaments]);

  const leaks = useMemo(() => {
    return detectLeaks(computeAggregateStats(decisions), strategyProfile);
  }, [decisions, strategyProfile]);

  const careerCoachReport = useMemo(() => {
    return buildCareerCoachReport(tournaments, decisions, leaks);
  }, [tournaments, decisions, leaks]);

  const careerScopeProfile = useMemo(() => {
    return buildCareerScopeProfile(tournaments);
  }, [tournaments]);

  const bustOutDistribution = useMemo(() => {
    return computeBustOutDistribution(tournaments);
  }, [tournaments]);

  const stakeEvolution = useMemo(() => {
    return computeStakeEvolution(tournaments);
  }, [tournaments]);

  const { timelineEvents, profitHistory } = useMemo(() => {
    const events: TimelineEvent[] = [];
    let runningProfit = 0;
    const history: { date: string; amount: number }[] = [];

    tournaments.forEach((t) => {
      const prize = getTournamentRevenue(t);
      const cost = getTournamentCost(t);
      runningProfit += getTournamentNet(t);

      const date = t.startDate || new Date();

      history.push({
        date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        amount: Math.round(runningProfit)
      });

      if (prize > 0) {
        events.push({
          id: `t-${t.id}`,
          type: 'tournament_result',
          date,
          title: t.name || `Tournament #${t.id}`,
          description: `Finished ${t.finishPosition ? `in ${ordinal(t.finishPosition)} place` : 'in the money'}. Prize: $${prize.toLocaleString()}.`,
          value: `+$${prize.toLocaleString()}`,
          isPositive: true
        });

        // Milestone for big wins
        if (cost > 0 && prize > cost * 10) {
          events.push({
            id: `m-${t.id}`,
            type: 'milestone',
            date,
            title: 'Huge Win Achievement',
            description: `Secured a massive ${Math.round(prize/cost)}x return on ${t.name || t.id}.`,
            value: 'MILESTONE',
            isPositive: true
          });
        }
      }
    });

    return {
      timelineEvents: events.reverse(), // Newest first
      profitHistory: history
    };
  }, [tournaments]);

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-[var(--color-text-dim)]">Mapping career data...</div>;
  }

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col gap-2">
         <div className="flex items-center gap-3">
           <Trophy className="text-amber-400" size={24} />
           <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Player Career</h1>
         </div>
         <p className="text-[var(--color-text-dim)] text-sm max-w-2xl font-medium">
           Chronological overview of your tournament journey, achievements, and financial evolution.
         </p>
      </header>

      {dataHealth.status === 'ready' && (dataHealth.confidence === 'low' || dataHealth.confidence === 'medium') && (
        <div className={clsx(
          'flex items-start gap-3 rounded-xl border p-4 text-xs shadow-md',
          dataHealth.confidence === 'low'
            ? 'border-[var(--color-danger)]/30 bg-red-950/20 text-red-100/90 shadow-red-950/10'
            : 'border-yellow-600/30 bg-yellow-950/15 text-yellow-100/90 shadow-yellow-950/10'
        )}>
          <AlertTriangle className={clsx(
            'mt-0.5 h-[18px] w-[18px] shrink-0',
            dataHealth.confidence === 'low' ? 'text-[var(--color-danger)]' : 'text-yellow-400'
          )} />
          <div>
            <span className="font-bold uppercase tracking-wider">
              {dataHealth.confidence === 'low' ? 'Action Required' : 'Directional Analysis'}:
            </span>{' '}
            {dataHealth.confidence === 'low'
              ? 'Your latest import encountered significant warnings or failures. Career financials, profit charts, and ABI stats may be incomplete or biased. Fix import warnings in the Upload tab before trusting metrics.'
              : 'Your latest import completed with minor warnings. Profit timelines and GTO scorecards are highly useful but should be treated as directional.'}
            <div className="mt-2">
              <Link
                to="/hands"
                className="inline-flex items-center gap-1 font-bold text-white hover:underline uppercase tracking-wider text-[10px]"
              >
                Review Import Warnings &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      <LifetimeScorecard tournaments={tournaments} decisions={decisions} />

      <CareerCoachCard report={careerCoachReport} onDemoLoaded={loadData} />

      <CareerScopePanel profile={careerScopeProfile} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0f172a] border border-white/10 rounded-[2rem] p-8 shadow-xl">
           <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
             <Trophy size={14} className="text-amber-400" />
             Finish Distribution
           </h3>
           <div className="h-[240px]">
             <BustOutChart data={bustOutDistribution} />
           </div>
        </div>
        <div className="bg-[#0f172a] border border-white/10 rounded-[2rem] p-8 shadow-xl">
           <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
             <TrendingUp size={14} className="text-indigo-400" />
             Stake Evolution (ABI)
           </h3>
           <div className="h-[240px]">
             <StakeTrendChart data={stakeEvolution} />
           </div>
        </div>
      </div>

      <CareerDashboard stats={stats} profitHistory={profitHistory} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <History size={18} className="text-[var(--color-accent)]" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Historical Timeline</h2>
          </div>
          <TimelineFeed events={timelineEvents} />
        </div>

        <div className="space-y-8">
           <div className="bg-[#15171f] border border-white/5 rounded-2xl p-6">
             <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
               <TrendingUp size={14} className="text-[var(--color-accent)]" />
               Current Form
             </h3>
             <p className="text-xs text-[var(--color-text-dim)] italic">
               You are currently in a {stats.roi > 0 ? 'profitable' : 'challenging'} phase.
               Keep consistent with your GTO compliance targets to sustain long-term growth.
             </p>
           </div>

           <DayHourHeatmap tournaments={tournaments} />
        </div>
      </div>
    </div>
  );
}
