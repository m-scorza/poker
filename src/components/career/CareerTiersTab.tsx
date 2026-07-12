import { useMemo } from 'react';
import { clsx } from 'clsx';
import { DollarSign } from 'lucide-react';
import { FormatBreakdownTable } from './FormatBreakdownTable';
import type { Tournament } from '../../types/hand';
import { getTournamentCost, getTournamentRevenue } from '../../analysis/financials';

interface CareerTiersTabProps {
  tournaments: Tournament[];
}

export function CareerTiersTab({ tournaments }: CareerTiersTabProps) {
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

  return (
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
                        <td className={clsx("px-6 py-5 text-center text-base", st.buyIns > 0 ? (st.profit >= 0 ? "text-[var(--money)]" : "text-[var(--loss)]") : "text-[var(--fg-dim)]")}>
                           {st.buyIns > 0 ? `${((st.profit / st.buyIns) * 100).toFixed(1)}%` : '—'}
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
  );
}
