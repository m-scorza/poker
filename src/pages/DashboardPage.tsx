import { useState } from 'react';
import { StatCard } from '../components/shared/StatCard';
import { TrendChart } from '../components/dashboard/TrendChart';
import { useAppStore } from '../data/appStore';
import { db } from '../data/store';
import { computeAggregateStats, detectLeaks } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { groupIntoSessions, computeSessionTrends } from '../data/sessions';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { clsx } from 'clsx';
import type { LeakSeverity } from '../analysis/leakDetector';

const SEVERITY_COLORS: Record<LeakSeverity, string> = {
  critical: 'border-[var(--color-danger)] bg-red-900/20',
  high: 'border-[var(--color-warning)] bg-orange-900/15',
  medium: 'border-yellow-600 bg-yellow-900/10',
  low: 'border-[var(--color-border)] bg-[var(--color-bg-card)]',
};

const SEVERITY_LABELS: Record<LeakSeverity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export function DashboardPage() {
  const { strategyProfile } = useAppStore();
  const [activeSessionId, setActiveSessionId] = useState<string>('all');

  const totalHands = useLiveQuery(() => db.hands.count(), []) ?? 0;

  const data = useLiveQuery(async () => {
    const rawHands = await db.hands.toArray();
    const rawDecisions = await db.heroDecisions.toArray();
    const rawTournaments = await db.tournaments.toArray();
    
    const tMap = new Map(rawTournaments.map(t => [t.id, t]));
    const decisionMap = new Map(rawDecisions.map(d => [d.handId, d]));

    const sessionsGrouped = groupIntoSessions(rawHands, decisionMap, tMap);
    const trendData = computeSessionTrends(sessionsGrouped);

    // Filter Hands based on active session
    let filteredHands = rawHands;
    let filteredDecisions = rawDecisions;
    
    if (activeSessionId !== 'all') {
      const activeSession = sessionsGrouped.find(s => s.id === activeSessionId);
      if (activeSession) {
         filteredHands = activeSession.hands;
         filteredDecisions = filteredHands.map(h => decisionMap.get(h.id)).filter((d): d is NonNullable<typeof d> => d !== undefined);
      }
    }

    const checked = batchCheckCompliance(filteredDecisions, strategyProfile);
    const stats = computeAggregateStats(checked);
    const leaks = detectLeaks(stats, strategyProfile);
    
    const totalPnl = sessionsGrouped.reduce((sum, s) => sum + s.pnl, 0);

    return { stats, leaks, trendData, sessionsGrouped, totalPnl };
  }, [strategyProfile, activeSessionId]);

  const aggregateStats = data?.stats ?? null;
  const leaks = data?.leaks ?? [];
  const trendData = data?.trendData ?? [];
  const sessionsList = data?.sessionsGrouped ?? [];
  const totalPnl = data?.totalPnl ?? 0;

  const pct = (n: number, d: number) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-data text-white flex items-center gap-2">
            Dashboard 
            {totalPnl !== 0 && (
              <span className={clsx('text-base px-2 py-0.5 rounded-full', totalPnl > 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400')}>
                {totalPnl > 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            )}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">Visão geral e lucratividade</p>
        </div>

        <div className="flex bg-[var(--color-bg-card)] rounded-lg p-1 border border-[var(--color-border)] shadow-sm">
          <select 
            value={activeSessionId}
            onChange={(e) => setActiveSessionId(e.target.value)}
            className="bg-transparent text-sm text-[var(--color-text)] outline-none px-2 py-1 pr-8 cursor-pointer"
          >
            <option value="all">Todas as Sessões</option>
            {sessionsList.map(s => (
              <option key={s.id} value={s.id}>
                {s.startTime.toLocaleDateString()} — {s.totalHands} mãos
              </option>
            ))}
          </select>
        </div>
      </div>

      {totalHands === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center shadow-sm">
          <Target className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-50" size={48} />
          <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">Nenhuma mão importada</h3>
          <p className="text-[var(--color-text-dim)]">
             Vá para a guia "Mãos" para importar seus arquivos de histórico.
          </p>
        </div>
      ) : (
        <>
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1 border border-[var(--color-border)] rounded-xl bg-gradient-to-br from-blue-900/20 to-[var(--color-bg-card)] p-4 relative overflow-hidden">
               <div className="absolute -right-4 -top-4 opacity-10"><DollarSign size={80} /></div>
               <p className="text-xs text-blue-200 uppercase tracking-wider font-bold mb-1">Mãos Analisadas</p>
               <h3 className="text-3xl font-data font-bold text-white">{aggregateStats?.totalHands || 0}</h3>
            </div>
            
            {aggregateStats && (
              <>
                <StatCard
                  label="VPIP"
                  value={pct(aggregateStats.vpipHands, aggregateStats.totalHands)}
                  subtext="Voluntário no pote"
                  accent={
                    aggregateStats.totalHands > 0 &&
                    (aggregateStats.vpipHands / aggregateStats.totalHands) * 100 >= 20 &&
                    (aggregateStats.vpipHands / aggregateStats.totalHands) * 100 <= 30 ? 'green' : 'red'
                  }
                />
                <StatCard
                  label="PFR"
                  value={pct(aggregateStats.pfrHands, aggregateStats.totalHands)}
                  subtext="Raise pré-flop"
                  accent={
                    aggregateStats.totalHands > 0 &&
                    (aggregateStats.pfrHands / aggregateStats.totalHands) * 100 >= 15 &&
                    (aggregateStats.pfrHands / aggregateStats.totalHands) * 100 <= 23 ? 'green' : 'red'
                  }
                />
                <StatCard
                  label="GTO (Compliance)"
                  value={pct(aggregateStats.complianceCompliant, aggregateStats.complianceEligible)}
                  subtext="Conformidade ao Range"
                  accent={
                    aggregateStats.complianceEligible > 0 &&
                    (aggregateStats.complianceCompliant / aggregateStats.complianceEligible) * 100 >= 85 ? 'green' : 'warning'
                  }
                />
                 <StatCard
                  label="C-Bet HU"
                  value={pct(aggregateStats.cbetHUMade, aggregateStats.cbetHUOpps)}
                  subtext="Continuação HU"
                />
                <StatCard
                  label="WTSD"
                  value={pct(aggregateStats.wtsdHands, aggregateStats.vpipHands)}
                  subtext="Vai ao SD pós-flop"
                />
                <StatCard
                  label="Won at SD"
                  value={pct(aggregateStats.wonSDHands, aggregateStats.wtsdHands)}
                  subtext="Vitória no SD"
                />
                 <StatCard
                  label="Limps"
                  value={aggregateStats.limpHands}
                  subtext="Limpings Open"
                  accent={aggregateStats.limpHands === 0 ? 'green' : 'red'}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PNL Chart */}
            {trendData.length >= 2 && activeSessionId === 'all' && (
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
                <h3 className="text-[var(--color-text)] font-semibold mb-4 flex justify-between">
                  <span>Gráfico de Lucros (PnL)</span>
                  <span className="text-xs text-[var(--color-text-dim)] font-normal">Cumulativo por sessão ($$)</span>
                </h3>
                <div className="h-64">
                   <TrendChart
                    data={trendData}
                    metrics={[ { key: 'cumulativePnl', label: 'Lucro Total ($)', color: '#10b981' } ]}
                  />
                </div>
              </div>
            )}
            
            {/* Stat Chart */}
            {trendData.length >= 2 && activeSessionId === 'all' && (
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
                <h3 className="text-[var(--color-text)] font-semibold mb-4 flex justify-between">
                  <span>Evolução Técnica</span>
                  <span className="text-xs text-[var(--color-text-dim)] font-normal">VPIP, PFR %</span>
                </h3>
                <div className="h-64">
                   <TrendChart
                    data={trendData}
                    metrics={[
                      { key: 'vpip', label: 'VPIP', color: '#3b82f6' },
                      { key: 'pfr', label: 'PFR', color: '#8b5cf6' },
                      { key: 'compliance', label: 'Compliance', color: '#f59e0b' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Leak alerts */}
          {leaks.length > 0 && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <AlertTriangle size={18} className="text-[var(--color-warning)]" />
                Leaks Detectados ({leaks.length}) na {activeSessionId === 'all' ? 'Amostra Geral' : `Sessão Selecionada`}
              </h3>
              <div className="space-y-3">
                {leaks.map((leak) => (
                  <div
                    key={leak.id}
                    className={clsx(
                      'border rounded-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors',
                      SEVERITY_COLORS[leak.severity],
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-data font-bold text-sm text-[var(--color-text)]">{leak.name}</span>
                        <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded bg-black/40 text-white/90">
                          {SEVERITY_LABELS[leak.severity]}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-dim)] pr-4">{leak.description}</p>
                    </div>
                    <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[var(--color-border)]/50 pt-3 sm:pt-0 sm:pl-4">
                      <div className="text-right">
                        <p className="font-data font-bold text-xl text-white">
                          {leak.value}%
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">
                          Alvo: {leak.target[0]}–{leak.target[1]}%
                        </p>
                      </div>
                      <div className="w-8 flex justify-end">
                        {leak.value < leak.target[0] ? (
                          <TrendingDown size={20} className="text-[var(--color-danger)]" />
                        ) : (
                          <TrendingUp size={20} className="text-[var(--color-warning)]" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
