import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Crosshair, Flame, Layers, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { StudyQueueItem } from '../../analysis/studyPlan';
import { getEvidenceMetadata } from '../../utils/evidence';

interface StudyPlanCardProps {
  items: StudyQueueItem[];
}

const SOURCE_LABEL: Record<StudyQueueItem['source'], string> = {
  leak: 'Leak Explorer',
  deviation: 'Range mistake',
  postflop: 'Trainer drill',
  loss: 'BB-loss review',
  reference: 'Reference table',
};

const SOURCE_ICON: Record<StudyQueueItem['source'], typeof Crosshair> = {
  leak: Flame,
  deviation: Crosshair,
  postflop: BookOpenCheck,
  loss: TrendingDown,
  reference: Crosshair,
};

const SEVERITY_CLASS: Record<StudyQueueItem['severity'], string> = {
  critical: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  medium: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  low: 'border-white/10 bg-white/5 text-white/60',
};

function routeFor(item: StudyQueueItem): string {
  if (item.source === 'deviation' && (item.id.includes('OPENED_OUT_OF_RANGE') || item.id.includes('OVERFOLD'))) return '/ranges';
  if (item.source === 'leak') return item.id === 'leak-compliance' ? '/ranges' : '/leaks';
  return '/hands';
}

function bbLabel(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)} bb`;
}

function confidenceLabel(value: StudyQueueItem['confidence']): string {
  return `sample ${value}`;
}

export function StudyPlanCard({ items }: StudyPlanCardProps) {
  if (items.length === 0) return null;

  const top = items[0]!;
  const TopIcon = SOURCE_ICON[top.source];
  const topEvidence = getEvidenceMetadata(top.id, top.source, top.evidence.trust);

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#11121a] via-[var(--color-bg-card)] to-black/40 shadow-2xl shadow-violet-950/10">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.4fr]">
        <div className="relative border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(113,112,255,0.16),transparent_42%)]" />
          <div className="relative">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-300">
              <Layers size={14} /> Ranked study queue
            </p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-white">Next review block</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-dim)]">
              Built from leak discovery, normalized BB-loss sorting, local reference-table checks, and focused drill queues: one ranked queue instead of another passive chart.
            </p>

            <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-400/10 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <TopIcon size={16} className="text-violet-200" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-200">Start now</span>
                </div>
                <span 
                  className={clsx('rounded-full border px-2 py-0.5 text-[9px] font-black uppercase transition-all duration-200 cursor-help', topEvidence.badgeClass)} 
                  title={topEvidence.tooltip}
                >
                  {topEvidence.label}
                </span>
                <span
                  className={clsx('rounded-full border px-2 py-0.5 text-[9px] font-black uppercase cursor-help', topEvidence.strengthClass)}
                  title={topEvidence.caveat}
                >
                  {topEvidence.strengthLabel}
                </span>
                <span
                  className={clsx('rounded-full border px-2 py-0.5 text-[9px] font-black uppercase cursor-help', topEvidence.citationClass)}
                  title={topEvidence.citationTooltip}
                >
                  {topEvidence.citationLabel}
                </span>
              </div>
              <p className="font-data text-lg font-black text-white">{top.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/60">{top.explanation}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-yellow-100/70">{topEvidence.caveat}</p>
              <Link
                to={routeFor(top)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-violet-400"
              >
                {top.cta} <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {items.map((item, index) => {
            const Icon = SOURCE_ICON[item.source];
            const evidence = getEvidenceMetadata(item.id, item.source, item.evidence.trust);
            return (
              <Link
                key={item.id}
                to={routeFor(item)}
                className="group grid gap-3 p-4 transition hover:bg-white/[0.03] md:grid-cols-[auto_1fr_auto] md:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/30 font-data text-xs font-black text-white/70">
                    {index + 1}
                  </span>
                  <Icon size={17} className="text-violet-300" />
                </div>

                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="font-data text-sm font-black uppercase tracking-tight text-white group-hover:text-violet-200">{item.title}</p>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-black uppercase text-white/45">
                      {SOURCE_LABEL[item.source]}
                    </span>
                    <span 
                      className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase cursor-help', evidence.badgeClass)} 
                      title={evidence.tooltip}
                    >
                      {evidence.label}
                    </span>
                    <span
                      className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase cursor-help', evidence.strengthClass)}
                      title={evidence.caveat}
                    >
                      {evidence.strengthLabel}
                    </span>
                    <span
                      className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase cursor-help', evidence.citationClass)}
                      title={evidence.citationTooltip}
                    >
                      {evidence.citationLabel}
                    </span>
                    <span className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase', SEVERITY_CLASS[item.severity])}>
                      {item.severity}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-black uppercase text-white/45">
                      {confidenceLabel(item.confidence)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-text-dim)]">{item.explanation}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-yellow-100/60">{evidence.caveat}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-right md:w-56">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Priority</p>
                    <p className="font-data text-sm font-black text-white">{item.priorityScore}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Sample</p>
                    <p className="font-data text-sm font-black text-white">{item.sampleSize}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Damage</p>
                    <p className="font-data text-sm font-black text-rose-300">{bbLabel(item.estimatedBbLoss)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
