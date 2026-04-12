import { useEffect, useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { Download, FileText, CalendarDays } from 'lucide-react';
import { useAppStore } from '../data/appStore';
import { db } from '../data/store';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { detectLeaks, computeAggregateStats } from '../analysis/leakDetector';
import { groupIntoSessions } from '../data/sessions';
import { exportSessionsCSV } from '../utils/csvExport';
import { exportSessionsPDF } from '../utils/pdfExport';
import { clsx } from 'clsx';
import type { Session } from '../data/sessions';
import type { Leak } from '../analysis/leakDetector';

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const { strategyProfile } = useAppStore();

  useEffect(() => {
    async function load() {
      const hands = await db.hands.toArray();
      const decisions = await db.heroDecisions.toArray();
      const tournaments = await db.tournaments.toArray();
      
      const checked = batchCheckCompliance(decisions, strategyProfile);
      const decisionMap = new Map(checked.map((d) => [d.handId, d]));
      const tMap = new Map(tournaments.map(t => [t.id, t]));
      
      const grouped = groupIntoSessions(hands, decisionMap, tMap);
      // Sort descending (newest session first)
      setSessions([...grouped].reverse());

      const aggStats = computeAggregateStats(checked);
      setLeaks(detectLeaks(aggStats, strategyProfile));
    }
    load();
  }, [strategyProfile]);

  const pct = (n: number, d: number) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`);
  
  const formatDuration = (start: Date, end: Date) => {
    const mins = differenceInMinutes(end, start);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-data text-white flex items-center gap-2">
            Histórico de Sessões
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">Acompanhe lucros, volume e consistência ao longo do tempo</p>
        </div>
        
        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportSessionsCSV(sessions)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => exportSessionsPDF(sessions, leaks)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-rose-400 hover:border-rose-400 transition-colors"
            >
              <FileText size={14} /> PDF
            </button>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center shadow-sm">
          <CalendarDays className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" size={48} />
          <p className="text-[var(--color-text)] font-semibold text-lg">Nenhuma Sessão</p>
          <p className="text-[var(--color-text-dim)]">Importe arquivos na guia "Mãos" para gerar sessões automaticamente.</p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left bg-[var(--color-bg-hover)]">
                  <th className="px-3 py-3 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">Data</th>
                  <th className="px-3 py-3 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">Volume</th>
                  <th className="px-3 py-3 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">Duração</th>
                  <th className="px-3 py-3 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">Buy-Ins</th>
                  <th className="px-3 py-3 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">PnL</th>
                  <th className="px-3 py-3 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">ROI</th>
                  <th className="px-3 py-3 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">VPIP / PFR</th>
                  <th className="px-3 py-3 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const st = s.stats;
                  const isGreen = s.pnl > 0;
                  const isRed = s.pnl < 0;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-hover)] transition-colors group"
                    >
                      <td className="px-3 py-3">
                        <div className="font-data font-bold text-[var(--color-text)]">
                          {format(s.startTime, 'dd/MM/yyyy')}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">
                          {format(s.startTime, 'HH:mm')} - {format(s.endTime, 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-data text-[var(--color-text)] font-semibold">{s.totalHands} mãos</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">{s.tournamentIds.length} torneios</div>
                      </td>
                      <td className="px-3 py-3 font-data text-[var(--color-text-dim)]">
                        {formatDuration(s.startTime, s.endTime)}
                      </td>
                      <td className="px-3 py-3 font-data text-rose-300">
                        ${s.buyIns.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 font-data border-l border-[var(--color-border)]/50">
                        <span className={clsx(
                           'font-bold px-2 py-0.5 rounded text-xs',
                           isGreen && 'bg-emerald-900/30 text-emerald-400',
                           isRed && 'bg-red-900/30 text-red-400',
                           !isGreen && !isRed && 'text-[var(--color-text-dim)]'
                        )}>
                          {isGreen ? '+' : ''}{s.pnl === 0 ? '-' : `$${s.pnl.toFixed(2)}`}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-data">
                         <span className={clsx(
                           'text-xs',
                           isGreen ? 'text-emerald-400' : isRed ? 'text-red-400' : 'text-[var(--color-text-dim)]'
                        )}>
                          {s.roi === 0 ? '—' : `${isGreen ? '+' : ''}${s.roi.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-data text-xs text-[var(--color-text-dim)]">
                        {pct(st.vpipHands, st.totalHands)} / {pct(st.pfrHands, st.totalHands)}
                      </td>
                      <td className="px-3 py-3 font-data">
                        <span className={clsx(
                          'text-xs font-bold px-2 py-0.5 rounded',
                          st.complianceEligible > 0 && (st.complianceCompliant / st.complianceEligible) * 100 >= 85
                            ? 'bg-emerald-900/10 text-emerald-400 border border-emerald-900/30'
                            : st.complianceEligible > 0
                              ? 'bg-yellow-900/10 text-yellow-500 border border-yellow-900/30'
                              : 'text-[var(--color-text-dim)]'
                        )}>
                          {pct(st.complianceCompliant, st.complianceEligible)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
