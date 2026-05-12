import { useMemo } from 'react';
import { Target, Trophy, Clock, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { Tournament } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';
import { getTournamentNet } from '../../analysis/financials';

interface LifetimeScorecardProps {
  tournaments: Tournament[];
  decisions: HeroDecision[];
}

export function LifetimeScorecard({ tournaments, decisions }: LifetimeScorecardProps) {
  const metrics = useMemo(() => {
    const totalHands = decisions.length;
    const compliantHands = decisions.filter(d => d.isCompliant).length;
    const complianceRate = totalHands > 0 ? (compliantHands / totalHands) * 100 : 0;

    let biggestWin = 0;
    let worstLoss = 0;

    tournaments.forEach(t => {
      const net = getTournamentNet(t);
      if (net > biggestWin) biggestWin = net;
      if (net < worstLoss) worstLoss = net;
    });

    const vpipHands = decisions.filter(d => d.action !== 'fold');
    const vpipRate = totalHands > 0 ? (vpipHands.length / totalHands) * 100 : 0;

    const preflopRaises = decisions.filter(d => d.action === 'raise');
    const pfrRate = totalHands > 0 ? (preflopRaises.length / totalHands) * 100 : 0;

    return {
      totalHands,
      complianceRate,
      biggestWin,
      worstLoss,
      vpipRate,
      pfrRate
    };
  }, [tournaments, decisions]);

  if (metrics.totalHands === 0) return null;

  return (
    <div className="bg-[#15171f] border border-white/5 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Target size={18} className="text-[var(--color-accent)]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Lifetime Scorecard
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest font-bold flex items-center gap-1">
            <Clock size={12} /> Total Hands
          </span>
          <span className="text-xl font-data font-bold text-white">
            {metrics.totalHands.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest font-bold flex items-center gap-1">
            <CheckCircle size={12} /> GTO Compliance
          </span>
          <span className={clsx("text-xl font-data font-bold", metrics.complianceRate >= 85 ? "text-emerald-400" : "text-amber-400")}>
            {metrics.complianceRate.toFixed(1)}%
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest font-bold flex items-center gap-1">
            <Trophy size={12} /> Best Result
          </span>
          <span className="text-xl font-data font-bold text-emerald-400">
            +${Math.round(metrics.biggestWin).toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest font-bold flex items-center gap-1">
            <Trophy size={12} /> Worst Result
          </span>
          <span className="text-xl font-data font-bold text-red-400">
            ${Math.round(metrics.worstLoss).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 flex gap-8">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest font-bold">VPIP</span>
          <span className="text-sm font-data text-white">{metrics.vpipRate.toFixed(1)}%</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-widest font-bold">PFR</span>
          <span className="text-sm font-data text-white">{metrics.pfrRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
