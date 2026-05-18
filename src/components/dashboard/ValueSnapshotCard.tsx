import { Link } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Flame, ShieldCheck, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { CareerCoachReport } from '../../analysis/careerCoach';
import { money, pct } from '../../utils/format';

interface ValueSnapshotCardProps {
  report: CareerCoachReport;
  leakCount: number;
  handCount: number;
}

const verdictStyles: Record<CareerCoachReport['recommendation'], string> = {
  'Move Up Candidate': 'from-emerald-500/25 via-emerald-500/10 to-[var(--color-bg-card)] border-emerald-400/40 text-emerald-300',
  'Hold Current Stake': 'from-amber-500/25 via-amber-500/10 to-[var(--color-bg-card)] border-amber-400/40 text-amber-300',
  'Move Down / Rebuild': 'from-rose-500/25 via-rose-500/10 to-[var(--color-bg-card)] border-rose-400/40 text-rose-300',
  'Need More Sample': 'from-blue-500/25 via-blue-500/10 to-[var(--color-bg-card)] border-blue-400/40 text-blue-300',
};

function scoreLabel(score: number): string {
  if (score >= 75) return 'Shot-ready';
  if (score >= 55) return 'Playable, but blocked';
  if (score >= 40) return 'Repair mode';
  return 'Protect bankroll';
}

export function ValueSnapshotCard({ report, leakCount, handCount }: ValueSnapshotCardProps) {
  const topAction = report.nextActions[0] ?? 'Review the next imported session and tag the first repeat mistake.';
  const blockerTitle = report.topBlocker?.title ?? 'No dominant blocker detected';
  const blockerDetail = report.topBlocker?.detail ?? 'Keep using the review queue after each session to preserve the edge.';

  return (
    <section className={clsx('relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-2xl shadow-black/20 ring-1 ring-white/5', verdictStyles[report.recommendation])}>
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />

      <div className="relative grid gap-5 xl:grid-cols-[1.05fr_1.35fr_auto] xl:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/55">
            <BrainCircuit size={14} className="text-[var(--color-accent)]" />
            30-second answer
          </div>
          <h3 className="text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
            {report.recommendation}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--color-text-dim)]">
            {scoreLabel(report.stakeReadinessScore)} from {report.tournamentsPlayed} tournaments and {handCount} hands. This is the first thing a coach or buyer should understand before opening any chart.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Readiness</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-data text-4xl font-black text-white">{report.stakeReadinessScore}</span>
              <span className="pb-1 text-sm font-bold text-white/45">/100</span>
            </div>
            <p className="mt-2 text-xs font-bold uppercase text-white/55">{report.sampleConfidence} confidence</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/45">
              <TrendingUp size={12} /> Career signal
            </p>
            <p className="mt-2 font-data text-2xl font-black text-white">{pct(report.roi)}</p>
            <p className="mt-2 text-xs text-white/55">ROI · {money(report.trackedProfit)} tracked profit</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/45">
              <Flame size={12} /> Main blocker
            </p>
            <p className="mt-2 text-sm font-black uppercase leading-tight text-white">{blockerTitle}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/55">{blockerDetail}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:w-52">
          <Link
            to="/career"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-black uppercase tracking-wider text-black shadow-lg shadow-[var(--color-accent)]/20 transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Open Coach <ArrowRight size={16} />
          </Link>
          <Link
            to="/leaks"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:border-white/25 hover:bg-white/[0.08]"
          >
            Review {leakCount} leaks
          </Link>
        </div>
      </div>

      <div className="relative mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">
              <ShieldCheck size={13} /> Fix this now
            </p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-white">{topAction}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center md:min-w-72">
            <div>
              <p className="font-data text-lg font-black text-white">{money(report.avgBuyIn)}</p>
              <p className="text-[10px] uppercase text-white/40">ABI</p>
            </div>
            <div>
              <p className="font-data text-lg font-black text-white">{report.maxDrawdownBuyIns.toFixed(1)}</p>
              <p className="text-[10px] uppercase text-white/40">DD ABI</p>
            </div>
            <div>
              <p className="font-data text-lg font-black text-white">{pct(report.complianceRate)}</p>
              <p className="text-[10px] uppercase text-white/40">Compliance</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
