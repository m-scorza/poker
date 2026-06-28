import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { CareerDashboard } from '../components/career/CareerDashboard';
import { CareerCoachCard } from '../components/career/CareerCoachCard';
import { CareerScopePanel } from '../components/career/CareerScopePanel';
import { TimelineFeed, type TimelineEvent } from '../components/career/TimelineFeed';
import { LifetimeScorecard } from '../components/career/LifetimeScorecard';
import { DayHourHeatmap } from '../components/career/DayHourHeatmap';
import { CareerStreaksCard } from '../components/career/CareerStreaksCard';
import { FormatBreakdownTable } from '../components/career/FormatBreakdownTable';
import { HandReplay } from '../components/hands/HandReplay';
import { buildCareerCoachReport } from '../analysis/careerCoach';
import { buildCareerScopeProfile } from '../analysis/careerScope';
import { computeBustOutDistribution, computeStakeEvolution } from '../analysis/careerStats';
import { BustOutChart } from '../components/career/BustOutChart';
import { StakeTrendChart } from '../components/career/StakeTrendChart';
import { computeAggregateStats, detectLeaks } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { useAppStore } from '../data/appStore';
import { getRecentImportRuns } from '../data/store';
import { summarizeDataHealth } from '../data/importRuns';
import type { Tournament, Hand } from '../types/hand';
import type { HeroDecision } from '../types/analysis';
import type { VillainProfile } from '../types/villain';
import { 
  History, Trophy, TrendingUp, AlertTriangle, 
  Calendar, TableProperties, Swords, Flame, 
  DollarSign, UserX, ExternalLink, Users
} from 'lucide-react';
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
  const [hands, setHands] = useState<Hand[]>([]);
  const [villains, setVillains] = useState<VillainProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { strategyProfile } = useAppStore();
  const recentImportRuns = useLiveQuery(() => getRecentImportRuns(1), [], []);
  const dataHealth = summarizeDataHealth(recentImportRuns ?? []);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'overview' | 'tiers' | 'nemesis' | 'hands') || 'overview';

  const [selectedHand, setSelectedHand] = useState<Hand | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<HeroDecision | null>(null);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [allTourns, allDecisions, allHands, allVillains] = await Promise.all([
      db.tournaments.toArray(),
      db.heroDecisions.toArray(),
      db.hands.toArray(),
      db.villains.toArray()
    ]);
    // Sort tournaments by startDate (if available) or ID
    const sorted = allTourns.sort((a, b) => {
      if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
      return a.id.localeCompare(b.id);
    });
    setTournaments(sorted);
    setDecisions(batchCheckCompliance(allDecisions, strategyProfile));
    setHands(allHands);
    setVillains(allVillains);
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

  const buyInSummary = useMemo(() => {
    const buyInStats = new Map<string, { buyIns: number; prizes: number; count: number; cashes: number; profit: number }>();
    for (const t of tournaments) {
       const cost = getTournamentCost(t);
       const revenue = getTournamentRevenue(t);
       const profit = revenue - cost;
       const key = cost > 0 ? `$${cost.toFixed(2)}` : 'Freeroll';
       
       const curr = buyInStats.get(key) || { buyIns: 0, prizes: 0, count: 0, cashes: 0, profit: 0 };
       curr.buyIns += cost;
       curr.prizes += revenue;
       curr.profit += profit;
       curr.count++;
       if (revenue > 0) curr.cashes++;
       buyInStats.set(key, curr);
    }
    return Array.from(buyInStats.entries()).sort((a, b) => b[1].buyIns - a[1].buyIns);
  }, [tournaments]);

  const topNemesis = useMemo(() => {
    const villainMap = new Map(villains.map(v => [v.playerName, v]));
    const nemesisMap = new Map<string, number>();
    for (const h of hands) {
      if (!h.villainDeltas || h.bigBlind <= 0) continue;
      for (const v of h.villainDeltas) {
        if (v.net > 0) {
          nemesisMap.set(v.name, (nemesisMap.get(v.name) || 0) + v.net / h.bigBlind);
        }
      }
    }
    return Array.from(nemesisMap.entries())
      .map(([name, amountBb]) => {
        const vProf = villainMap.get(name);
        return {
          name,
          amountBb,
          handsCount: vProf?.totalHands || 0,
          notesCount: (vProf?.notes ? 1 : 0) + (vProf?.tags?.length || 0),
        };
      })
      .sort((a, b) => b.amountBb - a.amountBb)
      .slice(0, 8);
  }, [hands, villains]);

  const topVictims = useMemo(() => {
    const villainMap = new Map(villains.map(v => [v.playerName, v]));
    const victimsMap = new Map<string, number>();
    for (const h of hands) {
      if (!h.villainDeltas || h.bigBlind <= 0) continue;
      for (const v of h.villainDeltas) {
        if (v.net < 0) {
          victimsMap.set(v.name, (victimsMap.get(v.name) || 0) + Math.abs(v.net) / h.bigBlind);
        }
      }
    }
    return Array.from(victimsMap.entries())
      .map(([name, amountBb]) => {
        const vProf = villainMap.get(name);
        return {
          name,
          amountBb,
          handsCount: vProf?.totalHands || 0,
          notesCount: (vProf?.notes ? 1 : 0) + (vProf?.tags?.length || 0),
        };
      })
      .sort((a, b) => b.amountBb - a.amountBb)
      .slice(0, 8);
  }, [hands, villains]);

  const topOverlap = useMemo(() => {
    return [...villains]
      .sort((a, b) => b.totalHands - a.totalHands)
      .slice(0, 8)
      .map(v => ({
        name: v.playerName,
        handsCount: v.totalHands,
        notesCount: (v.notes ? 1 : 0) + (v.tags?.length || 0),
        vpip: v.stats.vpip,
        pfr: v.stats.pfr
      }));
  }, [villains]);

  const bigHands = useMemo(() => {
    const handById = new Map(hands.map((hand) => [hand.id, hand]));
    return [...decisions]
       .map((decision) => {
          const hand = handById.get(decision.handId);
          const netBb = hand && hand.bigBlind > 0 ? decision.netProfit / hand.bigBlind : null;
          return { decision, hand, netBb };
       })
       .filter((item): item is { decision: typeof decisions[number]; hand: Hand; netBb: number | null } => Boolean(item.hand))
       .sort((a, b) => Math.abs(b.netBb ?? 0) - Math.abs(a.netBb ?? 0))
       .slice(0, 10);
  }, [decisions, hands]);

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

  const handleOpenReplayer = (hand: Hand, decision: HeroDecision) => {
    setSelectedHand(hand);
    setSelectedDecision(decision);
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-[var(--fg-dim)]">Mapping career data...</div>;
  }

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col gap-2 mb-8">
         <span className="kick sig mb-2 block">Player Career</span>
         <h1 className="text-3xl font-bold text-[var(--fg)]">Evolution & Stats</h1>
         <p className="lede text-[var(--fg-dim)] max-w-2xl">
           Chronological overview of your tournament journey, achievements, and financial evolution.
         </p>
      </header>

      {dataHealth.status === 'ready' && (dataHealth.confidence === 'low' || dataHealth.confidence === 'medium') && (
        <div className={clsx(
          'flex items-start gap-3 rounded-xl border p-4 text-xs shadow-md',
          dataHealth.confidence === 'low'
            ? 'border-[var(--loss)]/30 bg-red-950/20 text-red-100/90 shadow-red-950/10'
            : 'border-warn/30 bg-warn/10 text-[var(--fg-dim)]'
        )}>
          <AlertTriangle className={clsx(
            'mt-0.5 h-[18px] w-[18px] shrink-0',
            dataHealth.confidence === 'low' ? 'text-[var(--loss)]' : 'text-warn'
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

      {/* Tabs Switcher */}
      <div className="tabs mb-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={activeTab === 'overview' ? 'on' : ''}
        >
          <Calendar size={16} /> Overview
        </button>
        <button
          onClick={() => setActiveTab('tiers')}
          className={activeTab === 'tiers' ? 'on' : ''}
        >
          <TableProperties size={16} /> Tiers & Formats
        </button>
        <button
          onClick={() => setActiveTab('nemesis')}
          className={activeTab === 'nemesis' ? 'on' : ''}
        >
          <Swords size={16} /> Nemesis & Opponents
        </button>
        <button
          onClick={() => setActiveTab('hands')}
          className={activeTab === 'hands' ? 'on' : ''}
        >
          <Flame size={16} /> High Impact Hands
        </button>
      </div>

      {/* Tabs Content */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          <LifetimeScorecard tournaments={tournaments} decisions={decisions} />
          
          <CareerStreaksCard tournaments={tournaments} />

          <CareerCoachCard report={careerCoachReport} onDemoLoaded={loadData} />

          <CareerScopePanel profile={careerScopeProfile} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="compartment p-8">
               <h3 className="kick text-[var(--warn)] mb-6 flex items-center gap-2">
                 <Trophy size={14} className="text-[var(--warn)]" />
                 Finish Distribution
               </h3>
               <div className="h-[240px]">
                 <BustOutChart data={bustOutDistribution} />
               </div>
            </div>
            <div className="compartment p-8">
               <h3 className="kick text-[var(--sig)] mb-6 flex items-center gap-2">
                 <TrendingUp size={14} className="text-[var(--sig)]" />
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
                   Keep consistent with your GTO compliance targets to sustain long-term growth.
                 </p>
               </div>

               <DayHourHeatmap tournaments={tournaments} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tiers' && (
        <div className="space-y-10">
          <FormatBreakdownTable tournaments={tournaments} />

          <section className="compartment p-0 overflow-hidden">
             <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between">
                <h3 className="kick text-[var(--money)] flex items-center gap-2 mb-0">
                   <DollarSign size={16} /> Financial Tier Analysis
                </h3>
                <span className="text-[10px] text-[var(--fg-dim)] font-bold uppercase italic">Grouped by Buy-In Level</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead>
                      <tr className="border-b border-[var(--hairline)] text-[10px] text-[var(--fg-dim)] uppercase tracking-widest">
                         <th className="px-6 py-4 font-bold">Stake Tier</th>
                         <th className="px-6 py-4 font-bold text-center">Volume</th>
                         <th className="px-6 py-4 font-bold text-center">Cashes</th>
                         <th className="px-6 py-4 font-bold text-center">ROI</th>
                         <th className="px-6 py-4 font-bold text-right">Net Profit</th>
                      </tr>
                   </thead>
                   <tbody className="font-mono font-bold">
                      {buyInSummary.map(([key, st]) => (
                         <tr key={key} className="border-b border-[var(--hairline)] hover:bg-[var(--ink-2)] transition-colors group">
                            <td className="px-6 py-5">
                               <span className="text-base text-[var(--fg)] group-hover:text-[var(--money)] transition-colors font-mono">{key}</span>
                            </td>
                            <td className="px-6 py-5 text-center text-[var(--fg-dim)]">{st.count}</td>
                            <td className="px-6 py-5 text-center">
                               <span className="text-[var(--fg)]">{st.cashes}</span> 
                               <span className="text-[10px] text-[var(--fg-dim)] ml-1">({((st.cashes/st.count)*100).toFixed(0)}%)</span>
                            </td>
                            <td className={clsx("px-6 py-5 text-center text-base", st.profit >= 0 ? "text-[var(--money)]" : "text-[var(--loss)]")}>
                               {((st.profit / (st.buyIns || 1)) * 100).toFixed(1)}%
                            </td>
                            <td className={clsx("px-6 py-5 text-right font-bold text-base", st.profit >= 0 ? "text-[var(--money)]" : "text-[var(--loss)]")}>
                               {st.profit >= 0 ? '+' : ''}${st.profit.toFixed(2)}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </section>
        </div>
      )}

      {activeTab === 'nemesis' && (
        <div className="space-y-8">
          {/* Global Predators */}
          <section className="compartment p-0 overflow-hidden">
             <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between text-[var(--loss)]">
                <h3 className="kick flex items-center gap-2 mb-0">
                   <UserX size={16} /> Global Predators
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--loss)]/70">Most BB Won From Hero</span>
             </div>
             {topNemesis.length === 0 ? (
                <div className="p-8 text-center text-[var(--fg-dim)]">
                  No predator exposure recorded. Keep importing hands to track predators.
                </div>
             ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                   {topNemesis.map((v, i) => (
                      <div key={v.name} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ink-2)] border border-[var(--hairline)] group hover:border-[var(--loss-line)] transition-all">
                         <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-[var(--loss)]/30 font-mono">#{i+1}</span>
                            <div className="flex flex-col">
                               <span className="font-mono font-bold text-[var(--fg)] text-base tracking-tight uppercase group-hover:text-[var(--loss)] transition-colors">{v.name}</span>
                               <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[9px] text-[var(--fg-dim)] font-bold uppercase">
                                     {v.handsCount} hands observed
                                  </span>
                               </div>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="font-mono text-[var(--loss)] font-bold text-lg">-{v.amountBb.toFixed(1)} bb</span>
                            <span className="text-[9px] text-[var(--fg-muted)] uppercase tracking-widest font-bold mt-1">Loss exposure</span>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </section>

          {/* Global Prey */}
          <section className="compartment p-0 overflow-hidden">
             <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between text-[var(--money)]">
                <h3 className="kick flex items-center gap-2 mb-0">
                   <Swords size={16} /> Global Prey
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--money)]/70">Most BB Won By Hero</span>
             </div>
             {topVictims.length === 0 ? (
                <div className="p-8 text-center text-[var(--fg-dim)]">
                  No victim exposure recorded. Keep importing hands to track prey.
                </div>
             ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                   {topVictims.map((v, i) => (
                      <div key={v.name} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ink-2)] border border-[var(--hairline)] group hover:border-[var(--money-line)] transition-all">
                         <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-[var(--money)]/30 font-mono">#{i+1}</span>
                            <div className="flex flex-col">
                               <span className="font-mono font-bold text-[var(--fg)] text-base tracking-tight uppercase group-hover:text-[var(--money)] transition-colors">{v.name}</span>
                               <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[9px] text-[var(--fg-dim)] font-bold uppercase">
                                     {v.handsCount} hands observed
                                  </span>
                               </div>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="font-mono text-[var(--money)] font-bold text-lg">+{v.amountBb.toFixed(1)} bb</span>
                            <span className="text-[9px] text-[var(--fg-muted)] uppercase tracking-widest font-bold mt-1">Win exposure</span>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </section>

          {/* Opponent Overlap */}
          <section className="compartment p-0 overflow-hidden">
             <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between text-[var(--sig)]">
                <h3 className="kick flex items-center gap-2 mb-0">
                   <Users size={16} /> Opponent Overlap
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sig)]/70">Most Hands Played Against</span>
             </div>
             {topOverlap.length === 0 ? (
                <div className="p-8 text-center text-[var(--fg-dim)]">
                  No opponent overlap recorded. Keep importing hands to track active opponents.
                </div>
             ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                   {topOverlap.map((v, i) => (
                      <div key={v.name} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ink-2)] border border-[var(--hairline)] group hover:border-[var(--sig-line)] transition-all">
                         <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-[var(--sig)]/30 font-mono">#{i+1}</span>
                            <div className="flex flex-col">
                               <span className="font-mono font-bold text-[var(--fg)] text-base tracking-tight uppercase group-hover:text-[var(--sig)] transition-colors">{v.name}</span>
                               <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[9px] text-[var(--fg-dim)] font-bold uppercase">
                                     VPIP/PFR: {v.vpip.toFixed(0)}/{v.pfr.toFixed(0)}
                                  </span>
                               </div>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="font-mono text-[var(--sig)] font-bold text-lg">{v.handsCount}</span>
                            <span className="text-[9px] text-[var(--fg-muted)] uppercase tracking-widest font-bold mt-1">Hands observed</span>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </section>
        </div>
      )}

      {activeTab === 'hands' && (
        <div className="space-y-6">
           <section className="compartment p-0 overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between">
                 <h3 className="kick text-[var(--sig)] flex items-center gap-2 mb-0">
                    <Flame size={16} /> High Impact Hands
                 </h3>
                 <span className="text-[10px] text-[var(--fg-muted)] font-bold uppercase tracking-wider">Top 10 by BB Delta</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead>
                       <tr className="border-b border-[var(--hairline)] text-[10px] text-[var(--fg-dim)] uppercase tracking-widest">
                          <th className="px-6 py-4 font-bold">Rank</th>
                          <th className="px-6 py-4 font-bold">Hole Cards</th>
                          <th className="px-6 py-4 text-center font-bold">Position</th>
                          <th className="px-6 py-4 text-right font-bold">BB Profit/Loss</th>
                          <th className="px-6 py-4 text-center font-bold">Action</th>
                       </tr>
                    </thead>
                    <tbody className="font-mono font-bold">
                       {bigHands.map((item, i) => (
                          <tr key={item.decision.handId} className="border-b border-[var(--hairline)] hover:bg-[var(--ink-2)] transition-colors">
                             <td className="px-6 py-5 text-[var(--fg-dim)] w-16">#{i+1}</td>
                             <td className="px-6 py-5 text-[var(--fg)] text-base w-32 font-mono">{item.decision.handKey}</td>
                             <td className="px-6 py-5 text-center">
                                <span className="text-[var(--sig)] uppercase tracking-wide text-xs">{item.decision.position}</span>
                             </td>
                             <td className="px-6 py-5 text-right">
                                <span className={clsx("text-base block", (item.netBb ?? 0) >= 0 ? "text-[var(--money)]" : "text-[var(--loss)]")}>
                                   {item.netBb === null ? '—' : `${item.netBb >= 0 ? '+' : ''}${item.netBb.toFixed(1)} bb`}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-[var(--fg-muted)] mt-0.5 block">
                                   {item.decision.netProfit >= 0 ? '+' : ''}{item.decision.netProfit.toLocaleString()} chips
                                </span>
                             </td>
                             <td className="px-6 py-5 text-center">
                               <button
                                 onClick={() => handleOpenReplayer(item.hand, item.decision)}
                                 className="btn outline"
                               >
                                 Replay <ExternalLink size={12} />
                               </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </section>
        </div>
      )}

      {/* Hand Replay Modal */}
      {selectedHand && (
        <HandReplay 
          hand={selectedHand} 
          heroDecision={selectedDecision} 
          onClose={() => {
            setSelectedHand(null);
            setSelectedDecision(null);
          }} 
        />
      )}
    </div>
  );
}
