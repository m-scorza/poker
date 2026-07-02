import { useEffect, useState, useCallback } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { Download, FileText, CalendarDays, ChevronDown, UserX, Target, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../data/appStore';
import { db } from '../data/store';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { detectLeaks, computeAggregateStats } from '../analysis/leakDetector';
import { groupIntoSessions } from '../data/sessions';
import { exportSessionsCSV } from '../utils/csvExport';
import { exportSessionsPDF } from '../utils/pdfExport';
import { clsx } from 'clsx';
import { DemoDataButton } from '../components/shared/DemoDataButton';
import { ratioPct } from '../utils/format';
import type { Session } from '../data/sessions';
import type { Leak } from '../analysis/leakDetector';

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { strategyProfile, heroName } = useAppStore();

  const load = useCallback(async () => {
    const hands = await db.hands.toArray();
    const decisions = await db.heroDecisions.toArray();
    const tournaments = await db.tournaments.toArray();

    const checked = batchCheckCompliance(decisions, strategyProfile);
    const decisionMap = new Map(checked.map((d) => [d.handId, d]));
    const tMap = new Map(tournaments.map(t => [t.id, t]));

    const grouped = groupIntoSessions(hands, decisionMap, tMap);
    setSessions([...grouped].reverse());

    const aggStats = computeAggregateStats(checked);
    setLeaks(detectLeaks(aggStats, strategyProfile));
  }, [strategyProfile]);

  useEffect(() => {
    load();
  }, [load]);

  const pct = (n: number, d: number) => ratioPct(n, d, '0%');
  const pctNum = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);

  const formatDuration = (start: Date, end: Date) => {
    const mins = differenceInMinutes(end, start);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="kick sig mb-2 block">Session History</span>
          <h2 className="text-3xl font-bold text-[var(--fg)]">
            Review performance
          </h2>
          <p className="lede text-[var(--fg-dim)]">Track BB/100, volume, ROI, and consistency.</p>
        </div>

        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportSessionsCSV(sessions)}
              className="btn outline"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => exportSessionsPDF(sessions, leaks, heroName)}
              className="btn outline"
            >
              <FileText size={14} /> PDF
            </button>
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="compartment p-12 text-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--sig-soft)] to-transparent pointer-events-none" />
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-[var(--sig)] mb-6 flex justify-center"
          >
            <CalendarDays size={56} />
          </motion.div>
          <p className="text-[var(--fg)] font-bold text-xl mb-2">No Sessions Yet</p>
          <p className="text-[var(--fg-dim)] mb-8 max-w-md mx-auto">Import files in the <strong className="text-[var(--fg)]">Hands</strong> tab or load the local demo to unlock granular session tracking, ROI analysis, and nemesis profiling.</p>
          <DemoDataButton label="Load demo sessions" onLoaded={load} className="shadow-xl" />
        </motion.div>
      ) : (
        <div className="compartment p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--hairline)] text-left bg-[var(--ink-2)]">
                  <th className="px-4 py-4 w-10"></th>
                  <th className="px-3 py-4 text-xs text-[var(--fg-dim)] uppercase tracking-wider font-semibold">Date</th>
                  <th className="px-3 py-4 text-xs text-[var(--fg-dim)] uppercase tracking-wider font-semibold">Volume</th>
                  <th className="px-3 py-4 text-xs text-[var(--fg-dim)] uppercase tracking-wider font-semibold">Duration</th>
                  <th className="px-3 py-4 text-xs text-[var(--fg-dim)] uppercase tracking-wider font-semibold">Buy-Ins</th>
                  <th className="px-3 py-4 text-xs text-[var(--fg-dim)] uppercase tracking-wider font-semibold">BB/100</th>
                  <th className="px-3 py-4 text-xs text-[var(--fg-dim)] uppercase tracking-wider font-semibold">ROI</th>
                  <th className="px-3 py-4 text-xs text-[var(--fg-dim)] uppercase tracking-wider font-semibold">Reference Match</th>
                </tr>
              </thead>
              <AnimatePresence>
              {sessions.map((s, idx) => {
                const isExpanded = expandedId === s.id;
                const st = s.stats;
                const isGreen = s.bb100 > 0;
                const isRed = s.bb100 < 0;

                return (
                  <motion.tbody
                    key={s.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={clsx(isExpanded && "bg-white/[0.02]", "group/body")}
                  >
                    <tr
                      className="border-b border-[var(--hairline)] hover:bg-[var(--ink-2)] transition-all cursor-pointer group relative"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    >
                      <td className="px-4 py-4 text-center">
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                          <ChevronDown size={16} className={clsx("transition-colors", isExpanded ? "text-[var(--accent)]" : "text-[var(--fg-dim)] group-hover:text-[var(--fg)]")} />
                        </motion.div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-mono font-bold text-[var(--fg)]">
                          {format(s.startTime, 'dd/MM/yyyy')}
                        </div>
                        <div className="text-[10px] text-[var(--fg-muted)]">
                          {format(s.startTime, 'HH:mm')} - {format(s.endTime, 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-mono text-[var(--fg)] font-semibold">{s.totalHands} hands</div>
                        <div className="text-[10px] text-[var(--fg-muted)]">{s.tournamentIds.length} tournaments</div>
                      </td>
                      <td className="px-3 py-4 font-mono text-[var(--fg-dim)] text-xs">
                        {formatDuration(s.startTime, s.endTime)}
                      </td>
                      <td className="px-3 py-4 font-mono text-[var(--loss)]/80">
                        ${s.buyIns.toFixed(2)}
                      </td>
                      <td className="px-3 py-4 font-mono">
                        <span className={clsx(
                           'font-bold px-2 py-0.5 rounded text-xs',
                           isGreen && 'bg-[var(--money-soft)] text-[var(--money)]',
                           isRed && 'bg-[var(--loss-soft)] text-[var(--loss)]',
                           !isGreen && !isRed && 'text-[var(--fg-dim)]'
                        )}>
                          {s.bb100Hands === 0 ? '—' : `${isGreen ? '+' : ''}${s.bb100.toFixed(1)}`}
                        </span>
                      </td>
                      <td className="px-3 py-4 font-mono">
                         <span className={clsx(
                           'text-xs font-bold px-2 py-0.5 rounded',
                           s.pnl > 0 ? 'bg-[var(--money-soft)] text-[var(--money)]' : s.pnl < 0 ? 'bg-[var(--loss-soft)] text-[var(--loss)]' : 'text-[var(--fg-dim)]'
                        )}>
                          {s.roi === 0 ? '—' : `${s.pnl > 0 ? '+' : ''}${s.roi.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="px-3 py-4 font-mono">
                        <span className={clsx(
                          'text-xs font-bold px-2 py-0.5 rounded border',
                          st.complianceEligible > 0 && (st.complianceCompliant / st.complianceEligible) * 100 >= 85
                            ? 'bg-[var(--money-soft)] text-[var(--money)] border-[var(--money-line)]'
                            : st.complianceEligible > 0
                              ? 'bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn-line)]'
                              : 'text-[var(--fg-dim)] border-transparent'
                        )}>
                          {pct(st.complianceCompliant, st.complianceEligible)}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Session Report Card */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-8 py-8 border-b border-[var(--hairline)]"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Nemesis Tracker */}
                              <div className="compartment relative overflow-hidden group/card">
                                 <div className="absolute -top-2 -right-2 p-3 opacity-10 group-hover/card:rotate-12 transition-transform duration-500 text-[var(--loss)]"><UserX size={80} /></div>
                                 <h4 className="kick text-[var(--loss)] mb-4 flex items-center gap-2">
                                    <Zap size={14} className="animate-pulse" /> Session Nemesis
                                 </h4>
                                 {s.nemesis ? (
                                    <div className="space-y-1">
                                       <p className="text-xl font-mono font-bold text-[var(--fg)] tracking-tight">{s.nemesis.name}</p>
                                       <p className="text-xs text-[var(--fg-dim)]">
                                          Took <span className="text-[var(--loss)] font-bold">{s.nemesis.amountBb.toFixed(1)} bb</span> from you this session.
                                       </p>
                                    </div>
                                 ) : (
                                    <p className="text-sm text-[var(--fg-muted)] italic">No predator identified.</p>
                                 )}
                              </div>

                              {/* Street Consistency */}
                              <div className="compartment">
                                 <h4 className="kick text-[var(--sig)] mb-4 flex items-center gap-2">
                                    <Target size={14} /> Reference Consistency
                                 </h4>
                                 <div className="space-y-4">
                                    <ProgressBar label="C-bet Total" val={pctNum(st.cbetMade, st.cbetOpps)} color="blue" />
                                    <ProgressBar label="C-bet HU" val={pctNum(st.cbetHUMade, st.cbetHUOpps)} color="emerald" />
                                    <ProgressBar label="WTSD" val={pctNum(st.wtsdHands, st.vpipHands)} color="amber" />
                                 </div>
                              </div>

                              {/* Insights & Coaching */}
                              <div className="compartment">
                                 <h4 className="kick text-[var(--warn)] mb-4 flex items-center gap-2">
                                    <AlertCircle size={14} /> Session Intelligence
                                 </h4>
                                 <div className="text-xs text-[var(--fg-dim)] space-y-3">
                                    {st.complianceEligible > 0 && (st.complianceCompliant / st.complianceEligible) < 0.85 ? (
                                       <div className="bg-[var(--loss-soft)] p-3 rounded-xl border border-[var(--loss-line)] text-[var(--loss)]">
                                          ⚠️ <span className="font-bold">Low reference match.</span> These range mismatches indicate &ldquo;reactionary&rdquo; play. Re-evaluate your Turn folds.
                                       </div>
                                    ) : (
                                       <div className="bg-[var(--money-soft)] p-3 rounded-xl border border-[var(--money-line)] text-[var(--money)]">
                                          ✅ <span className="font-bold">Stable baseline.</span> You maintained your local reference strategy even under pressure. Keep it up!
                                       </div>
                                    )}
                                    <p className="italic opacity-60 px-2 border-l-2 border-[var(--warn)] py-1">
                                       &ldquo;Review whether {s.nemesis?.name || 'opponent'} pressure pulled you away from your local baseline.&rdquo;
                                    </p>
                                 </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </motion.tbody>
                );
              })}
              </AnimatePresence>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ label, val, color }: { label: string; val: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-[var(--sig)]',
    emerald: 'bg-[var(--money)]',
    amber: 'bg-[var(--warn)]',
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
        <span className="text-[var(--fg-dim)]">{label}</span>
        <span className="text-[var(--fg)] font-mono">{val.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full bg-[var(--ink-3)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${val}%` }}
          className={clsx("h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", colors[color])}
        />
      </div>
    </div>
  );
}
