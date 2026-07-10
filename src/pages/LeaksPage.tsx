/**
 * Leaks page — prioritized leak display with severity, impact, and next actions.
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle, Crosshair, TrendingDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../data/appStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getRecentImportRuns, getLeakStatuses, reconcileLeakStatusesOnImport, setLeakStudying, stopStudyingLeak } from '../data/store';
import { DemoDataButton } from '../components/shared/DemoDataButton';
import { summarizeDataHealth, type DataHealthSummary } from '../data/importRuns';
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
  vpip_pfr_gap: { source: '[09-study §4]', doc: 'docs/knowledge/strategy/09-study-methods-and-tools.md' },
};

const LEAK_FINDER_EVIDENCE = createEvidence('rule_based', [
  {
    docPath: KB_PATHS.studyMethods,
    section: '4. Leak Finder Framework',
    quote: 'Create a study plan targeting the biggest leaks first',
  },
]);

const PREFLOP_RANGE_EVIDENCE = createEvidence('rule_based', [
  {
    docPath: KB_PATHS.rangesAndPosition,
    section: '3. RFI Ranges by Stack Depth',
    quote: 'Reference chipEV range percentages from study tables.',
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

interface LeakDataHealthNotice {
  tone: 'warning' | 'danger';
  kicker: string;
  title: string;
  message: string;
  cta: string;
  details: Array<{ label: string; value: string }>;
}

function formatRate(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

function formatWarningCategories(dataHealth: DataHealthSummary): string {
  const categories = dataHealth.ledger.warningCategories.slice(0, 3);
  if (categories.length === 0) return 'No categorized warnings retained';
  const extraCount = dataHealth.ledger.warningCategories.length - categories.length;
  const label = categories.map((row) => `${row.label} ${row.count}`).join(' · ');
  return extraCount > 0 ? `${label} · +${extraCount} more` : label;
}

function analysisPostureLabel(dataHealth: DataHealthSummary): string {
  if (dataHealth.ledger.analysisPosture === 'blocked') return 'Blocked until Data Health review';
  if (dataHealth.ledger.analysisPosture === 'directional') return 'Directional only';
  if (dataHealth.ledger.analysisPosture === 'ready') return 'Ready';
  return 'No import ledger';
}

export function buildLeakDataHealthNotice(dataHealth: DataHealthSummary): LeakDataHealthNotice | null {
  if (dataHealth.status !== 'ready' || (dataHealth.confidence !== 'low' && dataHealth.confidence !== 'medium')) {
    return null;
  }

  const isBlocked = dataHealth.confidence === 'low';
  return {
    tone: isBlocked ? 'danger' : 'warning',
    kicker: isBlocked ? 'Action Required' : 'Directional Analysis',
    title: isBlocked
      ? 'Leak grading is blocked by low-confidence import data'
      : 'Leak grading is directional until import warnings are reviewed',
    message: isBlocked
      ? 'Some leak cards may be incomplete or biased because the latest local import has failures, unsupported formats, or parser gaps. Fix Data Health before treating missing or refused spots as clean.'
      : 'Current leak cards remain useful, but unparsed files, summary gaps, or unsupported sources can hide ungraded spots. Review Data Health before turning these findings into drills.',
    cta: '/hands?panel=data-health#data-health',
    details: [
      { label: 'Analysis posture', value: analysisPostureLabel(dataHealth) },
      {
        label: 'Files parsed',
        value: `${dataHealth.ledger.parsedFiles}/${dataHealth.ledger.totalFiles} (${formatRate(dataHealth.ledger.parsedFileRate)})`,
      },
      {
        label: 'Saved records',
        value: `${dataHealth.ledger.savedHands} hands / ${dataHealth.ledger.savedSummaries} summaries`,
      },
      { label: 'Failed files', value: String(dataHealth.ledger.failedFiles) },
      { label: 'Top warning categories', value: formatWarningCategories(dataHealth) },
    ],
  };
}

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

  // Switching strategy profile re-measures the leak set instantly (the live query
  // above), but the persisted lifecycle only advances at import. Without this, a
  // studied leak that only exists under one profile would vanish from the leak list
  // AND never get a tombstone (resolvedAt stays null) — untracked, not resolved.
  // Reconcile on profile change so it lands in the graveyard instead of disappearing.
  useEffect(() => {
    void reconcileLeakStatusesOnImport(strategyProfile);
  }, [strategyProfile]);

  const leaks = data?.leaks ?? [];
  const totalHands = data?.totalHands ?? 0;
  const prioritizedLeaks = [...leaks].sort((a, b) => impactScore(b) - impactScore(a));
  const topLeak = prioritizedLeaks[0] ?? null;
  const dataHealthNotice = buildLeakDataHealthNotice(dataHealth);

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
      {dataHealthNotice && (
        <section
          className={clsx(
            'rounded-2xl border p-4 text-xs shadow-md',
            dataHealthNotice.tone === 'danger'
              ? 'border-[var(--loss)]/30 bg-red-950/20 text-red-100/90 shadow-red-950/10'
              : 'border-warn/30 bg-warn/10 text-[var(--fg-dim)]',
          )}
          data-testid="leaks-data-health-notice"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={clsx(
                'mt-0.5 h-[18px] w-[18px] shrink-0',
                dataHealthNotice.tone === 'danger' ? 'text-[var(--loss)]' : 'text-warn',
              )}
            />
            <div className="min-w-0 flex-1">
              <span className="font-bold uppercase tracking-wider" data-testid="leaks-data-health-kicker">
                {dataHealthNotice.kicker}
              </span>
              <h2 className="mt-1 text-base font-black text-white" data-testid="leaks-data-health-title">
                {dataHealthNotice.title}
              </h2>
              <p className="mt-2 max-w-4xl leading-relaxed" data-testid="leaks-data-health-message">
                {dataHealthNotice.message}
              </p>
              <dl className="mt-3 grid gap-2 md:grid-cols-5" data-testid="leaks-data-health-details">
                {dataHealthNotice.details.map((detail) => (
                  <div key={detail.label} className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <dt className="text-[9px] font-black uppercase tracking-wider text-white/45">{detail.label}</dt>
                    <dd className="mt-1 font-data text-[11px] font-bold text-white/80">{detail.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3">
                <Link
                  to={dataHealthNotice.cta}
                  className="inline-flex items-center gap-1 font-bold text-white hover:underline uppercase tracking-wider text-[10px]"
                  data-testid="leaks-data-health-link"
                >
                  Review Data Health &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>
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
                      <p className="mt-2">{evidence.caveat}</p>
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
