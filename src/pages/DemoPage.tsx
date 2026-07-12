import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Database, Download, FileText, LockKeyhole, Search, Shield, Sparkles, Target, TrendingUp } from 'lucide-react';
import { DemoDataButton } from '../components/shared/DemoDataButton';

const FEATURES = [
  {
    icon: Database,
    title: 'Local-first analysis',
    detail: 'Hand histories stay on your machine. No server upload, no cloud dependency.',
  },
  {
    icon: Search,
    title: 'Leak detection',
    detail: 'Prioritized repair queue surfaces the most expensive patterns in your play.',
  },
  {
    icon: TrendingUp,
    title: 'Career tracking',
    detail: 'ROI, ABI, drawdown, and stake-readiness scoring from imported tournament summaries.',
  },
  {
    icon: FileText,
    title: 'Private review export',
    detail: 'Download markdown reports for personal study. No public sharing or distribution.',
  },
];

const STEPS = [
  {
    title: '1. Load the demo or import your histories',
    detail: 'Try the built-in demo dataset instantly, or import PokerStars / GGPoker hand histories and tournament summaries from your local files.',
  },
  {
    title: '2. Analyze leaks, ranges, and sessions',
    detail: 'The analyzer detects preflop and postflop leaks, checks range compliance by position, and tracks session-level BB/100, ROI, and consistency.',
  },
  {
    title: '3. Export a private review report',
    detail: 'Download a career-readiness report as a markdown file for personal study and review. All data stays local.',
  },
];

export function DemoPage() {
  return (
    <div className="space-y-10 pb-20">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--color-card-surface-5)] via-[var(--color-card-gradient-fade)] to-black p-8 shadow-2xl lg:p-10">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">
              <Sparkles size={14} /> Private Validation Demo
            </div>
            <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tighter text-white lg:text-6xl">
              Local poker hand-history analyzer.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-[var(--fg-dim)]">
              Import your hand histories and tournament summaries locally, surface your most expensive leaks, track career readiness, and export private review reports — all without uploading data anywhere.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <DemoDataButton label="Load demo dataset" />
              <Link to="/career" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:border-[var(--accent)]/40 hover:text-[var(--accent)]">
                Open Career Coach <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-5">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Target className="text-[var(--accent)]" size={22} />
              <div><p className="font-bold text-white">For MTT players</p><p className="text-xs text-[var(--fg-dim)]">Designed around tournament and SNG hand-history formats.</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <LockKeyhole className="text-[var(--accent)]" size={22} />
              <div><p className="font-bold text-white">100% local</p><p className="text-xs text-[var(--fg-dim)]">Analysis runs in your browser. Histories never leave your machine.</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Shield className="text-[var(--accent)]" size={22} />
              <div><p className="font-bold text-white">Private review only</p><p className="text-xs text-[var(--fg-dim)]">Exports are for personal study. No public sharing or distribution.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <feature.icon className="text-[var(--accent)]" size={22} />
              <h2 className="text-lg font-black uppercase tracking-tight text-white">{feature.title}</h2>
            </div>
            <p className="text-sm font-medium leading-6 text-[var(--fg-dim)]">{feature.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[var(--accent)]">
          <CheckCircle2 size={16} /> How it works
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="font-black uppercase tracking-tight text-white">{step.title}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-[var(--fg-dim)]">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">Private validation</p>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--fg-dim)]">
              This tool is in private validation. Import your own histories, explore the analysis, and share feedback to help shape what gets built next.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/hands" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:border-[var(--accent)]/40 hover:text-[var(--accent)]">
              Import hands <Download size={16} />
            </Link>
            <Link to="/leaks" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-5 py-3 text-sm font-black uppercase tracking-widest text-[var(--accent)] hover:bg-[var(--accent)]/25">
              View leak inbox <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
