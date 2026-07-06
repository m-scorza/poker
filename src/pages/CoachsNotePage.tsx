/**
 * Coach's Note — the atomic "what should I study right now, and why?" page.
 *
 * Renders the discriminated `CoachsNote`: not enough data, genuinely clean, or a
 * focus leak with its receipt hands and a drill. It operates on the current
 * dataset (no week/date windowing) and never invents a signal it doesn't have —
 * the empty-receipts case says so plainly.
 */

import { Link } from 'react-router-dom';
import { Crosshair, Zap, ArrowRight, CheckCircle, Inbox } from 'lucide-react';
import { clsx } from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { useAppStore } from '../data/appStore';
import { computeAggregateStats, detectLeaks, type LeakSeverity } from '../analysis/leakDetector';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import { buildCoachsNote } from '../analysis/coachsNote';
import { DemoDataButton } from '../components/shared/DemoDataButton';
import { readStarterDiagnosticSummary } from '../data/starterDiagnostic';

const SEVERITY_BADGE: Record<LeakSeverity, { cls: string; label: string }> = {
  critical: { cls: 'bg-[var(--loss-soft)] text-[var(--loss)]', label: 'CRITICAL' },
  high: { cls: 'bg-[var(--loss-soft)] text-[var(--loss)]', label: 'HIGH' },
  medium: { cls: 'bg-warn/15 text-warn', label: 'MEDIUM' },
  low: { cls: 'bg-white/5 text-[var(--fg-dim)]', label: 'LOW' },
};

// The focus card carries its severity as a calm accent (a left edge + faint
// wash) so the single most important thing visually dominates — the Leaks
// page's hierarchy language, without its pill density.
const SEVERITY_ACCENT: Record<LeakSeverity, { bar: string; tint: string }> = {
  critical: { bar: 'var(--loss)', tint: 'var(--loss-soft)' },
  high: { bar: 'var(--loss)', tint: 'var(--loss-soft)' },
  medium: { bar: 'var(--warn)', tint: 'var(--warn-soft)' },
  low: { bar: 'var(--fg-muted)', tint: 'transparent' },
};

const CONFIDENCE_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: 'low confidence — directional',
  medium: 'medium confidence',
  high: 'high confidence',
};

function diagnosticPatternSummary(area: { misses: number; attempts: number }): string {
  const missLabel = area.misses === 1 ? 'miss' : 'misses';
  const spotLabel = area.attempts === 1 ? 'diagnostic spot' : 'diagnostic spots';
  return `${area.misses} ${missLabel} across ${area.attempts} ${spotLabel}`;
}

export function CoachsNotePage() {
  const { strategyProfile } = useAppStore();
  const starterDiagnostic = readStarterDiagnosticSummary();
  const topDiagnosticReviewArea = starterDiagnostic?.reviewAreas[0] ?? null;
  const note = useLiveQuery(async () => {
    const [decisionsRaw, hands] = await Promise.all([db.heroDecisions.toArray(), db.hands.toArray()]);
    const checked = batchCheckCompliance(decisionsRaw, strategyProfile);
    const stats = computeAggregateStats(checked);
    const leaks = detectLeaks(stats, strategyProfile);
    return buildCoachsNote({ leaks, decisions: checked, hands });
  }, [strategyProfile], undefined);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--hairline)] bg-[linear-gradient(135deg,var(--ink-2),var(--ink-1))] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.24)] sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">Action loop</div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-[var(--fg)]">
            <Crosshair size={22} className="text-[var(--accent)]" /> Coach&apos;s Note
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--fg-muted)]">
            Your x-ray cockpit finds the bleed; this is the exact study prescription to run next.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/dashboard" className="inline-flex items-center gap-1 rounded-lg border border-[var(--hairline)] bg-white/[0.03] px-3 py-2 text-sm font-semibold text-[var(--fg-muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--fg)]">
            Back to Dashboard <ArrowRight size={14} />
          </Link>
          <DemoDataButton />
        </div>
      </header>

      {starterDiagnostic && (
        <section className="compartment flex flex-col gap-3 border border-sky-300/25 bg-sky-300/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-100">Lower-confidence starter hint</div>
            <h2 className="mt-1 text-lg font-black text-[var(--fg)]">{starterDiagnostic.packTitle}</h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Seed diagnostic score: <span className="font-mono text-[var(--fg)]">{starterDiagnostic.correct}/{starterDiagnostic.total}</span>. This is curriculum orientation only — not leak grading, solver EV, or imported-hand evidence.
            </p>
            {starterDiagnostic.recommendedPackTitle && topDiagnosticReviewArea && (
              <p className="mt-2 text-xs font-semibold text-sky-100">
                Priority review: {starterDiagnostic.recommendedPackTitle} · {diagnosticPatternSummary(topDiagnosticReviewArea)}.
              </p>
            )}
          </div>
          <Link to="/arena" className="inline-flex items-center gap-1 rounded border border-sky-300/30 bg-sky-300/15 px-3 py-2 text-sm font-semibold text-sky-100">
            Continue in Drills <ArrowRight size={14} />
          </Link>
        </section>
      )}

      {note === undefined ? (
        <div className="compartment border border-[var(--hairline)] p-6 text-[var(--fg-muted)]">Reading your hands…</div>
      ) : note.kind === 'insufficient_data' ? (
        <div className="compartment flex items-start gap-3 border border-[var(--hairline)] p-6">
          <Inbox size={20} className="mt-0.5 text-[var(--fg-dim)]" />
          <div>
            <div className="font-semibold text-[var(--fg)]">Not enough hands yet</div>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{note.message}</p>
            <Link to="/hands" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
              Import hands <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : note.kind === 'all_clear' ? (
        <div className="compartment flex items-start gap-3 border border-[var(--money-line)] p-6">
          <CheckCircle size={20} className="mt-0.5 text-[var(--money)]" />
          <div>
            <div className="font-semibold text-[var(--fg)]">No single leak stands out</div>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{note.message}</p>
            <p className="mt-2 text-xs text-[var(--fg-dim)]">{note.handsAnalyzed} decisions analysed.</p>
          </div>
        </div>
      ) : (
        <>
          <section
            className="compartment overflow-hidden p-0"
            style={{
              borderLeft: `3px solid ${SEVERITY_ACCENT[note.focus.severity].bar}`,
              backgroundImage: `linear-gradient(to right, ${SEVERITY_ACCENT[note.focus.severity].tint}, transparent 55%)`,
            }}
          >
            <div className="grid gap-0 lg:grid-cols-[1.7fr_0.8fr]">
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">X-ray focus</span>
                  <span className={clsx('rounded px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_BADGE[note.focus.severity].cls)}>
                    {SEVERITY_BADGE[note.focus.severity].label}
                  </span>
                </div>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--fg)]">{note.focus.leakTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--fg-dim)]">{note.focus.explanation}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
                  <span className="rounded-full border border-[var(--hairline)] bg-[var(--ink-1)] px-3 py-1">{CONFIDENCE_LABEL[note.focus.confidence]}</span>
                  {note.focus.estimatedBbLoss !== null && (
                    <span className="rounded-full border border-[var(--loss)]/25 bg-[var(--loss-soft)] px-3 py-1 font-mono text-[var(--loss)]">~{note.focus.estimatedBbLoss.toFixed(1)} bb</span>
                  )}
                  <span className="rounded-full border border-[var(--hairline)] bg-[var(--ink-1)] px-3 py-1">{note.handsAnalyzed} decisions analysed</span>
                </div>
              </div>

              <aside className="border-t border-[var(--hairline)] bg-black/10 p-6 sm:p-7 lg:border-l lg:border-t-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fg-muted)]">Evidence</div>
                <div className="mt-2 text-lg font-black text-[var(--fg)]">{note.focus.evidence.label}</div>
                {note.focus.evidence.details.length > 0 && (
                  <p className="mt-2 text-xs leading-relaxed text-[var(--fg-muted)]">{note.focus.evidence.details.join(' · ')}</p>
                )}
                <div className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--fg-muted)]">Next action</div>
                <p className="mt-2 text-sm font-semibold text-[var(--fg)]">{note.focus.cta}</p>
              </aside>
            </div>
          </section>

          <section className="compartment p-6">
            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-muted)]">The receipts</div>
            {note.noDecisiveHand ? (
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                This is a frequency pattern — no single hand is decisive. Review the spot across your hands rather than one cooler.
              </p>
            ) : (
              <>
                <p className="mb-3 mt-2 text-sm text-[var(--fg-muted)]">Your costliest hands in this pattern — start here:</p>
                <ul className="space-y-2">
                  {note.receipts.map((r) => (
                    <li
                      key={r.handId}
                      className="flex items-center justify-between rounded border border-[var(--hairline)] bg-[var(--ink-1)] px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-[var(--fg-dim)]">#{r.handId}</span>
                      {r.reasons.length > 0 && (
                        <span className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">{r.reasons.join(' · ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <Link to="/hands" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
                  Open in the Hands explorer <ArrowRight size={14} />
                </Link>
              </>
            )}
          </section>

          <section className="compartment flex items-center justify-between gap-3 p-6">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-[var(--accent)]" />
              <div>
                <div className="font-semibold text-[var(--fg)]">Drill it</div>
                <p className="text-sm text-[var(--fg-muted)]">{note.drillCta}</p>
              </div>
            </div>
            <Link
              to="/arena"
              className="inline-flex items-center gap-1 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-3 py-2 text-sm font-semibold text-[var(--accent)]"
            >
              Open Drills <ArrowRight size={14} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
