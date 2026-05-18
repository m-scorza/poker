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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-data text-white flex items-center gap-2">
            Session History
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">Track BB/100, volume, ROI, and consistency over time</p>
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
              onClick={() => exportSessionsPDF(sessions, leaks, heroName)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-rose-400 hover:border-rose-400 transition-colors"
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
          className="glass-card border border-[var(--color-border)] rounded-xl p-12 text-center shadow-lg relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 to-transparent pointer-events-none" />
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <CalendarDays className="mx-auto mb-6 text-blue-500/50" size={56} />
          </motion.div>
          <p className="text-[var(--color-text)] font-bold text-xl mb-2">No Sessions Yet</p>
          <p className="text-[var(--color-text-dim)] mb-8 max-w-md mx-auto">Import files in the <strong className="text-white">Hands</strong> tab or load the local demo to unlock granular session tracking, ROI analysis, and nemesis profiling.</p>
          <DemoDataButton label="Load demo sessions" onLoaded={load} className="shadow-xl" />
        </motion.div>
      ) : (
        <div className="glass-card border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left bg-black/20">
                  <th className="px-4 py-4 w-10"></th>
                  <th className="px-3 py-4 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">Date</th>
                  <th className="px-3 py-4 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">Volume</th>
                  <th className="px-3 py-4 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">Duration</th>
                  <th className="px-3 py-4 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold text-rose-300">Buy-Ins</th>
                  <th className="px-3 py-4 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">BB/100</th>
                  <th className="px-3 py-4 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold">ROI</th>
                  <th className="px-3 py-4 text-xs text-[var(--color-text-dim)] uppercase tracking-wider font-semibold text-emerald-400">GTO Comp.</th>
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
                      className="border-b border-[var(--color-border)]/30 hover:bg-white/[0.06] transition-all cursor-pointer group relative"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    >
                      <td className="px-4 py-4 text-center">
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                          <ChevronDown size={16} className={clsx("transition-colors", isExpanded ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)] group-hover:text-white")} />
                        </motion.div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-data font-bold text-[var(--color-text)]">
                          {format(s.startTime, 'dd/MM/yyyy')}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">
                          {format(s.startTime, 'HH:mm')} - {format(s.endTime, 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-data text-[var(--color-text)] font-semibold">{s.totalHands} hands</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">{s.tournamentIds.length} tournaments</div>
                      </td>
                      <td className="px-3 py-4 font-data text-[var(--color-text-dim)] text-xs">
                        {formatDuration(s.startTime, s.endTime)}
                      </td>
                      <td className="px-3 py-4 font-data text-rose-300/80">
                        ${s.buyIns.toFixed(2)}
                      </td>
                      <td className="px-3 py-4 font-data">
                        <span className={clsx(
                           'font-bold px-2 py-0.5 rounded text-xs',
                           isGreen && 'bg-emerald-900/40 text-emerald-400',
                           isRed && 'bg-red-900/40 text-red-100',
                           !isGreen && !isRed && 'text-[var(--color-text-dim)]'
                        )}>
                          {s.bb100Hands === 0 ? '—' : `${isGreen ? '+' : ''}${s.bb100.toFixed(1)}`}
                        </span>
                      </td>
                      <td className="px-3 py-4 font-data">
                         <span className={clsx(
                           'text-xs',
                           s.pnl > 0 ? 'text-emerald-400' : s.pnl < 0 ? 'text-rose-400' : 'text-[var(--color-text-dim)]'
                        )}>
                          {s.roi === 0 ? '—' : `${s.pnl > 0 ? '+' : ''}${s.roi.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="px-3 py-4 font-data">
                        <span className={clsx(
                          'text-xs font-bold px-2 py-0.5 rounded border',
                          st.complianceEligible > 0 && (st.complianceCompliant / st.complianceEligible) * 100 >= 85
                            ? 'bg-emerald-900/10 text-emerald-400 border-emerald-500/20'
                            : st.complianceEligible > 0
                              ? 'bg-yellow-900/10 text-yellow-500 border-yellow-500/20'
                              : 'text-[var(--color-text-dim)] border-transparent'
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
                            className="px-8 py-8 border-b border-[var(--color-border)]"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Nemesis Tracker */}
                              <div className="glass-card border border-[var(--color-border)] rounded-2xl p-5 shadow-sm relative overflow-hidden group/card shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                                 <div className="absolute -top-2 -right-2 p-3 opacity-10 group-hover/card:rotate-12 transition-transform duration-500"><UserX size={80} /></div>
                                 <h4 className="text-[10px] uppercase font-bold text-rose-400 tracking-widest mb-4 flex items-center gap-2">
                                    <Zap size={14} className="animate-pulse" /> Session Nemesis
                                 </h4>
                                 {s.nemesis ? (
                                    <div className="space-y-1">
                                       <p className="text-xl font-data font-bold text-white tracking-tight">{s.nemesis.name}</p>
                                       <p className="text-xs text-[var(--color-text-muted)]">
                                          Took <span className="text-rose-400 font-bold">{s.nemesis.amountBb.toFixed(1)} bb</span> from you this session.
                                       </p>
                                    </div>
                                 ) : (
                                    <p className="text-sm text-[var(--color-text-dim)] italic">No predator identified.</p>
                                 )}
                              </div>

                              {/* Street Consistency */}
                              <div className="glass-card border border-[var(--color-border)] rounded-2xl p-5 shadow-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                                 <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-4 flex items-center gap-2">
                                    <Target size={14} /> GTO Consistency
                                 </h4>
                                 <div className="space-y-4">
                                    <ProgressBar label="C-bet Total" val={pctNum(st.cbetMade, st.cbetOpps)} color="blue" />
                                    <ProgressBar label="C-bet HU" val={pctNum(st.cbetHUMade, st.cbetHUOpps)} color="emerald" />
                                    <ProgressBar label="WTSD" val={pctNum(st.wtsdHands, st.vpipHands)} color="amber" />
                                 </div>
                              </div>

                              {/* Insights & Coaching */}
                              <div className="glass-card border border-[var(--color-border)] rounded-2xl p-5 shadow-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                                 <h4 className="text-[10px] uppercase font-bold text-amber-500 tracking-widest mb-4 flex items-center gap-2">
                                    <AlertCircle size={14} /> Session Intelligence
                                 </h4>
                                 <div className="text-xs text-[var(--color-text-muted)] space-y-3">
                                    {st.complianceEligible > 0 && (st.complianceCompliant / st.complianceEligible) < 0.85 ? (
                                       <div className="bg-rose-900/10 p-3 rounded-xl border border-rose-500/20 text-rose-200">
                                          ⚠️ <span className="font-bold">Low Compliance.</span> Your deviations this session indicate "reactionary" play. Re-evaluate your Turn folds.
                                       </div>
                                    ) : (
                                       <div className="bg-emerald-900/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-200">
                                          ✅ <span className="font-bold">Elite Discipline.</span> You maintained your baseline strategy even under pressure. Keep it up!
                                       </div>
                                    )}
                                    <p className="italic opacity-60 px-2 border-l-2 border-amber-500/30 py-1">
                                       "The {s.nemesis?.name || 'opponent'} factor should not make you deviate from your theoretical range."
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
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
        <span className="text-[var(--color-text-dim)]">{label}</span>
        <span className="text-white font-data">{val.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${val}%` }}
          className={clsx("h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", colors[color])}
        />
      </div>
    </div>
  );
}
