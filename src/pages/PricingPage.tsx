import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clipboard, Crown, LineChart, LockKeyhole, MessageCircle, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react';
import { DemoDataButton } from '../components/shared/DemoDataButton';

const PILOT_DM = `Hey, I built a private poker leak analyzer for Reg Life players.\n\nIt imports PokerStars hand histories + tournament summaries, then gives you:\n- Top leaks costing chips/ROI\n- Range compliance by position\n- Career Coach: move-up / hold / rebuild recommendation\n- Shareable report for study review\n\nI'm opening a small founding-user pilot before making it public. Want me to run a demo with your histories?`;

const PLANS = [
  {
    name: 'Review Demo',
    price: 'Free',
    subtitle: 'For the first trust-building calls.',
    badge: 'Lead magnet',
    features: ['Load sample data instantly', 'Show Career Coach score', 'Preview top leaks', 'Export example report'],
    cta: 'Open Career demo',
    featured: false,
  },
  {
    name: 'Player Pro',
    price: 'R$49–79/mo',
    subtitle: 'Local-first leak review for serious micro/low-stakes grinders.',
    badge: 'Paid MVP',
    features: ['Unlimited local imports', 'Career Coach stake-readiness', 'Leak priority list', 'Markdown report export', 'Session and villain review'],
    cta: 'Start with Career Coach',
    featured: true,
  },
  {
    name: 'Coach Seat',
    price: 'R$199+/mo',
    subtitle: 'For reviewing multiple students and sending reports.',
    badge: 'Upsell',
    features: ['Student report workflow', 'Reusable demo dataset', 'Exportable action plans', 'Private cohort onboarding', 'Priority feature requests'],
    cta: 'Copy pilot DM',
    featured: false,
  },
];

const FUNNEL_STEPS = [
  {
    title: '1. Show value in 30 seconds',
    detail: 'Open the demo dataset, jump to Career Coach, and show the move-up / hold / rebuild call.',
  },
  {
    title: '2. Ask for a private history export',
    detail: 'Import PokerStars hands and summaries locally. No server upload required, which lowers trust friction.',
  },
  {
    title: '3. Sell the report loop',
    detail: 'Export the Career Coach report, review the top blocker, and sell continued tracking or coach-seat reviews.',
  },
];

function PlanCard({ plan }: { plan: typeof PLANS[number] }) {
  return (
    <div className={`relative rounded-3xl border p-6 shadow-2xl ${plan.featured ? 'border-[var(--color-accent)]/45 bg-[var(--color-accent)]/10' : 'border-white/10 bg-white/[0.03]'}`}>
      {plan.featured && (
        <div className="absolute -top-3 left-6 rounded-full border border-[var(--color-accent)]/40 bg-[#07130d] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Best first sale
        </div>
      )}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-text-muted)]">{plan.badge}</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">{plan.name}</h2>
        </div>
        <Crown className={plan.featured ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} size={26} />
      </div>
      <div className="font-data text-3xl font-black text-white">{plan.price}</div>
      <p className="mt-2 min-h-12 text-sm font-medium leading-6 text-[var(--color-text-dim)]">{plan.subtitle}</p>
      <ul className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm font-semibold leading-6 text-white">
            <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--color-accent)]" size={16} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to={plan.name === 'Review Demo' ? '/career' : plan.name === 'Player Pro' ? '/career' : '#pilot-dm'}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/15 hover:text-[var(--color-accent)]"
      >
        {plan.cta} <ArrowRight size={15} />
      </Link>
    </div>
  );
}

export function PricingPage() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  async function copyPilotDm() {
    try {
      await navigator.clipboard.writeText(PILOT_DM);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = PILOT_DM;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="space-y-10 pb-20">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#10151f] via-[#0b0d12] to-black p-8 shadow-2xl lg:p-10">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-accent)]">
              <Sparkles size={14} /> Paid MVP Offer
            </div>
            <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tighter text-white lg:text-6xl">
              Sell the leak report, not another dashboard.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-[var(--color-text-dim)]">
              This page packages the app into a simple Reg Life pilot: show the demo, import the player's history locally, export a report, then charge for ongoing reviews.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <DemoDataButton label="Load demo and show value" onLoaded={() => navigate('/career')} />
              <Link to="/career" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]">
                Open Career Coach <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-5">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Target className="text-[var(--color-accent)]" size={22} />
              <div><p className="font-bold text-white">Target buyer</p><p className="text-xs text-[var(--color-text-dim)]">Reg Life student who already pays for study.</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <LockKeyhole className="text-[var(--color-accent)]" size={22} />
              <div><p className="font-bold text-white">Trust hook</p><p className="text-xs text-[var(--color-text-dim)]">Local-first analysis; histories stay on the user's machine.</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <LineChart className="text-[var(--color-accent)]" size={22} />
              <div><p className="font-bold text-white">Paid output</p><p className="text-xs text-[var(--color-text-dim)]">Stake-readiness report + top 3 actions.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => <PlanCard key={plan.name} plan={plan} />)}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[var(--color-accent)]">
            <Trophy size={16} /> Sales flow
          </div>
          <div className="space-y-4">
            {FUNNEL_STEPS.map((step) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-black uppercase tracking-tight text-white">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-text-dim)]">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="pilot-dm" className="rounded-3xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[var(--color-accent)]">
              <MessageCircle size={16} /> Copy/paste pilot DM
            </div>
            <button
              type="button"
              onClick={copyPilotDm}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
            >
              <Clipboard size={14} /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-5 text-sm font-semibold leading-7 text-white">{PILOT_DM}</pre>
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-medium leading-6 text-[var(--color-text-dim)]">
            <ShieldCheck className="mt-0.5 shrink-0 text-[var(--color-accent)]" size={18} />
            <span>Use this manually for early validation. Payment links and license checks can come after 3–5 people say yes.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
