import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { History, Trophy, TrendingUp, type LucideIcon } from 'lucide-react';
import { CareerCoachCard } from './CareerCoachCard';
import { TimelineFeed, type TimelineEvent } from './TimelineFeed';
import { LifetimeScorecard } from './LifetimeScorecard';
import { CareerStreaksCard } from './CareerStreaksCard';
import { buildCareerCoachReport } from '../../analysis/careerCoach';
import { buildCareerScopeProfile } from '../../analysis/careerScope';
import { computeBustOutDistribution, computeStakeEvolution } from '../../analysis/careerStats';
import { computeAggregateStats, detectLeaks } from '../../analysis/leakDetector';
import type { Tournament } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';
import type { StrategyProfile } from '../../data/strategyProfiles';
import { getTournamentCost, getTournamentNet, getTournamentRevenue, hasTournamentCash, computeRoiPct } from '../../analysis/financials';
import { sumUsd } from '../../parser/money';

const CareerDashboard = lazy(() => import('./CareerDashboard').then((m) => ({ default: m.CareerDashboard })));
const CareerScopePanel = lazy(() => import('./CareerScopePanel').then((m) => ({ default: m.CareerScopePanel })));
const DayHourHeatmap = lazy(() => import('./DayHourHeatmap').then((m) => ({ default: m.DayHourHeatmap })));
const BustOutChart = lazy(() => import('./BustOutChart').then((m) => ({ default: m.BustOutChart })));
const StakeTrendChart = lazy(() => import('./StakeTrendChart').then((m) => ({ default: m.StakeTrendChart })));

function ChartFallback({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-2xl bg-white/5', className)} />;
}

function CareerChartCard({ title, icon: Icon, accentClass, children }: {
  title: string;
  icon: LucideIcon;
  accentClass: string;
  children: ReactNode;
}) {
  return (
    <div className="compartment p-8">
       <h3 className={clsx('kick', accentClass, 'mb-6 flex items-center gap-2')}>
         <Icon size={14} className={accentClass} />
         {title}
       </h3>
       <div className="h-[240px]">
         <Suspense fallback={<ChartFallback className="h-full" />}>
           {children}
         </Suspense>
       </div>
    </div>
  );
}

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

interface CareerOverviewTabProps {
  tournaments: Tournament[];
  decisions: HeroDecision[];
  strategyProfile: StrategyProfile;
  onDemoLoaded: () => void;
}

export function CareerOverviewTab({ tournaments, decisions, strategyProfile, onDemoLoaded }: CareerOverviewTabProps) {
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
      roi: computeRoiPct(tournaments),
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

  return (
    <div className="space-y-10">
      <LifetimeScorecard tournaments={tournaments} decisions={decisions} />

      <CareerStreaksCard tournaments={tournaments} />

      <CareerCoachCard report={careerCoachReport} onDemoLoaded={onDemoLoaded} />

      <Suspense fallback={<ChartFallback className="h-[200px]" />}>
        <CareerScopePanel profile={careerScopeProfile} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CareerChartCard title="Finish Distribution" icon={Trophy} accentClass="text-[var(--warn)]">
          <BustOutChart data={bustOutDistribution} />
        </CareerChartCard>
        <CareerChartCard title="Stake Evolution (ABI)" icon={TrendingUp} accentClass="text-[var(--sig)]">
          <StakeTrendChart data={stakeEvolution} />
        </CareerChartCard>
      </div>

      <Suspense fallback={<ChartFallback className="h-[300px]" />}>
        <CareerDashboard stats={stats} profitHistory={profitHistory} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--hairline)] pb-4">
            <History size={18} className="text-[var(--accent)]" />
            <h2 className="kick">Historical Timeline</h2>
          </div>
          <TimelineFeed events={timelineEvents} />
        </div>

        <div className="space-y-8">
           <div className="compartment p-6">
             <h3 className="kick text-[var(--accent)] mb-6 flex items-center gap-2">
               <TrendingUp size={14} className="text-[var(--accent)]" />
               Current Form
             </h3>
             <p className="text-xs text-[var(--fg-dim)] italic">
               You are currently in a {stats.roi > 0 ? 'profitable' : 'challenging'} phase.
               Keep consistent with your local reference targets to sustain long-term growth.
             </p>
           </div>

           <Suspense fallback={<ChartFallback className="h-[260px]" />}>
             <DayHourHeatmap tournaments={tournaments} />
           </Suspense>
        </div>
      </div>
    </div>
  );
}
