import { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { clsx } from 'clsx';
import type { Tournament } from '../../types/hand';
import { computeFormatBreakdown } from '../../analysis/careerStats';
import { money, pct } from '../../utils/format';

interface FormatBreakdownTableProps {
  tournaments: Tournament[];
}

export function FormatBreakdownTable({ tournaments }: FormatBreakdownTableProps) {
  const breakdown = useMemo(() => computeFormatBreakdown(tournaments), [tournaments]);

  if (breakdown.length === 0) return null;

  return (
    <section className="glass-card border border-white/10 rounded-[2rem] overflow-hidden shadow-xl bg-[#0f172a]">
      <div className="px-6 py-5 border-b border-white/5 bg-black/40 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
          <Layers size={16} /> Format Breakdown
        </h3>
        <span className="text-[10px] text-[var(--color-text-dim)] font-bold uppercase italic">
          Grouped by Game Type
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/5 text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest bg-white/[0.01]">
              <th className="px-6 py-4 font-black">Format</th>
              <th className="px-6 py-4 font-black text-center">Volume</th>
              <th className="px-6 py-4 font-black text-center">Avg Buy-In</th>
              <th className="px-6 py-4 font-black text-center">ITM</th>
              <th className="px-6 py-4 font-black text-center">ROI</th>
              <th className="px-6 py-4 font-black text-right">Net Profit</th>
            </tr>
          </thead>
          <tbody className="font-data font-bold">
            {breakdown.map((row) => (
              <tr key={row.format} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-6 py-4 font-sans font-bold text-white">{row.format}</td>
                <td className="px-6 py-4 text-center text-[var(--color-text-dim)]">{row.count}</td>
                <td className="px-6 py-4 text-center text-white">{money(row.avgBuyIn)}</td>
                <td className="px-6 py-4 text-center text-white">{pct(row.itmRate)}</td>
                <td
                  className={clsx(
                    'px-6 py-4 text-center',
                    row.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {pct(row.roi, true)}
                </td>
                <td
                  className={clsx(
                    'px-6 py-4 text-right',
                    row.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {money(row.profit, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
