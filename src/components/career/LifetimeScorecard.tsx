import { useMemo } from 'react';
import { Trophy, Clock, CheckCircle, Percent, DollarSign, Zap, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { Tournament } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';
import { getTournamentNet } from '../../analysis/financials';
import { estimateHourlyRate, computeLifetimeRoi } from '../../analysis/careerStats';
import { isUngradedDecision } from '../../analysis/ungradedScenarios';

interface LifetimeScorecardProps {
  tournaments: Tournament[];
  decisions: HeroDecision[];
}

export function LifetimeScorecard({ tournaments, decisions }: LifetimeScorecardProps) {
  const metrics = useMemo(() => {
    const totalHands = decisions.length;
    const gradedDecisions = decisions.filter(d => !isUngradedDecision(d));
    const compliantHands = gradedDecisions.filter(d => d.isCompliant).length;
    const complianceRate = gradedDecisions.length > 0 ? (compliantHands / gradedDecisions.length) * 100 : 0;

    let biggestWin = 0;
    let worstLoss = 0;

    tournaments.forEach(t => {
      const net = getTournamentNet(t);
      if (net > biggestWin) biggestWin = net;
      if (net < worstLoss) worstLoss = net;
    });

    const hourlyRate = estimateHourlyRate(tournaments);
    const roi = computeLifetimeRoi(tournaments);

    return {
      totalHands,
      complianceRate,
      compliantHands,
      biggestWin,
      worstLoss,
      hourlyRate,
      roi
    };
  }, [tournaments, decisions]);

  if (metrics.totalHands === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--color-card-surface-2)] p-8 shadow-2xl">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative z-10 grid gap-8 md:grid-cols-4 lg:grid-cols-6">
        {/* Main Score */}
        <div className="md:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Efficiency Score</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black text-white tracking-tighter">
              {Math.round(metrics.complianceRate)}
            </span>
            <span className="text-2xl font-bold text-cyan-400/60">%</span>
          </div>
          <p className="mt-2 text-xs font-bold text-[var(--fg-dim)] uppercase tracking-widest">Reference Match Rate</p>
        </div>

        {/* Financials */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--fg-dim)] mb-1">
              <DollarSign size={10} /> Est. Hourly Rate
            </div>
            <div className={clsx("text-xl font-data font-black", metrics.hourlyRate >= 0 ? "text-emerald-400" : "text-rose-400")}>
              ${metrics.hourlyRate.toFixed(2)}<span className="text-[10px] ml-1 opacity-60">/hr</span>
            </div>
            <div className="text-[10px] font-bold text-[var(--fg-dim)]">≈75 hands/hr assumed</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--fg-dim)] mb-1">
              <Percent size={10} /> ROI
            </div>
            <div className="text-xl font-data font-black text-white">
              {metrics.roi.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--fg-dim)] mb-1">
              <Clock size={10} /> Experience
            </div>
            <div className="text-xl font-data font-black text-white">
              {metrics.totalHands.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-[var(--fg-dim)]">Hands Tracked</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--fg-dim)] mb-1">
              <CheckCircle size={10} /> Compliance
            </div>
            <div className="text-xl font-data font-black text-white">
              {metrics.compliantHands.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-[var(--fg-dim)]">Matched Decs.</div>
          </div>
        </div>

        {/* Best/Worst */}
        <div className="md:col-span-2 lg:col-span-2 space-y-4">
           <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/15 p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Best Score</div>
                <div className="text-lg font-data font-black text-emerald-400">+${metrics.biggestWin.toLocaleString()}</div>
              </div>
              <Trophy className="text-emerald-400/40" size={24} />
           </div>
           <div className="rounded-2xl bg-rose-500/10 border border-rose-500/15 p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-rose-400/80">Worst Defeat</div>
                <div className="text-lg font-data font-black text-rose-400">-${Math.abs(metrics.worstLoss).toLocaleString()}</div>
              </div>
              <TrendingDown className="text-rose-400/40" size={24} />
           </div>
        </div>
      </div>
    </div>
  );
}
