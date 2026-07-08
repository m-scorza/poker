/**
 * Mindset card — the Tilt Detector's surface on the Coach's Note.
 *
 * Renders the discriminated `TiltReport` honestly: not enough rough moments to
 * judge, a steady head, or a tilt signature with the metric shifts and the
 * trigger hands as receipts. It never renders a gauge or score — either the
 * sample supports a statement or the card says it doesn't.
 */

import { Link } from 'react-router-dom';
import { Brain, CheckCircle, Flame, ArrowRight } from 'lucide-react';
import type { TiltReport } from '../../analysis/tiltDetector';
import { TILT_METRIC_LABELS } from '../../analysis/tiltDetector';

const CONFIDENCE_LABEL: Record<'medium' | 'high', string> = {
  medium: 'medium confidence',
  high: 'high confidence',
};

export function MindsetCard({ report }: { report: TiltReport }) {
  const isSignature = report.kind === 'tilt_signature';

  return (
    <section
      className="compartment p-6"
      style={
        isSignature
          ? {
              borderLeft: '3px solid var(--loss)',
              backgroundImage: 'linear-gradient(to right, var(--loss-soft), transparent 55%)',
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-muted)]">Mindset</span>
        {isSignature && (
          <span className="rounded bg-[var(--loss-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--loss)]">
            Tilt signature
          </span>
        )}
      </div>

      {report.kind === 'insufficient_data' ? (
        <div className="mt-3 flex items-start gap-3">
          <Brain size={20} className="mt-0.5 text-[var(--fg-dim)]" />
          <div>
            <div className="font-semibold text-[var(--fg)]">Too early to read your mental game</div>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{report.message}</p>
          </div>
        </div>
      ) : report.kind === 'steady' ? (
        <div className="mt-3 flex items-start gap-3">
          <CheckCircle size={20} className="mt-0.5 text-[var(--money)]" />
          <div>
            <div className="font-semibold text-[var(--fg)]">Steady after the rough moments</div>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{report.message}</p>
            <p className="mt-2 text-xs text-[var(--fg-dim)]">
              {report.triggersFound} rough moments · post-trigger play compared against your baseline.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-start gap-3">
            <Flame size={20} className="mt-0.5 text-[var(--loss)]" />
            <div>
              <div className="font-semibold text-[var(--fg)]">Your play changes after big losses</div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--fg-dim)]">{report.message}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {report.signals.map((signal) => (
              <li
                key={signal.metric}
                className="flex items-center justify-between rounded border border-[var(--hairline)] bg-[var(--ink-1)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--fg-dim)]">{TILT_METRIC_LABELS[signal.metric]}</span>
                <span className="font-mono text-[var(--fg)]">
                  {signal.baselinePct.toFixed(0)}% → {signal.windowPct.toFixed(0)}%
                  <span className="ml-2 text-[var(--loss)]">
                    {signal.deltaPp > 0 ? '+' : ''}
                    {signal.deltaPp.toFixed(0)}pp
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fg-muted)]">
            <span>{CONFIDENCE_LABEL[report.confidence]}</span>
            <span>· {report.triggersFound} rough moments compared</span>
          </div>
          {report.receiptHandIds.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-[var(--fg-muted)]">The moments that shook you most:</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {report.receiptHandIds.map((handId) => (
                  <span key={handId} className="rounded border border-[var(--hairline)] bg-[var(--ink-1)] px-2 py-1 font-mono text-xs text-[var(--fg-dim)]">
                    #{handId}
                  </span>
                ))}
              </div>
              <Link to="/hands" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
                Review them in the Hands explorer <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
