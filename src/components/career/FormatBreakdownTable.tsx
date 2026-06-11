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
    <section className="compartment p-0 overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--ink-2)] flex items-center justify-between">
        <h3 className="kick text-[var(--sig)] flex items-center gap-2 mb-0">
          <Layers size={16} /> Format Breakdown
        </h3>
        <span className="text-[10px] text-[var(--fg-dim)] font-bold uppercase italic">
          Grouped by Game Type
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[10px] text-[var(--fg-dim)] uppercase tracking-widest bg-white/[0.01]">
              <th className="px-6 py-4 font-bold">Format</th>
              <th className="px-6 py-4 font-bold text-center">Volume</th>
              <th className="px-6 py-4 font-bold text-center">Avg Buy-In</th>
              <th className="px-6 py-4 font-bold text-center">ITM</th>
              <th className="px-6 py-4 font-bold text-center">ROI</th>
              <th className="px-6 py-4 font-bold text-right">Net Profit</th>
            </tr>
          </thead>
          <tbody className="font-mono font-bold">
            {breakdown.map((row) => (
              <tr key={row.format} className="border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--ink-2)]">
                <td className="px-6 py-4 font-mono font-bold text-[var(--fg)]">{row.format}</td>
                <td className="px-6 py-4 text-center text-[var(--fg-dim)]">{row.count}</td>
                <td className="px-6 py-4 text-center text-[var(--fg)]">{money(row.avgBuyIn)}</td>
                <td className="px-6 py-4 text-center text-[var(--fg)]">{pct(row.itmRate)}</td>
                <td
                  className={clsx(
                    'px-6 py-4 text-center',
                    row.roi >= 0 ? 'text-[var(--money)]' : 'text-[var(--loss)]'
                  )}
                >
                  {pct(row.roi, true)}
                </td>
                <td
                  className={clsx(
                    'px-6 py-4 text-right',
                    row.profit >= 0 ? 'text-[var(--money)]' : 'text-[var(--loss)]'
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
