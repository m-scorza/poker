/**
 * Leaks page — prioritized leak display with severity, impact, and next actions.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle, Crosshair, TrendingDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../data/appStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getRecentImportRuns, getLeakStatuses, setLeakStudying, stopStudyingLeak } from '../data/store';
import { DemoDataButton } from '../components/shared/DemoDataButton';
import { summarizeDataHealth } from '../data/importRuns';
import { computeAggregateStats, detectLeaks } from '../analysis/leakDetector';
import { deriveLeakLifecycle } from '../analysis/leakLifecycle';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import type { Leak, LeakSeverity } from '../analysis/leakDetector';
import { KB_PATHS, createEvidence, type Evidence } from '../types/evidence';
import { getEvidenceMetadata } from '../utils/evidence';

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

const LEAK_FINDER_EVIDENCE = createEvidence('rule_based', [
  {
    docPath: KB_PATHS.studyMethods,
    section: '4. Leak Finder Framework',
    quote: 'Compare each stat against known GTO ranges',
  },
]);

const PREFLOP_RANGE_EVIDENCE = createEvidence('rule_based', [
  {
    docPath: KB_PATHS.rangesAndPosition,
    section: '3. RFI Ranges by Stack Depth',
    quote: 'Reference ranges from solver outputs (chipEV).',
  },
]);

const POSTFLOP_PROXY_EVIDENCE = createEvidence('proxy_model', [
  {
    docPath: KB_PATHS.postflopStrategy,
    section: '2. C-Bet Strategy',
    quote: 'even weak hands benefit from denying equity',
  },
], 'Frequency heuristic only. No solver EV is attached; use this as a study prompt until the spot is manually reviewed.');

const SHOWDOWN_PROXY_EVIDENCE = createEvidence('proxy_model', [
  {
    docPath: KB_PATHS.studyMethods,
    section: '4. Leak Finder Framework',
    quote: 'WTSD | ~25-30%',
  },
], 'Database stat baseline only. Use the hands behind the sample before changing river strategy.');

const LEAK_EVIDENCE: Record<string, Evidence> = {
  vpip: LEAK_FINDER_EVIDENCE,
  pfr: LEAK_FINDER_EVIDENCE,
  three_bet: LEAK_FINDER_EVIDENCE,
  cbet_total: POSTFLOP_PROXY_EVIDENCE,
  cbet_hu: POSTFLOP_PROXY_EVIDENCE,
  wtsd: SHOWDOWN_PROXY_EVIDENCE,
  won_sd: SHOWDOWN_PROXY_EVIDENCE,
  limps: LEAK_FINDER_EVIDENCE,
  compliance: PREFLOP_RANGE_EVIDENCE,
  vpip_pfr_gap: LEAK_FINDER_EVIDENCE,
};

const SEVERITY_COLORS: Record<LeakSeverity, string> = {
  critical: 'border-[var(--loss-line)] bg-[var(--loss-soft)]',
  high: 'border-[var(--loss-line)] bg-[var(--loss-soft)] opacity-80',
  medium: 'border-warn/50 bg-warn/8',
  low: 'compartment',
};

const SEVERITY_BADGES: Record<LeakSeverity, { bg: string; text: string; label: string; weight: number }> = {
  critical: { bg: 'bg-[var(--loss-soft)]', text: 'text-[var(--loss)]', label: 'CRITICAL', weight: 4 },
  high: { bg: 'bg-[var(--loss-soft)]', text: 'text-[var(--loss)]', label: 'HIGH', weight: 3 },
  medium: { bg: 'bg-warn/15', text: 'text-warn', label: 'MEDIUM', weight: 2 },
  low: { bg: 'bg-white/5', text: 'text-[var(--fg-dim)]', label: 'LOW', weight: 1 },
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

/** Readable label for a leak id used in the graveyard (the resolved leak isn't recomputed). */
function formatLeakId(leakId: string): string {
  const base = leakId.startsWith('postflop_')
    ? `Postflop: ${leakId.slice('postflop_'.length).replace(/_/g, ' ')}`
    : leakId.replace(/_/g, ' ');
  return base.replace(/\b(vpip|pfr|hu|sd|wtsd)\b/gi, (m) => m.toUpperCase()).replace(/\bcbet\b/gi, 'C-bet');
}

function formatResolvedDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date) : '';
}

export function LeaksPage() {
  const { strategyProfile } = useAppStore();
  const recentImportRuns = useLiveQuery(() => getRecentImportRuns(1), [], []);
  const dataHealth = summarizeDataHealth(recentImportRuns ?? []);

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

  // Leak lifecycle (living entities): which leaks the user is studying, and the
  // "graveyard" of studied leaks that no longer fire in the current data.
  const leakStatuses = useLiveQuery(() => getLeakStatuses(), [], []);
  const statusMap = useMemo(
    () => new Map((leakStatuses ?? []).map((r) => [r.leakId, r] as const)),
    [leakStatuses],
  );
  const liveLeakIds = useMemo(() => new Set((data?.leaks ?? []).map((l) => l.id)), [data]);
  const resolvedLeaks = (leakStatuses ?? []).filter((r) => r.resolvedAt !== null && !liveLeakIds.has(r.leakId));

  return (
    <div className="space-y-6">
      {dataHealth.status === 'ready' && (dataHealth.confidence === 'low' || dataHealth.confidence === 'medium') && (
        <div className={clsx(
          'flex items-start gap-3 rounded-xl border p-4 text-xs shadow-md',
          dataHealth.confidence === 'low'
            ? 'border-[var(--loss)]/30 bg-red-950/20 text-red-100/90 shadow-red-950/10'
            : 'border-warn/30 bg-warn/10 text-[var(--fg-dim)]'
        )}>
          <AlertTriangle className={clsx(
            'mt-0.5 h-[18px] w-[18px] shrink-0',
            dataHealth.confidence === 'low' ? 'text-[var(--loss)]' : 'text-warn'
          )} />
          <div>
            <span className="font-bold uppercase tracking-wider">
              {dataHealth.confidence === 'low' ? 'Action Required' : 'Directional Analysis'}:
            </span>{' '}
            {dataHealth.confidence === 'low'
              ? 'Your latest import encountered significant warnings or failures. Downstream leak analysis may be incomplete or biased. Fix import warnings in the Upload tab before trusting metrics.'
              : 'Your latest import completed with minor warnings. Statistics are highly useful but should be treated as directional.'}
            <div className="mt-2">
              <Link
                to="/hands"
                className="inline-flex items-center gap-1 font-bold text-white hover:underline uppercase tracking-wider text-[10px]"
              >
                Review Import Warnings &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-[var(--hairline)] pb-4 mb-6">
        <div>
          <span className="kick sig">Leak Inbox</span>
          <h1 style={{ marginTop: 4, marginBottom: 0 }}>Review the highest-risk pattern first</h1>
          <p className="lede mt-2 max-w-3xl">
            This page turns your stats into a prioritized review queue with evidence labels, sample counts, and caveats for each recommendation.
          </p>
        </div>
        {topLeak && (
          <div className="compartment text-right" style={{ padding: '12px 16px', margin: 0 }}>
            <span className="kick text-[var(--loss)]">Start here</span>
            <p className="font-mono text-lg font-bold text-[var(--fg)]">#{prioritizedLeaks.indexOf(topLeak) + 1} {topLeak.name}</p>
          </div>
        )}
      </div>

      {totalHands === 0 ? (
        <div className="compartment text-center py-8">
          <p className="font-bold text-[var(--fg)]">No leak evidence loaded yet.</p>
          <p className="mt-2 mb-6 text-sm text-[var(--fg-dim)]">Import hands or load the synthetic demo to see the prioritized leak review queue.</p>
          <DemoDataButton label="Load demo leak inbox" />
        </div>
      ) : prioritizedLeaks.length === 0 ? (
        <div className="compartment text-center py-8 border-[var(--money-line)] bg-[var(--money-soft)]">
          <CheckCircle size={32} className="mx-auto mb-3 text-[var(--money)]" />
          <p className="text-[var(--money)] font-bold mb-1">No leaks detected!</p>
          <p className="text-sm text-[var(--fg-dim)]">
            All metrics are within {strategyProfile === 'game_plan' ? 'Baseline' : 'Advanced'} profile targets.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="compartment">
              <span className="kick">Detected leaks</span>
              <p className="mt-2 font-mono text-3xl font-bold text-[var(--fg)]">{leaks.length}</p>
            </div>
            <div className="compartment">
              <span className="kick">Evidence sample</span>
              <p className="mt-2 font-mono text-3xl font-bold text-[var(--fg)]">{totalHands}</p>
            </div>
            <div className="compartment">
              <span className="kick">Profile</span>
              <p className="mt-2 font-mono text-xl font-bold text-[var(--accent)]">{strategyProfile === 'game_plan' ? 'Baseline' : 'Advanced'}</p>
            </div>
          </div>

          {prioritizedLeaks.map((leak, index) => {
            const badge = SEVERITY_BADGES[leak.severity];
            const score = impactScore(leak);
            const source = LEAK_SOURCES[leak.id];
            const evidence = getEvidenceMetadata(leak.id, undefined, LEAK_EVIDENCE[leak.id]);
            const record = statusMap.get(leak.id);
            const lifecycle = deriveLeakLifecycle(record, true);
            return (
              <div
                key={leak.id}
                className={clsx('compartment flex flex-col', SEVERITY_COLORS[leak.severity])}
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
                      <span
                        className={clsx('rounded-full border px-2 py-1 text-[10px] font-black uppercase cursor-help', evidence.badgeClass)}
                        title={evidence.tooltip}
                      >
                        {evidence.label}
                      </span>
                      <span
                        className={clsx('rounded-full border px-2 py-1 text-[10px] font-black uppercase cursor-help', evidence.strengthClass)}
                        title={evidence.caveat}
                      >
                        {evidence.strengthLabel}
                      </span>
                      <span
                        className={clsx('rounded-full border px-2 py-1 text-[10px] font-black uppercase cursor-help', evidence.citationClass)}
                        title={evidence.citationTooltip}
                      >
                        {evidence.citationLabel}
                      </span>
                      {lifecycle === 'studying' && (
                        <span className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-1 text-[10px] font-black uppercase text-[var(--accent)]">Studying</span>
                      )}
                      {lifecycle === 'regressed' && (
                        <span className="rounded-full border border-warn/40 bg-warn/15 px-2 py-1 text-[10px] font-black uppercase text-warn">Regressed</span>
                      )}
                    </div>

                    <p className="text-sm leading-relaxed text-[var(--fg-dim)] mt-2">{leak.description}</p>

                    <div className="mt-4 border-t border-[var(--hairline)] pt-4">
                      <p className="kick sig mb-1 flex items-center gap-2">
                        <Crosshair size={13} /> Next review step
                      </p>
                      <p className="text-sm font-bold leading-relaxed text-[var(--fg)]">{actionForLeak(leak)}</p>
                      <p className="inner-rule mt-2">{evidence.caveat}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--fg-muted)]">
                      <span>Sample: <span className="font-mono">{leak.sampleSize}</span> hands</span>
                      <span>Deviation: <span className="font-mono">{leak.deviation > 0 ? '+' : ''}{leak.deviation}pp</span></span>
                      {source && (
                        <span
                          className="flex items-center gap-1 text-[var(--sig)] cursor-help"
                          title={`Source: ${source.source}\nReference: ${source.doc}`}
                        >
                          <BookOpen size={10} />
                          {source.source}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4 lg:w-56 lg:text-right">
                    <div>
                      <div className="flex items-center gap-2 lg:justify-end">
                        {leak.value < leak.target[0] ? (
                          <TrendingDown size={18} className="text-[var(--loss)]" />
                        ) : (
                          <TrendingUp size={18} className="text-[var(--loss)]" />
                        )}
                        <span className="font-mono text-3xl font-bold text-[var(--fg)]">{leak.value}%</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--fg-muted)]">
                        Target: {leak.target[0]}–{leak.target[1]}%
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        to="/hands"
                        className="btn inline-flex items-center justify-center gap-2"
                      >
                        Review hands <ArrowRight size={13} />
                      </Link>
                      <Link
                        to={leak.id === 'compliance' ? '/ranges' : '/career'}
                        className="btn outline inline-flex items-center justify-center gap-2"
                      >
                        {leak.id === 'compliance' ? 'Open ranges' : 'Open coach'}
                      </Link>
                      {record ? (
                        <button
                          type="button"
                          onClick={() => { void stopStudyingLeak(leak.id); }}
                          className="btn outline inline-flex items-center justify-center gap-2 text-[var(--accent)]"
                        >
                          Studying ✓
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { void setLeakStudying(leak.id); }}
                          className="btn outline inline-flex items-center justify-center gap-2"
                        >
                          Mark as studying
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolvedLeaks.length > 0 && (
        <section className="compartment border-[var(--money-line)]">
          <span className="kick text-[var(--money)]">Leaks you&apos;ve killed</span>
          <p className="lede mt-2 max-w-3xl">
            Leaks you marked and beat — no longer flagged in your current data. If one comes back, it
            shows as <span className="font-bold text-warn">Regressed</span> above.
          </p>
          <ul className="mt-4 space-y-2">
            {resolvedLeaks.map((r) => (
              <li
                key={r.leakId}
                className="flex items-center justify-between gap-3 rounded border border-[var(--hairline)] bg-[var(--ink-1)] px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-[var(--money)]" />
                  <span className="font-data font-bold text-[var(--fg)]">{formatLeakId(r.leakId)}</span>
                </span>
                <span className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                  <span>resolved {formatResolvedDate(r.resolvedAt)}</span>
                  <button
                    type="button"
                    onClick={() => { void stopStudyingLeak(r.leakId); }}
                    className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)] hover:text-[var(--fg)]"
                  >
                    dismiss
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
