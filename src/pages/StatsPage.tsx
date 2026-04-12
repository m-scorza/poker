/**
 * Statistics page — detailed stat breakdown.
 */

import { StatCard } from '../components/shared/StatCard';
import { useAppStore } from '../data/appStore';
import { computeAggregateStats } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';

export function StatsPage() {
  const { strategyProfile } = useAppStore();

  const aggregateStats = useLiveQuery(async () => {
    const raw = await db.heroDecisions.toArray();
    const checked = batchCheckCompliance(raw, strategyProfile);
    return computeAggregateStats(checked);
  }, [strategyProfile]);

  const pct = (n: number, d: number) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`);
  const s = aggregateStats;

  if (!s || s.totalHands === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-6">Estatísticas</h2>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center">
          <p className="text-[var(--color-text-dim)]">Importe mãos para ver estatísticas.</p>
        </div>
      </div>
    );
  }

  const af = s.totalCalls === 0
    ? (s.totalBets + s.totalRaises > 0 ? '∞' : '0')
    : ((s.totalBets + s.totalRaises) / s.totalCalls).toFixed(1);

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Estatísticas</h2>

      {/* Pre-flop */}
      <h3 className="text-sm text-[var(--color-text-dim)] uppercase tracking-wide mb-3">Pré-Flop</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="VPIP" value={pct(s.vpipHands, s.totalHands)} subtext={`${s.vpipHands}/${s.totalHands} mãos`} />
        <StatCard label="PFR" value={pct(s.pfrHands, s.totalHands)} subtext={`${s.pfrHands}/${s.totalHands} mãos`} />
        <StatCard label="3-bet %" value={pct(s.threeBetMade, s.threeBetOpps)} subtext={`${s.threeBetMade}/${s.threeBetOpps} oportunidades`} />
        <StatCard label="Limps" value={s.limpHands} accent={s.limpHands === 0 ? 'green' : 'red'} />
      </div>

      {/* Post-flop */}
      <h3 className="text-sm text-[var(--color-text-dim)] uppercase tracking-wide mb-3">Pós-Flop</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="C-bet Total" value={pct(s.cbetMade, s.cbetOpps)} subtext={`${s.cbetMade}/${s.cbetOpps} oportunidades`} />
        <StatCard label="C-bet HU" value={pct(s.cbetHUMade, s.cbetHUOpps)} subtext={`${s.cbetHUMade}/${s.cbetHUOpps} oportunidades`} />
        <StatCard label="Double Barrel" value={pct(s.doubleBarrelMade, s.doubleBarrelOpps)} subtext={`${s.doubleBarrelMade}/${s.doubleBarrelOpps} oportunidades`} />
        <StatCard label="AF" value={af} subtext="Aggression Factor" />
      </div>

      {/* Showdown */}
      <h3 className="text-sm text-[var(--color-text-dim)] uppercase tracking-wide mb-3">Showdown</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="WTSD" value={pct(s.wtsdHands, s.vpipHands)} subtext={`${s.wtsdHands} showdowns`} />
        <StatCard label="Won at SD" value={pct(s.wonSDHands, s.wtsdHands)} subtext={`${s.wonSDHands}/${s.wtsdHands} showdowns`} />
      </div>

      {/* Compliance */}
      <h3 className="text-sm text-[var(--color-text-dim)] uppercase tracking-wide mb-3">Compliance</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Range Compliance"
          value={pct(s.complianceCompliant, s.complianceEligible)}
          subtext={`${s.complianceCompliant}/${s.complianceEligible} decisões`}
          accent={
            s.complianceEligible > 0 && (s.complianceCompliant / s.complianceEligible) * 100 >= 90
              ? 'green'
              : 'red'
          }
        />
      </div>
    </div>
  );
}
