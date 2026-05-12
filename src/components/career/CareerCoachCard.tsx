import { AlertTriangle, ArrowRight, Banknote, CheckCircle2, Download, Shield, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { buildCareerCoachMarkdownReport } from '../../analysis/careerCoach';
import type { CareerCoachReport, CareerRecommendation } from '../../analysis/careerCoach';
import { DemoDataButton } from '../shared/DemoDataButton';
import type { DemoSeedResult } from '../../data/demoDataset';

interface CareerCoachCardProps {
  report: CareerCoachReport;
  onDemoLoaded?: (result: DemoSeedResult) => void;
}

const RECOMMENDATION_STYLES: Record<CareerRecommendation, string> = {
  'Move Up Candidate': 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  'Hold Current Stake': 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  'Move Down / Rebuild': 'border-red-400/40 bg-red-400/10 text-red-300',
  'Need More Sample': 'border-amber-400/40 bg-amber-400/10 text-amber-300',
};

function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

function scoreGradient(score: number): string {
  if (score >= 75) return 'from-emerald-400 to-lime-300';
  if (score >= 55) return 'from-sky-400 to-cyan-300';
  if (score >= 40) return 'from-amber-400 to-orange-300';
  return 'from-red-500 to-rose-300';
}

function scoreCopy(report: CareerCoachReport): string {
  if (report.recommendation === 'Need More Sample') {
    return 'Import more tournament summaries before trusting a stake move decision.';
  }
  if (report.recommendation === 'Move Up Candidate') {
    return 'Your tracked results and risk profile support controlled shot-taking.';
  }
  if (report.recommendation === 'Move Down / Rebuild') {
    return 'The current ABI is pressuring the graph. Rebuild lower and protect confidence.';
  }
  return 'Keep grinding the current ABI while removing the top blocker below.';
}

function MiniMetric({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        {icon}
        {label}
      </div>
      <div className="font-data text-2xl font-black text-white">{value}</div>
      <p className="mt-1 text-[11px] font-medium text-[var(--color-text-dim)]">{helper}</p>
    </div>
  );
}

export function CareerCoachCard({ report, onDemoLoaded }: CareerCoachCardProps) {
  const hasData = report.tournamentsPlayed > 0;

  function downloadMarkdownReport() {
    const markdown = buildCareerCoachMarkdownReport(report);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `career-coach-report-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (!hasData) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#15171f] via-[#11131a] to-[#090b10] p-8 shadow-2xl">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] text-[var(--color-accent)]">
              <Target size={16} />
              Career Coach
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white">
              Import tournaments to unlock stake-readiness guidance.
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-[var(--color-text-dim)]">
              Upload tournament summaries and the app converts ROI, ABI, drawdown,
              leaks, and compliance into a clear move-up / hold / rebuild decision.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm font-bold text-amber-200">
              No career sample yet
            </div>
            <DemoDataButton onLoaded={onDemoLoaded} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#15171f] via-[#11131a] to-[#090b10] p-6 shadow-2xl lg:p-8">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
      <div className="absolute -bottom-28 left-1/4 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] text-[var(--color-accent)]">
              <Target size={16} />
              Career Coach
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black uppercase tracking-tight text-white lg:text-4xl">
                Stake Readiness
              </h2>
              <span className={clsx('rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest', RECOMMENDATION_STYLES[report.recommendation])}>
                {report.recommendation}
              </span>
              <button
                type="button"
                onClick={downloadMarkdownReport}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[var(--color-text-dim)] transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
              >
                <Download size={13} /> Export private review
              </button>
            </div>
            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-[var(--color-text-dim)]">
              {scoreCopy(report)} This is not bankroll advice; it is a tracked-results risk signal from your imported history.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Readiness Score</p>
                <div className="mt-1 font-data text-6xl font-black leading-none text-white">
                  {report.stakeReadinessScore}<span className="text-2xl text-[var(--color-text-muted)]">/100</span>
                </div>
              </div>
              <div className="text-right text-xs font-bold uppercase tracking-widest text-[var(--color-text-dim)]">
                Confidence<br />
                <span className="text-white">{report.sampleConfidence}</span>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className={clsx('h-full rounded-full bg-gradient-to-r transition-all', scoreGradient(report.stakeReadinessScore))}
                style={{ width: `${report.stakeReadinessScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <MiniMetric
              label="ABI"
              value={formatMoney(report.avgBuyIn)}
              helper={`${report.tournamentsPlayed} tracked tournaments`}
              icon={<Banknote size={14} />}
            />
            <MiniMetric
              label="ROI / Last 20"
              value={`${report.roi.toFixed(1)}%`}
              helper={`Recent: ${formatPct(report.last20Roi)}`}
              icon={report.roi >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            />
            <MiniMetric
              label="Max Drawdown"
              value={`${report.maxDrawdownBuyIns.toFixed(1)} ABI`}
              helper={`${formatMoney(report.maxDrawdown)} peak-to-trough`}
              icon={<Shield size={14} />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                <Shield size={14} />
                Bankroll Guardrails
              </div>
              <div className="space-y-2 text-sm font-semibold text-[var(--color-text-dim)]">
                <div className="flex justify-between gap-4"><span>Current ABI target (100 BI)</span><span className="font-data text-white">{formatMoney(report.currentAbiBankrollTarget)}</span></div>
                <div className="flex justify-between gap-4"><span>Move-up target (150 BI)</span><span className="font-data text-white">{formatMoney(report.nextStakeBankrollTarget)}</span></div>
                <div className="flex justify-between gap-4"><span>No-cash streak</span><span className="font-data text-white">{report.longestNoCashStreak}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                {report.topBlocker ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                Top Blocker
              </div>
              {report.topBlocker ? (
                <div>
                  <p className="font-bold text-white">{report.topBlocker.title}</p>
                  <p className="mt-2 text-xs font-medium leading-5 text-[var(--color-text-dim)]">{report.topBlocker.detail}</p>
                </div>
              ) : (
                <p className="text-sm font-semibold leading-6 text-emerald-300">
                  No dominant blocker detected. Keep sample quality high and review starred hands.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-5">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-accent)]">
              <ArrowRight size={14} />
              Next 3 Actions
            </div>
            <ol className="space-y-3">
              {report.nextActions.map((action, index) => (
                <li key={action} className="flex gap-3 text-sm font-semibold leading-6 text-white">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 font-data text-xs text-[var(--color-accent)]">{index + 1}</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
