/**
 * Statistics page — detailed aggregate analysis.
 */

import { StatCard } from '../components/shared/StatCard';
import { DemoDataButton } from '../components/shared/DemoDataButton';
import { useAppStore } from '../data/appStore';
import { computeAggregateStats } from '../analysis/leakDetector';
import { computeBb100 } from '../analysis/positionStats';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { Trophy, UserX, Flame, DollarSign, History } from 'lucide-react';
import { clsx } from 'clsx';
import { groupIntoSessions } from '../data/sessions';

export function StatsPage() {
  const { strategyProfile, activeSessionId } = useAppStore();
  const data = useLiveQuery(async () => {
    const hands = await db.hands.toArray();
    const decisions = await db.heroDecisions.toArray();
    const tournaments = await db.tournaments.toArray();
    
    const checked = batchCheckCompliance(decisions, strategyProfile);

    let filteredDecisions = checked;
    let filteredHands = hands;
    let filteredTournaments = tournaments;

    if (activeSessionId !== 'all') {
      const tMap = new Map(tournaments.map(t => [t.id, t]));
      const dMap = new Map(checked.map(d => [d.handId, d]));
      const sessions = groupIntoSessions(hands, dMap, tMap);
      const activeSession = sessions.find(s => s.id === activeSessionId);
      
      if (activeSession) {
        filteredHands = activeSession.hands;
        const handIds = new Set(filteredHands.map(h => h.id));
        filteredDecisions = checked.filter(d => handIds.has(d.handId));
        const tIds = new Set(activeSession.tournamentIds);
        filteredTournaments = tournaments.filter(t => tIds.has(t.id));
      }
    }

    const stats = computeAggregateStats(filteredDecisions);
    
    const handById = new Map(filteredHands.map((hand) => [hand.id, hand]));

    // Sort hands by profit/loss in big blinds, not raw tournament chips.
    const sortedHands = [...filteredDecisions]
       .map((decision) => {
          const hand = handById.get(decision.handId);
          const netBb = hand && hand.bigBlind > 0 ? decision.netProfit / hand.bigBlind : null;
          return { decision, hand, netBb };
       })
       .filter((item): item is { decision: typeof filteredDecisions[number]; hand: NonNullable<typeof item.hand>; netBb: number | null } => Boolean(item.hand))
       .sort((a, b) => Math.abs(b.netBb ?? 0) - Math.abs(a.netBb ?? 0))
       .slice(0, 10);

    const bb100 = computeBb100(filteredDecisions, filteredHands);

    // Calculate Tournament ROI by Buy-in
    const buyInStats = new Map<string, { buyIns: number; prizes: number; count: number; cashes: number; profit: number }>();
    for (const t of filteredTournaments) {
       const cost = t.buyIn + t.fee;
       const revenue = (t.prize ?? 0) + (t.bounty ?? 0);
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

    // Top Predators: cumulative damage in big blinds, not raw tournament chips.
    const nemesisMap = new Map<string, number>();
    for (const h of filteredHands) {
      if (!h.villainDeltas || h.bigBlind <= 0) continue;
      for (const v of h.villainDeltas) {
        if (v.net > 0) {
          nemesisMap.set(v.name, (nemesisMap.get(v.name) || 0) + v.net / h.bigBlind);
        }
      }
    }
    const topNemesis = Array.from(nemesisMap.entries())
      .map(([name, amountBb]) => ({ name, amountBb }))
      .sort((a, b) => b.amountBb - a.amountBb)
      .slice(0, 8);

    return { stats, buyInSummary: Array.from(buyInStats.entries()), topNemesis, bigHands: sortedHands, bb100 };
  }, [strategyProfile, activeSessionId]);

  if (!data || data.stats.totalHands === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
         <div className="p-6 bg-white/5 rounded-full mb-6 ring-1 ring-white/10">
            <Trophy size={64} className="text-[var(--color-text-dim)] opacity-10" />
         </div>
         <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Intelligence Pending</h2>
         <p className="text-[var(--color-text-dim)] max-w-md mb-6">Import your PokerStars or GGPoker hand histories to generate the detailed performance report, or load the synthetic demo to inspect BB/100, hand impact, and stake ROI immediately.</p>
         <DemoDataButton label="Load demo audit" />
      </div>
    );
  }

  const { stats: s, buyInSummary, topNemesis, bigHands, bb100 } = data;
  const pct = (n: number, d: number) => (d === 0 ? '0%' : `${((n / d) * 100).toFixed(1)}%`);

  return (
    <div className="space-y-10 pb-20">
      <header className="flex justify-between items-end">
        <div>
           <h2 className="text-3xl font-black text-white font-data tracking-tight uppercase">Strategic Audit</h2>
           <p className="text-sm text-[var(--color-text-dim)]">Advanced metrics and ROI breakdown by tournament tier</p>
        </div>
        <div className="flex gap-2">
           <div className={clsx('border px-3 py-1 rounded text-xs font-bold font-data', bb100.bb100 >= 0 ? 'bg-emerald-900/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-900/20 border-rose-500/20 text-rose-400')}>
              bb/100: {bb100.sampleSize > 0 ? `${bb100.bb100 >= 0 ? '+' : ''}${bb100.bb100.toFixed(1)}` : '—'}
           </div>
           <div className="bg-emerald-900/20 border border-emerald-500/20 px-3 py-1 rounded text-emerald-400 text-xs font-bold font-data">
              Compliance: {pct(s.complianceCompliant, s.complianceEligible)}
           </div>
        </div>
      </header>

      {/* ROI by Buy-in Breakdown */}
      <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xl">
         <div className="px-6 py-5 border-b border-[var(--color-border)] bg-black/40 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
               <DollarSign size={18} /> Financial Tier Analysis
            </h3>
            <span className="text-[10px] text-[var(--color-text-dim)] font-bold uppercase italic">Grouped by Buy-In Level</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest bg-white/[0.02]">
                     <th className="px-6 py-4 font-black">Stake Tier</th>
                     <th className="px-6 py-4 font-black text-center">Volume</th>
                     <th className="px-6 py-4 font-black text-center">Cashes</th>
                     <th className="px-6 py-4 font-black text-center">ROI</th>
                     <th className="px-6 py-4 font-black text-right">Net Profit</th>
                  </tr>
               </thead>
               <tbody className="font-data font-bold">
                  {buyInSummary.sort((a, b) => b[1].buyIns - a[1].buyIns).map(([key, st]) => (
                     <tr key={key} className="border-b border-[var(--color-border)]/30 hover:bg-white/[0.03] transition-colors group">
                        <td className="px-6 py-5">
                           <span className="text-lg text-white group-hover:text-emerald-400 transition-colors">{key}</span>
                        </td>
                        <td className="px-6 py-5 text-center text-[var(--color-text-dim)]">{st.count}</td>
                        <td className="px-6 py-5 text-center">
                           <span className="text-white">{st.cashes}</span> 
                           <span className="text-[10px] text-[var(--color-text-dim)] ml-1">({((st.cashes/st.count)*100).toFixed(0)}%)</span>
                        </td>
                        <td className={clsx("px-6 py-5 text-center text-lg", st.profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                           {((st.profit / (st.buyIns || 1)) * 100).toFixed(1)}%
                        </td>
                        <td className={clsx("px-6 py-5 text-right font-black text-lg", st.profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                           {st.profit >= 0 ? '+' : ''}${st.profit.toFixed(2)}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </section>

      {/* Major Wins & Losses Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-[var(--color-border)] bg-black/40 flex items-center justify-between">
               <h3 className="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <Flame size={18} /> High Impact Hands
               </h3>
               <span className="text-[10px] text-white/30 font-bold">Top 10 by BB Delta</span>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-xs">
                  <tbody className="font-data font-bold">
                     {bigHands.map((item, i) => (
                        <tr key={item.decision.handId} className="border-b border-[var(--color-border)]/20 hover:bg-white/[0.03] transition-colors">
                           <td className="px-4 py-4 text-[var(--color-text-dim)] w-8">#{i+1}</td>
                           <td className="px-4 py-4 text-white text-base w-16">{item.decision.handKey}</td>
                           <td className="px-4 py-4 text-center">
                              <span className="text-[var(--color-text-muted)] uppercase text-[9px] block">Position</span>
                              <span className="text-blue-400 uppercase tracking-tighter">{item.decision.position}</span>
                           </td>
                           <td className="px-4 py-4 text-right">
                              <span className={clsx("text-base", (item.netBb ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                 {item.netBb === null ? '—' : `${item.netBb >= 0 ? '+' : ''}${item.netBb.toFixed(1)}bb`}
                              </span>
                              <span className="mt-1 block text-[9px] font-bold uppercase text-white/30">
                                 {item.decision.netProfit >= 0 ? '+' : ''}{item.decision.netProfit.toLocaleString()} chips
                              </span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </section>

         {/* Predator Hall of Fame */}
         <section className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-[var(--color-border)] bg-black/40 flex items-center justify-between text-rose-400">
               <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <UserX size={18} /> Global Predators
               </h3>
               <span className="text-[10px] font-bold">Most BB Won From Hero</span>
            </div>
            <div className="p-4 space-y-2">
               {topNemesis.map((v, i) => (
                  <div key={v.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-rose-500/30 transition-all">
                     <div className="flex items-center gap-4">
                        <span className="text-base font-black text-rose-500/40">#{i+1}</span>
                        <div className="flex flex-col">
                           <span className="font-data font-black text-white text-lg tracking-tight uppercase group-hover:text-rose-400 transition-colors">{v.name}</span>
                           <span className="text-[10px] text-[var(--color-text-dim)] uppercase font-bold">Loss Exposure</span>
                        </div>
                     </div>
                     <span className="font-data text-rose-400 font-black text-xl">{v.amountBb.toFixed(1)} bb</span>
                  </div>
               ))}
            </div>
         </section>
      </div>

      {/* Global Heatmap Summary (Tiled) */}
      <section className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <History size={18} className="text-amber-400" /> Technical Consistency
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
             <StatCard label="PFR Frequency" value={pct(s.pfrHands, s.totalHands)} />
             <StatCard label="Steal Attempt" value={pct(s.threeBetMade, s.threeBetOpps)} />
             <StatCard label="AF Total" value={( (s.totalBets + s.totalRaises) / (s.totalCalls || 1) ).toFixed(2)} />
             <StatCard label="WTSD Quality" value={pct(s.wonSDHands, s.wtsdHands)} accent={s.wonSDHands/s.wtsdHands >= 0.5 ? 'green' : 'red'} />
             <StatCard label="C-Bet HU" value={pct(s.cbetHUMade, s.cbetHUOpps)} />
             <StatCard label="Total ITMs" value={buyInSummary.reduce((acc, curr) => acc + curr[1].cashes, 0)} />
          </div>
      </section>
    </div>
  );
}
