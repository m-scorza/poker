import { useState } from 'react';
import { StatCard } from '../components/shared/StatCard';
import { TrendChart } from '../components/dashboard/TrendChart';
import { useAppStore } from '../data/appStore';
import { db } from '../data/store';
import { computeAggregateStats, detectLeaks } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { groupIntoSessions, computeSessionTrends, computeIntraSessionTrends } from '../data/sessions';
import { computePositionStats } from '../analysis/positionStats';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Clock, Rocket, Shield, Crosshair } from 'lucide-react';
import { clsx } from 'clsx';
import type { LeakSeverity } from '../analysis/leakDetector';

const SEVERITY_COLORS: Record<LeakSeverity, string> = {
  critical: 'border-[var(--color-danger)] bg-red-900/20',
  high: 'border-[var(--color-warning)] bg-orange-900/15',
  medium: 'border-yellow-600 bg-yellow-900/10',
  low: 'border-[var(--color-border)] bg-[var(--color-bg-card)]',
};

const SEVERITY_LABELS: Record<LeakSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function DashboardPage() {
  const { strategyProfile } = useAppStore();
  const [activeSessionId, setActiveSessionId] = useState<string>('all');

  const totalHands = useLiveQuery(() => db.hands.count(), []) ?? 0;

  const data = useLiveQuery(async () => {
    const rawHands = await db.hands.toArray();
    const rawDecisions = await db.heroDecisions.toArray();
    const rawTournaments = await db.tournaments.toArray();
    
    const tMap = new Map(rawTournaments.map(t => [t.id, t]));
    const decisionMap = new Map(rawDecisions.map(d => [d.handId, d]));

    const sessionsGrouped = groupIntoSessions(rawHands, decisionMap, tMap);
    const trendData = computeSessionTrends(sessionsGrouped);

    // Filter Hands based on active session
    let filteredHands = rawHands;
    let filteredDecisions = rawDecisions;
    
    if (activeSessionId !== 'all') {
      const activeSession = sessionsGrouped.find(s => s.id === activeSessionId);
      if (activeSession) {
         filteredHands = activeSession.hands;
         filteredDecisions = filteredHands.map(h => decisionMap.get(h.id)).filter((d): d is NonNullable<typeof d> => d !== undefined);
      }
    }

    const checked = batchCheckCompliance(filteredDecisions, strategyProfile);
    const stats = computeAggregateStats(checked);
    const leaks = detectLeaks(stats, strategyProfile);
    const positionStats = computePositionStats(checked);
    
    // Financial stats
    const financialSessions = activeSessionId === 'all' 
      ? sessionsGrouped 
      : sessionsGrouped.filter(s => s.id === activeSessionId);

    const totalPnl = financialSessions.reduce((sum, s) => sum + s.pnl, 0);
    const totalBuyIns = financialSessions.reduce((sum, s) => sum + s.buyIns, 0);
    const totalPrizes = financialSessions.reduce((sum, s) => sum + s.prizes, 0);
    
    const uniqueTourneys = new Set<string>();
    financialSessions.forEach(s => s.tournamentIds.forEach(id => uniqueTourneys.add(id)));
    const totalTournaments = uniqueTourneys.size;
    
    let itmCount = 0;
    uniqueTourneys.forEach(id => {
       const t = tMap.get(id);
       if (t && (t.prize || 0) > 0) itmCount++;
    });

    const statsSummary = { totalBuyIns, totalPrizes, totalTournaments, itmCount };
    const displayTrend = activeSessionId === 'all' ? trendData : computeIntraSessionTrends(checked);

    return { stats, leaks, trendData, sessionsGrouped, totalPnl, statsSummary, positionStats, displayTrend };
  }, [strategyProfile, activeSessionId]);

  const aggregateStats = data?.stats ?? null;
  const leaks = data?.leaks ?? [];
  const sessionsList = data?.sessionsGrouped ?? [];
  const totalPnl = data?.totalPnl ?? 0;
  const statsSummary = data?.statsSummary ?? { totalBuyIns: 0, totalPrizes: 0, totalTournaments: 0, itmCount: 0 };
  const positionStats = data?.positionStats ?? [];
  const displayTrend = data?.displayTrend ?? [];

  const pct = (n: number, d: number) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`);

  // Compute calculated stats
  const cbetPct = aggregateStats ? pct(aggregateStats.cbetMade, aggregateStats.cbetOpps) : '—';
  const cbetHUPct = aggregateStats ? pct(aggregateStats.cbetHUMade, aggregateStats.cbetHUOpps) : '—';
  const itmRate = statsSummary.totalTournaments > 0
    ? `${((statsSummary.itmCount / statsSummary.totalTournaments) * 100).toFixed(1)}%`
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-data text-white flex items-center gap-2">
            Professional Dashboard 
            {totalPnl !== 0 && (
              <span className={clsx('text-base px-2 py-0.5 rounded-full', totalPnl > 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400')}>
                {totalPnl > 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            )}
          </h2>
          <p className="text-sm text-[var(--color-text-dim)]">
            {activeSessionId === 'all' ? 'Elite Multi-Session Analysis' : 'Granular Session Deep-Dive'}
          </p>
        </div>

        <div className="flex bg-[var(--color-bg-card)] rounded-lg p-1 border border-[var(--color-border)] shadow-lg ring-1 ring-white/5">
          <select 
            value={activeSessionId}
            onChange={(e) => setActiveSessionId(e.target.value)}
            className="bg-[#15171f] text-sm text-[var(--color-text)] outline-none px-4 py-2 pr-10 cursor-pointer rounded border-none appearance-none font-data font-bold hover:bg-[#1a1c24] transition-colors"
            style={{ 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2300ff88\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', 
              backgroundRepeat: 'no-repeat', 
              backgroundPosition: 'right 0.75rem center', 
              backgroundSize: '1.25rem' 
            }}
          >
            <option value="all" className="bg-[#1a1c24] font-sans">Full Database Overview</option>
            {sessionsList.map(s => (
              <option key={s.id} value={s.id} className="bg-[#1a1c24] font-sans">
                {s.startTime.toLocaleDateString()} — Session #{s.id.split('-')[1]} ({s.totalHands} hands)
              </option>
            ))}
          </select>
        </div>
      </div>

      {totalHands === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center shadow-sm">
          <Target className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" size={48} />
          <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">No Data Found</h3>
          <p className="text-[var(--color-text-dim)] text-sm">
             Drag your Hand History or Summary files to the <strong>Hands</strong> tab to start.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Cluster 1: Macro Performance */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
              <Rocket size={16} /> Strategy Efficiency
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <StatCard label="Hands" value={aggregateStats?.totalHands || 0} subtext="Volume" accent="none" />
              <StatCard 
                 label="VPIP" 
                 value={pct(aggregateStats?.vpipHands || 0, aggregateStats?.totalHands || 0)} 
                 info={{ text: 'VPIP (Voluntarily Put In Pot).', target: '20-30%' }}
                 accent={aggregateStats && (aggregateStats.vpipHands/aggregateStats.totalHands >= 0.20 && aggregateStats.vpipHands/aggregateStats.totalHands <= 0.30) ? 'green' : 'red'}
              />
              <StatCard 
                 label="PFR" 
                 value={pct(aggregateStats?.pfrHands || 0, aggregateStats?.totalHands || 0)} 
                 info={{ text: 'PFR (Pre-Flop Raise).', target: '15-23%' }}
                 accent={aggregateStats && (aggregateStats.pfrHands/aggregateStats.totalHands >= 0.15 && aggregateStats.pfrHands/aggregateStats.totalHands <= 0.23) ? 'green' : 'red'}
              />
              <StatCard 
                 label="3-Bet" 
                 value={pct(aggregateStats?.threeBetMade || 0, aggregateStats?.threeBetOpps || 0)} 
                 info={{ text: '3-Bet Frequency.', target: '7-12%' }}
              />
              <StatCard 
                 label="GTO Comp." 
                 value={pct(aggregateStats?.complianceCompliant || 0, aggregateStats?.complianceEligible || 0)} 
                 info={{ text: 'Range Compliance.', target: '≥ 85%' }}
                 accent={aggregateStats && (aggregateStats.complianceCompliant/aggregateStats.complianceEligible >= 0.85) ? 'green' : 'warning'}
              />
            </div>
          </section>

          {/* Cluster 2: Post-flop Pressure */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
              <Shield size={16} /> Post-flop Dominance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <StatCard 
                 label="C-Bet" 
                 value={cbetPct} 
                 subtext="Continuation Bet"
                 info={{ text: 'Flop C-bet frequency.', target: '60-80%' }}
              />
              <StatCard 
                 label="C-Bet HU" 
                 value={cbetHUPct} 
                 subtext="Single Opponent"
                 accent={aggregateStats && (aggregateStats.cbetHUMade/aggregateStats.cbetHUOpps >= 0.90) ? 'green' : 'red'}
                 info={{ text: 'Mandatory C-bet heads-up.', target: '≥ 95%' }}
              />
              <StatCard 
                 label="AF" 
                 value={aggregateStats && aggregateStats.totalCalls > 0 ? ((aggregateStats.totalBets + aggregateStats.totalRaises) / aggregateStats.totalCalls).toFixed(1) : '—'} 
                 subtext="Aggression Factor"
                 info={{ text: '(Bets + Raises) / Calls.', target: '2.0 - 4.0' }}
              />
              <StatCard label="WTSD" value={pct(aggregateStats?.wtsdHands || 0, aggregateStats?.vpipHands || 1)} subtext="Went to SD" />
              <StatCard 
                 label="Won at SD" 
                 value={pct(aggregateStats?.wonSDHands || 0, aggregateStats?.wtsdHands || 1)} 
                 accent={aggregateStats && (aggregateStats.wonSDHands/aggregateStats.wtsdHands >= 0.50) ? 'green' : 'red'}
              />
            </div>
          </section>

          {/* Cluster 3: Financial Health */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-4 flex items-center gap-2">
              <DollarSign size={16} /> Tournament Financials
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50" />
                 <p className="text-[10px] text-[var(--color-text-dim)] uppercase font-bold tracking-tight mb-1">Total PnL</p>
                 <h4 className={clsx("text-2xl font-data font-bold", totalPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                 </h4>
              </div>
              <StatCard label="ROI Total" value={statsSummary.totalBuyIns > 0 ? `${((totalPnl / statsSummary.totalBuyIns) * 100).toFixed(1)}%` : '0%'} />
              <StatCard label="ITM Rate" value={itmRate} subtext={`${statsSummary.itmCount} Cashes`} />
              <StatCard label="Total Buy-Ins" value={`$${statsSummary.totalBuyIns.toFixed(2)}`} />
              <StatCard label="Total Prizes" value={`$${statsSummary.totalPrizes.toFixed(2)}`} />
            </div>
          </section>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
              <h3 className="text-[var(--color-text)] font-semibold mb-6 flex justify-between items-center">
                <span className="flex items-center gap-2"><TrendingUp size={16} className="text-emerald-400"/> {activeSessionId === 'all' ? 'Bankroll Progression' : 'Current Session Chips'}</span>
                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-[var(--color-text-dim)]">Real-time delta (After-Before)</span>
              </h3>
              <div className="h-72">
                 <TrendChart
                  data={displayTrend}
                  metrics={[ { key: 'cumulativePnl', label: activeSessionId === 'all' ? 'Profit ($)' : 'Chips (Δ)', color: '#10b981' } ]}
                  yDomain={['auto', 'auto']}
                />
              </div>
            </div>
            
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
              <h3 className="text-[var(--color-text)] font-semibold mb-6 flex justify-between items-center">
                <span className="flex items-center gap-2"><Crosshair size={16} className="text-blue-400"/> Technical Focus</span>
                <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-[var(--color-text-dim)]">VPIP/PFR Correlation</span>
              </h3>
              <div className="h-72">
                 <TrendChart
                  data={displayTrend}
                  metrics={[
                    { key: 'vpip', label: 'VPIP', color: '#3b82f6' },
                    { key: 'pfr', label: 'PFR', color: '#8b5cf6' },
                    { key: 'compliance', label: 'Compliance', color: '#f59e0b' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Position Heatmap with BB/100 */}
          {positionStats.length > 0 && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <BarChart3 size={18} className="text-blue-400" />
                   Positional Heatmap
                 </h3>
                 <span className="text-[10px] uppercase font-bold text-[var(--color-text-dim)] border border-[var(--color-border)] px-2 py-1 rounded">Metrics sorted by Position order</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 px-4 text-[var(--color-text-dim)] uppercase text-[10px] tracking-widest font-black">Position</th>
                      <th className="text-center py-3 px-4 text-[var(--color-text-dim)] uppercase text-[10px] tracking-widest font-black">Hands</th>
                      <th className="text-center py-3 px-4 text-[var(--color-text-dim)] uppercase text-[10px] tracking-widest font-black">VPIP / PFR</th>
                      <th className="text-center py-3 px-4 text-[var(--color-text-dim)] uppercase text-[10px] tracking-widest font-black">Compliance</th>
                      <th className="text-center py-3 px-4 text-[var(--color-text-dim)] uppercase text-[10px] tracking-widest font-black">Win Rate</th>
                      <th className="text-center py-3 px-4 text-[var(--color-text-dim)] uppercase text-[10px] tracking-widest font-black">Chips / Hand</th>
                      <th className="text-right py-3 px-4 text-[var(--color-text-dim)] uppercase text-[10px] tracking-widest font-black">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionStats.map((ps) => (
                      <tr key={ps.position} className="border-b border-[var(--color-border)]/50 hover:bg-white/[0.03] transition-colors group">
                        <td className="py-4 px-4">
                          <span className="font-data font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-widest">{ps.position}</span>
                        </td>
                        <td className="py-4 px-4 text-center text-[var(--color-text-muted)] font-data">{ps.hands}</td>
                        <td className="py-4 px-4 text-center">
                           <div className="flex items-center justify-center gap-2">
                              <span className={clsx("font-data font-bold", ps.vpip >= 20 && ps.vpip <= 32 ? "text-emerald-400" : "text-amber-400")}>
                                 {ps.vpip.toFixed(1)}%
                              </span>
                              <span className="text-white/20">/</span>
                              <span className={clsx("font-data font-bold", ps.pfr >= 15 && ps.pfr <= 25 ? "text-emerald-400" : "text-amber-400")}>
                                 {ps.pfr.toFixed(1)}%
                              </span>
                           </div>
                        </td>
                        <td className={clsx('py-4 px-4 text-center font-data font-black', ps.compliance >= 85 ? 'text-emerald-400' : 'text-rose-400')}>
                           {ps.compliance.toFixed(1)}%
                        </td>
                        <td className="py-4 px-4 text-center font-data font-bold text-white">
                           {ps.winPct.toFixed(1)}%
                        </td>
                        <td className={clsx("py-4 px-4 text-center font-data font-bold", ps.totalProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                           {(ps.totalProfit / ps.hands).toFixed(0)}
                        </td>
                        <td className={clsx('py-4 px-4 text-right font-data font-black', ps.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {ps.totalProfit >= 0 ? '+' : ''}{ps.totalProfit.toLocaleString()} <span className="text-[10px] opacity-50 uppercase">Chips</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Nemesis & Assassin Block */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                   <Clock size={16} className="text-rose-400" /> Recent Session Predators
                </h3>
                <div className="space-y-4">
                   {sessionsList.slice(0, 3).map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/40 transition-colors border border-white/5">
                         <div className="flex flex-col">
                            <span className="text-[10px] text-[var(--color-text-dim)] uppercase font-bold">{s.startTime.toLocaleDateString()}</span>
                            <span className="text-sm font-data font-bold text-white uppercase">{s.nemesis?.name || 'Low Activity'}</span>
                         </div>
                         <div className="text-right">
                            {s.nemesis?.type === 'assassin' && (
                               <span className="text-[10px] px-2 py-1 rounded bg-rose-900/50 text-rose-400 font-bold uppercase ring-1 ring-rose-500/30">Assassin</span>
                            )}
                            {s.nemesis?.type === 'crusher' && (
                               <span className="text-[10px] px-2 py-1 rounded bg-amber-900/50 text-amber-400 font-bold uppercase ring-1 ring-amber-500/30">Crusher</span>
                            )}
                            {s.nemesis?.type === 'damage' && (
                               <span className="text-[10px] px-2 py-1 rounded bg-blue-900/50 text-blue-400 font-bold uppercase ring-1 ring-blue-500/30">High Damage</span>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
             
             {/* Leak Summary Mini-Widget */}
             <div className="bg-gradient-to-br from-[var(--color-danger)]/10 to-[var(--color-bg-card)] border border-[var(--color-danger)]/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-danger)]">Alert Log</h3>
                   <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{leaks.length}</span>
                </div>
                {leaks.length > 0 ? (
                   <ul className="space-y-3">
                      {leaks.slice(0, 4).map(l => (
                         <li key={l.id} className="flex items-start gap-2">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                            <div className="flex flex-col">
                               <span className="text-xs font-bold text-white leading-none mb-1">{l.name}</span>
                               <span className="text-[10px] text-[var(--color-text-dim)] leading-tight">{l.description.slice(0, 45)}...</span>
                            </div>
                         </li>
                      ))}
                   </ul>
                ) : (
                   <div className="flex flex-col items-center justify-center h-32 opacity-30">
                      <Target size={32} />
                      <span className="text-xs font-bold mt-2">Zero Leaks Detected</span>
                   </div>
                )}
             </div>
          </div>

        </div>
      )}
    </div>
  );
}
