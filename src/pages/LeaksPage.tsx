/**
 * Leaks page — prioritized leak display with severity, impact, and next actions.
 */

import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle, Crosshair, TrendingDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../data/appStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { DemoDataButton } from '../components/shared/DemoDataButton';
import { computeAggregateStats, detectLeaks } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import type { Leak, LeakSeverity } from '../analysis/leakDetector';

/** Strategy source attribution per leak ID. Maps to docs/knowledge/strategy/ sections. */
const LEAK_SOURCES: Record<string, { source: string; doc: string }> = {
  vpip: { source: '[09-study §4]', doc: 'docs/knowledge/strategy/09-study-methods-and-tools.md' },
  pfr: { source: '[09-study §4]', doc: 'docs/knowledge/strategy/09-study-methods-and-tools.md' },
  three_bet: { source: '[09-study §4]', doc: 'docs/knowledge/strategy/09-study-methods-and-tools.md' },
  cbet_total: { source: '[09-study §4, 04-postflop §2]', doc: 'docs/knowledge/strategy/04-postflop-strategy.md' },
  cbet_hu: { source: '[Baseline, 04-postflop §2]', doc: 'docs/knowledge/strategy/04-postflop-strategy.md' },
  wtsd: { source: '[09-study §4]', doc: 'docs/knowledge/strategy/09-study-methods-and-tools.md' },
  won_sd: { source: '[09-study §4]', doc: 'docs/knowledge/strategy/09-study-methods-and-tools.md' },
  limps: { source: '[Baseline]', doc: 'docs/knowledge/strategy/03-preflop-strategy.md' },
  compliance: { source: '[Baseline, 02-ranges §3]', doc: 'docs/knowledge/strategy/02-ranges-and-position.md' },
  vpip_pfr_gap: { source: '[08-gto §3]', doc: 'docs/knowledge/strategy/08-gto-and-exploits.md' },
};

const SEVERITY_COLORS: Record<LeakSeverity, string> = {
  critical: 'border-[var(--color-danger)] bg-red-950/30 shadow-red-950/20',
  high: 'border-[var(--color-warning)] bg-orange-950/25 shadow-orange-950/20',
  medium: 'border-yellow-600/70 bg-yellow-950/15 shadow-yellow-950/10',
  low: 'border-[var(--color-border)] glass-card shadow-black/10',
};

const SEVERITY_BADGES: Record<LeakSeverity, { bg: string; text: string; label: string; weight: number }> = {
  critical: { bg: 'bg-[var(--color-danger)]/20', text: 'text-[var(--color-danger)]', label: 'CRITICAL', weight: 4 },
  high: { bg: 'bg-[var(--color-warning)]/20', text: 'text-[var(--color-warning)]', label: 'HIGH', weight: 3 },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'MEDIUM', weight: 2 },
  low: { bg: 'bg-gray-500/20', text: 'text-[var(--color-text-dim)]', label: 'LOW', weight: 1 },
};

function impactScore(leak: Leak): number {
  return Math.round(SEVERITY_BADGES[leak.severity].weight * 25 + Math.min(40, Math.abs(leak.deviation)) + Math.min(20, leak.sampleSize / 10));
}

function actionForLeak(leak: Leak): string {
  if (leak.id === 'vpip') return 'Cut weakest opens/calls first. Review every out-of-range VPIP hand before the next session.';
  if (leak.id === 'pfr') return 'Restore raise-first discipline. Separate hands you should raise from hands you should simply fold.';
  if (leak.id === 'limps') return 'Zero-limp challenge: every non-BB limp becomes raise or fold until the count is gone.';
  if (leak.id === 'cbet_hu') return 'Drill heads-up IP c-bets: default to 33% pot until a clear exception appears.';
  if (leak.id === 'cbet_total') return 'Filter missed c-bet spots and classify boards where pressure was skipped.';
  if (leak.id === 'compliance') return 'Open the Range Matrix and fix the worst red combo/position pair first.';
  if (leak.id === 'three_bet') return 'Tag every 3-bet opportunity and compare versus position/open size.';
  if (leak.id === 'wtsd' || leak.id === 'won_sd') return 'Review showdown hands: mark thin calls, missed value bets, and station calls.';
  return 'Review the sample hands behind this metric and tag the repeating decision pattern.';
}

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
  const prioritizedLeaks = [...leaks].sort((a, b) => impactScore(b) - impactScore(a));
  const topLeak = prioritizedLeaks[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-accent)]">Leak Inbox</p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">Fix the most expensive pattern first</h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-dim)]">
            Competitor trackers bury this inside reports. This page turns your stats into a prioritized repair queue with one concrete action per leak.
          </p>
        </div>
        {topLeak && (
          <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-danger)]">Start here</p>
            <p className="font-data text-lg font-black text-white">#{prioritizedLeaks.indexOf(topLeak) + 1} {topLeak.name}</p>
          </div>
        )}
      </div>

      {totalHands === 0 ? (
        <div className="glass-card border border-[var(--color-border)] rounded-xl p-8 text-center">
          <p className="font-semibold text-white">No leak evidence loaded yet.</p>
          <p className="mt-2 mb-6 text-sm text-[var(--color-text-dim)]">Import hands or load the synthetic demo to see the prioritized leak repair queue.</p>
          <DemoDataButton label="Load demo leak inbox" />
        </div>
      ) : leaks.length === 0 ? (
        <div className="bg-emerald-900/10 border border-emerald-600/30 rounded-xl p-8 text-center">
          <CheckCircle size={32} className="mx-auto mb-3 text-[var(--color-accent)]" />
          <p className="text-[var(--color-accent)] font-semibold mb-1">No leaks detected!</p>
          <p className="text-sm text-[var(--color-text-dim)]">
            All metrics are within {strategyProfile === 'game_plan' ? 'Baseline' : 'Advanced'} profile targets.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 glass-card p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Detected leaks</p>
              <p className="mt-2 font-data text-3xl font-black text-white">{leaks.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 glass-card p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Evidence sample</p>
              <p className="mt-2 font-data text-3xl font-black text-white">{totalHands}</p>
            </div>
            <div className="rounded-xl border border-white/10 glass-card p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Profile</p>
              <p className="mt-2 font-data text-xl font-black text-[var(--color-accent)]">{strategyProfile === 'game_plan' ? 'Baseline' : 'Advanced'}</p>
            </div>
          </div>

          {prioritizedLeaks.map((leak, index) => {
            const badge = SEVERITY_BADGES[leak.severity];
            const score = impactScore(leak);
            return (
              <div
                key={leak.id}
                className={clsx('rounded-2xl border p-5 shadow-xl', SEVERITY_COLORS[leak.severity])}
              >
                <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-black/30 px-2 py-1 font-data text-xs font-black text-white/70">#{index + 1}</span>
                      <AlertTriangle size={16} className={badge.text} />
                      <span className="font-data text-lg font-black uppercase text-white">{leak.name}</span>
                      <span className={clsx('text-[10px] px-2 py-1 rounded font-black', badge.bg, badge.text)}>
                        {badge.label}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-black uppercase text-white/45">
                        Impact {score}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-[var(--color-text-dim)]">{leak.description}</p>

                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">
                        <Crosshair size={13} /> Fix this now
                      </p>
                      <p className="text-sm font-semibold leading-relaxed text-white">{actionForLeak(leak)}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)]">
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

                  <div className="flex flex-col justify-between gap-4 lg:w-56 lg:text-right">
                    <div>
                      <div className="flex items-center gap-2 lg:justify-end">
                        {leak.value < leak.target[0] ? (
                          <TrendingDown size={18} className="text-[var(--color-danger)]" />
                        ) : (
                          <TrendingUp size={18} className="text-[var(--color-warning)]" />
                        )}
                        <span className="font-data text-3xl font-black text-white">{leak.value}%</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        Target: {leak.target[0]}–{leak.target[1]}%
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        to="/hands"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-white/15"
                      >
                        Review hands <ArrowRight size={13} />
                      </Link>
                      <Link
                        to={leak.id === 'compliance' ? '/ranges' : '/career'}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-white/70 transition hover:border-white/25 hover:text-white"
                      >
                        {leak.id === 'compliance' ? 'Open ranges' : 'Open coach'}
                      </Link>
                    </div>
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
