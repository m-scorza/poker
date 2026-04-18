/**
 * Leaks page — detailed leak display with severity and recommendations.
 */

import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../data/appStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { computeAggregateStats, detectLeaks } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import type { LeakSeverity } from '../analysis/leakDetector';

/** Strategy source attribution per leak ID. Maps to docs/strategy/ sections. */
const LEAK_SOURCES: Record<string, { source: string; doc: string }> = {
  vpip: { source: '[09-study §4]', doc: 'docs/strategy/09-study-methods-and-tools.md' },
  pfr: { source: '[09-study §4]', doc: 'docs/strategy/09-study-methods-and-tools.md' },
  three_bet: { source: '[09-study §4]', doc: 'docs/strategy/09-study-methods-and-tools.md' },
  cbet_total: { source: '[09-study §4, 04-postflop §2]', doc: 'docs/strategy/04-postflop-strategy.md' },
  cbet_hu: { source: '[GamePlan, 04-postflop §2]', doc: 'docs/strategy/04-postflop-strategy.md' },
  wtsd: { source: '[09-study §4]', doc: 'docs/strategy/09-study-methods-and-tools.md' },
  won_sd: { source: '[09-study §4]', doc: 'docs/strategy/09-study-methods-and-tools.md' },
  limps: { source: '[GamePlan]', doc: 'docs/strategy/03-preflop-strategy.md' },
  compliance: { source: '[GamePlan, 02-ranges §3]', doc: 'docs/strategy/02-ranges-and-position.md' },
  vpip_pfr_gap: { source: '[08-gto §3]', doc: 'docs/strategy/08-gto-and-exploits.md' },
};

const SEVERITY_COLORS: Record<LeakSeverity, string> = {
  critical: 'border-[var(--color-danger)] bg-red-900/20',
  high: 'border-[var(--color-warning)] bg-orange-900/15',
  medium: 'border-yellow-600 bg-yellow-900/10',
  low: 'border-[var(--color-border)] bg-[var(--color-bg-card)]',
};

const SEVERITY_BADGES: Record<LeakSeverity, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-[var(--color-danger)]/20', text: 'text-[var(--color-danger)]', label: 'CRITICAL' },
  high: { bg: 'bg-[var(--color-warning)]/20', text: 'text-[var(--color-warning)]', label: 'HIGH' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'MEDIUM' },
  low: { bg: 'bg-gray-500/20', text: 'text-[var(--color-text-dim)]', label: 'LOW' },
};

export function LeaksPage() {
  const { strategyProfile } = useAppStore();

  const data = useLiveQuery(async () => {
    const raw = await db.heroDecisions.toArray();
    const checked = batchCheckCompliance(raw, strategyProfile);
    const stats = computeAggregateStats(checked);
    const leaks = detectLeaks(stats, strategyProfile);
    return { leaks, totalHands: checked.length };
  }, [strategyProfile]);

  const leaks = data?.leaks ?? [];
  const totalHands = data?.totalHands ?? 0;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Leak Detector</h2>

      {totalHands === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center">
          <p className="text-[var(--color-text-dim)]">Import hands to detect leaks.</p>
        </div>
      ) : leaks.length === 0 ? (
        <div className="bg-emerald-900/10 border border-emerald-600/30 rounded-xl p-8 text-center">
          <CheckCircle size={32} className="mx-auto mb-3 text-[var(--color-accent)]" />
          <p className="text-[var(--color-accent)] font-semibold mb-1">No leaks detected!</p>
          <p className="text-sm text-[var(--color-text-dim)]">
            All metrics are within {strategyProfile === 'game_plan' ? 'Game Plan' : 'Advanced'} profile targets.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-dim)] mb-4">
            {leaks.length} leak{leaks.length > 1 ? 's' : ''} detected across {totalHands} hands
            — Profile: <span className="font-data text-[var(--color-accent)]">{strategyProfile === 'game_plan' ? 'Game Plan' : 'Advanced'}</span>
          </p>

          {leaks.map((leak) => {
            const badge = SEVERITY_BADGES[leak.severity];
            return (
              <div
                key={leak.id}
                className={clsx('border rounded-xl p-4', SEVERITY_COLORS[leak.severity])}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={16} className={badge.text} />
                      <span className="font-data font-bold">{leak.name}</span>
                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-bold', badge.bg, badge.text)}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-dim)] mb-2">{leak.description}</p>
                    <div className="flex gap-4 text-xs text-[var(--color-text-muted)]">
                      <span>Sample: {leak.sampleSize} hands</span>
                      <span>Deviation: {leak.deviation > 0 ? '+' : ''}{leak.deviation}pp</span>
                      {LEAK_SOURCES[leak.id] && (
                        <span
                          className="flex items-center gap-1 text-[var(--color-info)] cursor-help"
                          title={`Source: ${LEAK_SOURCES[leak.id]!.source}\nReference: ${LEAK_SOURCES[leak.id]!.doc}`}
                        >
                          <BookOpen size={10} />
                          {LEAK_SOURCES[leak.id]!.source}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-6 shrink-0">
                    <div className="flex items-center gap-2 justify-end">
                      {leak.value < leak.target[0] ? (
                        <TrendingDown size={18} className="text-[var(--color-danger)]" />
                      ) : (
                        <TrendingUp size={18} className="text-[var(--color-warning)]" />
                      )}
                      <span className="font-data text-2xl font-bold">{leak.value}%</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Target: {leak.target[0]}–{leak.target[1]}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
