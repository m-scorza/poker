/**
 * Coach's Note — the atomic "what should I study right now, and why?" page, and
 * the BLACKOUT reference surface (Rollout Step 0). Renders the discriminated
 * `CoachsNote` as a printed intelligence dossier: a monumental title, a numbered
 * folio grammar, a case-file for the focus leak, and the honesty strip as
 * chrome. It never invents a signal it doesn't have — refusals travel in the
 * live ticker and the honesty strip, and the empty-receipts case says so.
 *
 * Design law: docs/design/BLACKOUT_ROLLOUT.md + DECISIONS.md (D14).
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/store';
import { useAppStore } from '../data/appStore';
import { computeAggregateStats, detectLeaks, type LeakSeverity } from '../analysis/leakDetector';
import { batchCheckCompliance, complianceBreakdown } from '../analysis/rangeChecker';
import { buildCoachsNote } from '../analysis/coachsNote';
import { detectTilt } from '../analysis/tiltDetector';
import { DemoDataButton } from '../components/shared/DemoDataButton';
import { Folio } from '../components/blackout/Folio';
import { HonestyStrip } from '../components/blackout/HonestyStrip';
import { Ticker, type TickerItem } from '../components/blackout/Ticker';
import { readStarterDiagnosticSummary } from '../data/starterDiagnostic';
import { MindsetCard } from '../components/coach/MindsetCard';

const SEVERITY_META: Record<LeakSeverity, { label: string; cls: string }> = {
  critical: { label: 'CRITICAL', cls: 'loss' },
  high: { label: 'HIGH', cls: 'loss' },
  medium: { label: 'MEDIUM', cls: 'warn' },
  low: { label: 'LOW', cls: '' },
};

const SEVERITY_COLOR: Record<string, string> = {
  loss: 'var(--loss)',
  warn: 'var(--warn)',
  '': 'var(--fg-muted)',
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

const todayStamp = new Date().toISOString().slice(0, 10);

type HeadlineSeg = { t: string; stroke?: boolean };

/** A monumental title split into overflow-hidden rows that rise on load; one
 *  word carries the outline stroke (BLACKOUT signature 2). Decorative — the
 *  accessible page heading is the visually-hidden <h1> below it. */
function Headline({ rows }: { rows: HeadlineSeg[][] }) {
  return (
    <div className="bk-hl" aria-hidden="true">
      {rows.map((row, ri) => (
        <span className="row" key={ri}>
          <i>
            {row.map((seg, si) => (seg.stroke ? <em key={si}>{seg.t}</em> : <span key={si}>{seg.t}</span>))}
          </i>
        </span>
      ))}
    </div>
  );
}

export function CoachsNotePage() {
  const { strategyProfile } = useAppStore();
  const starterDiagnostic = readStarterDiagnosticSummary();
  const topDiagnosticReviewArea = starterDiagnostic?.reviewAreas[0] ?? null;

  const data = useLiveQuery(async () => {
    const [decisionsRaw, hands] = await Promise.all([db.heroDecisions.toArray(), db.hands.toArray()]);
    const checked = batchCheckCompliance(decisionsRaw, strategyProfile);
    const stats = computeAggregateStats(checked);
    const leaks = detectLeaks(stats, strategyProfile);
    const note = buildCoachsNote({ leaks, decisions: checked, hands });
    const breakdown = complianceBreakdown(checked, strategyProfile);
    return { note, stats, breakdown };
  }, [strategyProfile], undefined);

  const tilt = useLiveQuery(async () => {
    const [decisionsRaw, hands] = await Promise.all([db.heroDecisions.toArray(), db.hands.toArray()]);
    const checked = batchCheckCompliance(decisionsRaw, strategyProfile);
    return detectTilt({ hands, decisions: checked });
  }, [strategyProfile], undefined);

  const note = data?.note;
  const stats = data?.stats;
  const breakdown = data?.breakdown;

  const refMatch = breakdown?.percentage ?? null;
  const excluded = breakdown?.excluded ?? 0;
  const refCls = refMatch !== null && refMatch < 90 ? 'loss' : 'money';
  const handsAnalyzed = note && (note.kind === 'all_clear' || note.kind === 'focus') ? note.handsAnalyzed : 0;

  const ticker: TickerItem[] = [];
  if (stats && stats.totalHands > 0 && breakdown) {
    const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—');
    const cbetHU = stats.cbetHUOpps > 0 ? (stats.cbetHUMade / stats.cbetHUOpps) * 100 : null;
    ticker.push(
      { label: 'VPIP', value: pct(stats.vpipHands, stats.totalHands) },
      { label: 'PFR', value: pct(stats.pfrHands, stats.totalHands) },
      {
        label: 'C-BET HU',
        value: cbetHU === null ? '—' : `${cbetHU.toFixed(0)}%`,
        tone: cbetHU !== null && cbetHU < 100 ? 'dn' : 'up',
      },
      {
        label: 'REFERENCE MATCH',
        value: refMatch === null ? '—' : `${refMatch.toFixed(1)}%`,
        tone: refMatch !== null && refMatch < 90 ? 'dn' : undefined,
      },
      { label: 'NOT GRADED', value: `${excluded} SPOTS ROUTED TO REVIEW` },
      { label: 'DECISIONS', value: `${breakdown.graded + breakdown.excluded}` },
    );
  }

  const honestyCells = [
    { label: 'Rule-based, no EV', body: 'Preflop checks mapped from documented charts. No solver claims are made anywhere on this desk.' },
    {
      label: 'Refusal-as-UI',
      body:
        excluded > 0
          ? `${excluded} spots are excluded from grading — facing 3-bets, all-ins, multiway BB defense — each with its reason.`
          : 'Spots with no binary correct answer — facing 3-bets, all-ins, multiway BB defense — are excluded from grading, each with its reason.',
    },
    { label: 'Local only', body: 'Your hands never leave this machine. No cloud, no telemetry, no account.' },
  ];

  return (
    <div className="space-y-0">
      {/* ---- top rail: brand + return + demo ---- */}
      <div className="flex items-center justify-between gap-3 pb-2">
        <div className="bk-kicker">Command Desk // Coach&apos;s Note</div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-sm font-semibold text-[var(--fg-muted)] transition hover:border-[var(--sig-line)] hover:text-[var(--fg)]"
          >
            Back to Dashboard <ArrowRight size={14} />
          </Link>
          <DemoDataButton />
        </div>
      </div>

      {ticker.length > 0 && <Ticker items={ticker} />}

      {/* ---- dossier hero ---- */}
      <section className="bk-hero">
        <div className="bk-hero-rail"><span>DOSSIER · {todayStamp}</span></div>
        <div className="bk-hero-main">
          <div className="bk-kicker">The Coach&apos;s Note — your single most important thing</div>
          {note === undefined ? (
            <Headline rows={[[{ t: 'Reading' }], [{ t: 'your ' }, { t: 'hands', stroke: true }, { t: '…' }]]} />
          ) : note.kind === 'insufficient_data' ? (
            <Headline rows={[[{ t: 'Not enough' }], [{ t: 'hands to' }], [{ t: 'read ', stroke: true }, { t: 'yet.' }]]} />
          ) : note.kind === 'all_clear' ? (
            <Headline rows={[[{ t: 'No single' }], [{ t: 'leak ' }, { t: 'stands', stroke: true }], [{ t: 'out.' }]]} />
          ) : (
            <Headline rows={[[{ t: 'One leak' }], [{ t: 'is ' }, { t: 'costing', stroke: true }, { t: ' you.' }]]} />
          )}
          <h1 className="sr-only">Coach&apos;s Note</h1>
          <p className="bk-hero-sub">
            One focus at a time, receipts attached. No invented signals — when the data can&apos;t support a
            verdict, this desk says <b>&ldquo;not graded&rdquo;</b> and shows you why. That refusal is the product.
          </p>
        </div>
        <aside className="bk-hero-meta">
          {note && note.kind === 'focus' ? (
            <>
              <div className="bk-meta-row">
                <span className="k">Focus severity</span>
                <span className={`v ${SEVERITY_META[note.focus.severity].cls}`}>{SEVERITY_META[note.focus.severity].label}</span>
                <span className="note">one focus at a time</span>
              </div>
              <div className="bk-meta-row">
                <span className="k">Reference match</span>
                <span className={`v ${refCls}`}>{refMatch === null ? '—' : `${refMatch.toFixed(1)}%`}</span>
                <span className="note">{note.handsAnalyzed} decisions analysed</span>
              </div>
              <div className="bk-meta-row">
                <span className="k">Not graded</span>
                <span className="v">{excluded}</span>
                <span className="note">spots routed to review</span>
              </div>
            </>
          ) : (
            <>
              <div className="bk-meta-row">
                <span className="k">Reference match</span>
                <span className={`v ${refCls}`}>{refMatch === null ? '—' : `${refMatch.toFixed(1)}%`}</span>
                <span className="note">graded preflop decisions</span>
              </div>
              <div className="bk-meta-row">
                <span className="k">Decisions analysed</span>
                <span className="v">{handsAnalyzed || '—'}</span>
                <span className="note">{excluded} spots not graded</span>
              </div>
            </>
          )}
        </aside>
      </section>

      {/* ---- starter diagnostic: lower-confidence orientation hint ---- */}
      {starterDiagnostic && (
        <section className="mt-6 flex flex-col gap-3 border border-[var(--sig-line)] bg-[var(--sig-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="bk-kicker" style={{ color: 'var(--sig)' }}>Lower-confidence starter hint</div>
            <h2 className="mt-2 font-[family-name:var(--display)] text-2xl font-bold text-[var(--fg)]">{starterDiagnostic.packTitle}</h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Seed diagnostic score: <span className="font-mono text-[var(--fg)]">{starterDiagnostic.correct}/{starterDiagnostic.total}</span>. This is curriculum orientation only — not leak grading, solver EV, or imported-hand evidence.
            </p>
            {starterDiagnostic.recommendedPackTitle && topDiagnosticReviewArea && (
              <p className="mt-2 text-xs font-semibold text-[var(--fg)]">
                Priority review: {starterDiagnostic.recommendedPackTitle} · {diagnosticPatternSummary(topDiagnosticReviewArea)}.
              </p>
            )}
          </div>
          <Link to="/arena" className="bk-cta" style={{ marginTop: 0 }}>
            Continue in Drills <span className="arr">→</span>
          </Link>
        </section>
      )}

      {/* ---- Folio 01 · The focus ---- */}
      <Folio index="01" title="The focus" tag="Diagnose → Drill → Re-measure" />

      {note === undefined ? (
        <div className="border border-[var(--border)] bg-[var(--bg-2)] p-8 text-[var(--fg-muted)]">Reading your hands…</div>
      ) : note.kind === 'insufficient_data' ? (
        <div className="border border-[var(--border)] bg-[var(--bg-2)] p-8">
          <div className="font-[family-name:var(--display)] text-xl font-bold text-[var(--fg)]">Not enough hands yet</div>
          <p className="mt-2 max-w-2xl text-sm text-[var(--fg-muted)]">{note.message}</p>
          <Link to="/hands" className="bk-cta mt-6"><span>Import hands</span> <span className="arr">→</span></Link>
        </div>
      ) : note.kind === 'all_clear' ? (
        <div className="border border-[var(--money-line)] bg-[var(--bg-2)] p-8">
          <div className="bk-case-kick" style={{ color: 'var(--money)' }}>No major leaks</div>
          <div className="mt-3 font-[family-name:var(--display)] text-3xl font-bold text-[var(--fg)]">No single leak stands out.</div>
          <p className="mt-3 max-w-2xl text-sm text-[var(--fg-muted)]">{note.message}</p>
          <p className="mt-3 text-xs text-[var(--fg-dim)]">{note.handsAnalyzed} decisions analysed.</p>
        </div>
      ) : (
        <section className="bk-case" data-sev={note.focus.severity} data-ribbon={SEVERITY_META[note.focus.severity].label}>
          <div className="bk-case-l">
            <div className="bk-case-kick" style={{ color: SEVERITY_COLOR[SEVERITY_META[note.focus.severity].cls] }}>
              X-ray focus · {CONFIDENCE_LABEL[note.focus.confidence]}
            </div>
            <h3>{note.focus.leakTitle}</h3>
            <p>{note.focus.explanation}</p>
            <div className="bk-case-stats">
              {note.focus.estimatedBbLoss !== null && (
                <div className="cost"><b>~{note.focus.estimatedBbLoss.toFixed(1)} bb</b><span>est. cost</span></div>
              )}
              {refMatch !== null && (
                <div><b>{refMatch.toFixed(1)}%</b><span>reference match</span></div>
              )}
              <div><b>{note.handsAnalyzed}</b><span>decisions</span></div>
            </div>
          </div>
          <div className="bk-case-r">
            <div className="k">The receipts — costliest hands in this pattern</div>
            {note.noDecisiveHand ? (
              <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
                This is a frequency pattern — no single hand is decisive. Review the spot across your hands rather than one cooler.
              </p>
            ) : (
              note.receipts.map((r) => (
                <div className="bk-receipt" key={r.handId}>
                  <span>#{r.handId}</span>
                  {r.reasons.length > 0 && <span className="why">{r.reasons.join(' · ')}</span>}
                </div>
              ))
            )}
            <p className="mt-5 text-xs text-[var(--fg-dim)]">{note.drillCta}</p>
            <Link to="/arena" className="bk-cta">
              Open Drills <span className="arr">→</span>
            </Link>
          </div>
        </section>
      )}

      {/* ---- the honesty strip is chrome, not a tooltip ---- */}
      {note !== undefined && <HonestyStrip cells={honestyCells} />}
      {note !== undefined && note.kind !== 'insufficient_data' && tilt !== undefined && (
        <MindsetCard report={tilt} />
      )}
    </div>
  );
}
