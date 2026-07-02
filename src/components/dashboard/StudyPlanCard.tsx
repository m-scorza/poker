import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpenCheck, CheckCircle2, Clock3, Crosshair, Download, Flame, Layers, RotateCcw, Star, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { StudyQueueItem } from '../../analysis/studyPlan';
import type { SpotPacketBundle, SpotPacketBundleWarning } from '../../analysis/spotPacket';
import {
  buildStudyPacketArenaPath,
  isStudyPacketSrsDue,
  readStudyPacketProgress,
  selectNextActionableStudyPacket,
  selectNextStudyPacket,
  studyPacketProgressKey,
  studyPacketSrsStatusLabel,
  updateStudyPacketProgress,
  writeStudyPacketProgress,
  type StudyPacketProgressEntry,
  type StudyPacketProgressStore,
  type StudyPacketProgressUpdateKind,
} from '../../analysis/studyPacketProgress';
import type { DataHealthSummary } from '../../data/importRuns';
import { getEvidenceMetadata } from '../../utils/evidence';

interface StudyPlanCardProps {
  items: StudyQueueItem[];
  spotPacketBundle?: SpotPacketBundle | null;
  dataHealthSummary?: DataHealthSummary | null;
}

const DATA_HEALTH_REVIEW_PATH = '/hands?panel=data-health#data-health';

type StudyQueueSpotPacket = SpotPacketBundle['packets'][number];

interface BundleProgressSummary {
  reviewed: number;
  starred: number;
  snoozed: number;
  due: number;
  total: number;
}

const SOURCE_LABEL: Record<StudyQueueItem['source'], string> = {
  leak: 'Leak Explorer',
  deviation: 'Range mistake',
  postflop: 'Trainer drill',
  loss: 'BB-loss review',
  reference: 'Reference table',
  data_health: 'Data Health',
};

const SOURCE_ICON: Record<StudyQueueItem['source'], typeof Crosshair> = {
  leak: Flame,
  deviation: Crosshair,
  postflop: BookOpenCheck,
  loss: TrendingDown,
  reference: Crosshair,
  data_health: Layers,
};

const SEVERITY_CLASS: Record<StudyQueueItem['severity'], string> = {
  critical: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  medium: 'border-warn/40 bg-warn/10 text-warn',
  low: 'border-white/10 bg-white/5 text-white/60',
};

function routeFor(item: StudyQueueItem): string {
  if (item.source === 'data_health') return DATA_HEALTH_REVIEW_PATH;
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

function percentLabel(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

function formatSourceValue(value: string): string {
  return value.replace(/_/g, ' ');
}

const SPECIAL_BUNDLE_WARNING_LABELS: Partial<Record<SpotPacketBundleWarning, string>> = {
  not_solver_backed: 'not solver-backed',
  trainer_scoring_not_included: 'trainer scoring omitted',
  legal_action_menu_inferred: 'legal menu inferred',
  study_queue_hand_missing: 'queued hand missing',
  empty_study_queue_bundle: 'empty bundle',
  source_summary_missing: 'summary missing',
  icm_risk_context_estimated: 'ICM risk estimated',
  bb_multiway_defense_context: 'BB multiway caveat',
};

function warningLabel(warning: SpotPacketBundleWarning): string {
  return SPECIAL_BUNDLE_WARNING_LABELS[warning] ?? formatSourceValue(warning);
}

function visibleBundleWarnings(bundle: SpotPacketBundle): string {
  const visible = bundle.warnings.slice(0, 4).map(warningLabel);
  const extraCount = bundle.warnings.length - visible.length;
  return extraCount > 0 ? `${visible.join('; ')}; +${extraCount} more` : visible.join('; ');
}

function bundleCoverageLabel(bundle: SpotPacketBundle): string {
  const requested = bundle.source.requestedHandCount;
  return `${bundle.source.packetCount}/${requested} packet${bundle.source.packetCount === 1 ? '' : 's'} built`;
}

function externalReviewCoverageLabel(summary: NonNullable<SpotPacketBundle['externalReview']>): string {
  const packetLabel = summary.packetCount === 1 ? 'packet' : 'packets';
  return `${summary.targetLabel}: ${summary.packetsWithChecklist}/${summary.packetCount} ${packetLabel} checklist-ready`;
}

function externalReviewMissingAssumptionsLabel(summary: NonNullable<SpotPacketBundle['externalReview']>): string {
  if (summary.missingAssumptionCounts.length === 0) return 'none';
  const visible = summary.missingAssumptionCounts
    .slice(0, 5)
    .map(({ assumption, packetCount }) => `${formatSourceValue(assumption)} ${packetCount}/${summary.packetCount}`);
  const extraCount = summary.missingAssumptionCounts.length - visible.length;
  return extraCount > 0 ? `${visible.join('; ')}; +${extraCount} more` : visible.join('; ');
}

function externalReviewTargetReasonLabel(
  reason: NonNullable<NonNullable<SpotPacketBundle['externalReview']>['targetHints']>[number]['reason'],
): string {
  switch (reason) {
    case 'icm_pko_or_all_in_preflop':
      return 'ICM/PKO/all-in preflop review';
    case 'postflop_tree_or_line_review':
      return 'postflop tree/line review';
    case 'preflop_range_configuration':
      return 'preflop range/config review';
    default:
      return formatSourceValue(reason);
  }
}

function externalReviewTargetHintsLabel(summary: NonNullable<SpotPacketBundle['externalReview']>): string {
  const hints = summary.targetHints ?? [];
  if (hints.length === 0) return 'none';
  const visible = hints
    .slice(0, 4)
    .map((hint) => `${hint.targetLabels.join(' / ')} · ${externalReviewTargetReasonLabel(hint.reason)} ${hint.packetCount}/${summary.packetCount}`);
  const extraCount = hints.length - visible.length;
  return extraCount > 0 ? `${visible.join('; ')}; +${extraCount} more` : visible.join('; ');
}

function nextPacketSummary(packet: StudyQueueSpotPacket | null): string {
  if (!packet) return 'No actionable packet due now.';
  return `${packet.hero.handKey} · ${packet.hero.position} · ${formatSourceValue(packet.hero.scenario)}`;
}

function nextPacketSource(packet: StudyQueueSpotPacket | null): string {
  if (!packet) return 'Reviewed packets wait for their SRS date; snoozed packets stay skipped until unsnoozed or reset.';
  return `${formatSourceValue(packet.source.site)} / ${formatSourceValue(packet.source.parserConfidence)} · ${packet.trainerPrompt.legalActions.length} legal action${packet.trainerPrompt.legalActions.length === 1 ? '' : 's'} · ${formatSourceValue(packet.reviewQuestion.ask)}`;
}

function omittedHandsLabel(bundle: SpotPacketBundle): string {
  if (bundle.omittedHands.length === 0) return 'none';
  const reasonCounts = bundle.omittedHands.reduce<Record<string, number>>((counts, omitted) => {
    counts[omitted.reason] = (counts[omitted.reason] ?? 0) + 1;
    return counts;
  }, {});
  return Object.entries(reasonCounts)
    .map(([reason, count]) => `${formatSourceValue(reason)} ${count}`)
    .join('; ');
}

function bundleFilename(bundle: SpotPacketBundle): string {
  const safeId = bundle.bundleId.replace(/[^a-z0-9._-]/gi, '-');
  return `${safeId || 'study-queue-spot-bundle'}.json`;
}

function packetReviewPath(packet: StudyQueueSpotPacket | null): string | null {
  if (!packet?.source.handId) return null;
  return `/hands?panel=spot-packet&reviewHand=${encodeURIComponent(packet.source.handId)}#spot-packet`;
}

function summarizeBundleProgress(
  bundle: SpotPacketBundle | null | undefined,
  progress: StudyPacketProgressStore,
): BundleProgressSummary {
  if (!bundle) return { reviewed: 0, starred: 0, snoozed: 0, due: 0, total: 0 };
  const entries = bundle.packets
    .map((packet) => progress[studyPacketProgressKey(packet)])
    .filter((entry): entry is StudyPacketProgressEntry => Boolean(entry));
  return {
    reviewed: entries.filter((entry) => Boolean(entry.reviewedAt)).length,
    starred: entries.filter((entry) => entry.starred).length,
    snoozed: entries.filter((entry) => Boolean(entry.snoozedAt)).length,
    due: entries.filter((entry) => isStudyPacketSrsDue(entry)).length,
    total: bundle.packets.length,
  };
}

function progressStatusLabel(entry: StudyPacketProgressEntry | undefined): string {
  const labels: string[] = [];
  if (entry?.reviewedAt) labels.push('reviewed');
  if (entry?.starred) labels.push('starred');
  if (entry?.snoozedAt) labels.push('snoozed');
  if (isStudyPacketSrsDue(entry)) labels.push('SRS due');
  return labels.length > 0 ? labels.join(' · ') : 'not started';
}

function packetCountLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function progressOverviewCopy(
  summary: BundleProgressSummary,
  packet: StudyQueueSpotPacket | null,
  entry: StudyPacketProgressEntry | undefined,
): string {
  const dueCue = summary.due > 0 ? `${packetCountLabel(summary.due, 'packet')} due now. ` : '';
  const snoozeCue = summary.snoozed > 0 ? `${packetCountLabel(summary.snoozed, 'packet')} snoozed and skipped by routing. ` : '';
  if (!packet && summary.total > 0) {
    return `${dueCue}${snoozeCue}No actionable packet is due now; reviewed packets wait for their SRS date and snoozed packets stay skipped until unsnoozed or reset.`;
  }
  return `${dueCue}${snoozeCue}Next packet: ${studyPacketSrsStatusLabel(entry)}. Reset in the source/config drawer clears only the selected browser-local marker.`;
}

function downloadSpotPacketBundle(bundle: SpotPacketBundle): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = bundleFilename(bundle);
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function StudyPlanCard({ items, spotPacketBundle, dataHealthSummary }: StudyPlanCardProps) {
  const [packetProgress, setPacketProgress] = useState<StudyPacketProgressStore>(() => readStudyPacketProgress());
  const progressSummary = useMemo(
    () => summarizeBundleProgress(spotPacketBundle, packetProgress),
    [spotPacketBundle, packetProgress],
  );
  const nextPacket = useMemo(
    () => selectNextActionableStudyPacket(spotPacketBundle?.packets ?? [], packetProgress),
    [spotPacketBundle, packetProgress],
  );
  const progressPacket = useMemo(
    () => nextPacket ?? selectNextStudyPacket(spotPacketBundle?.packets ?? [], packetProgress),
    [nextPacket, spotPacketBundle, packetProgress],
  );
  const nextPacketProgress = nextPacket ? packetProgress[studyPacketProgressKey(nextPacket)] : undefined;
  const progressPacketProgress = progressPacket ? packetProgress[studyPacketProgressKey(progressPacket)] : undefined;
  const progressPacketIsActionable = Boolean(
    nextPacket && progressPacket && studyPacketProgressKey(nextPacket) === studyPacketProgressKey(progressPacket),
  );

  useEffect(() => {
    setPacketProgress(readStudyPacketProgress());
  }, [spotPacketBundle?.bundleId]);

  const updatePacketProgress = useCallback((packet: StudyQueueSpotPacket | null | undefined, kind: StudyPacketProgressUpdateKind) => {
    if (!packet) return;
    setPacketProgress((current) => {
      const next = updateStudyPacketProgress(current, packet, kind);
      writeStudyPacketProgress(next);
      return next;
    });
  }, []);

  if (items.length === 0) return null;

  const top = items[0]!;
  const TopIcon = SOURCE_ICON[top.source];
  const topEvidence = getEvidenceMetadata(top.id, top.source, top.evidence.trust);
  const canExportBundle = Boolean(spotPacketBundle && spotPacketBundle.packets.length > 0);
  const hasDataHealthItem = items.some((item) => item.source === 'data_health');
  const topWarningCategories = dataHealthSummary?.ledger.warningCategories.slice(0, 3) ?? [];
  const nextPacketPath = packetReviewPath(nextPacket);
  const nextPacketArenaPath = buildStudyPacketArenaPath(nextPacket, spotPacketBundle?.packets ?? [], packetProgress);

  return (
    <section
      className="overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#11121a] via-[var(--ink-2)] to-black/40 shadow-2xl shadow-violet-950/10"
      data-testid="study-queue-card"
    >
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.4fr]">
        <div className="relative border-b border-white/10 p-5 lg:border-b-0 lg:border-r" data-testid="study-queue-top-block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(113,112,255,0.16),transparent_42%)]" />
          <div className="relative">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-300">
              <Layers size={14} /> Ranked study queue
            </p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-white">Next review block</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fg-dim)]">
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
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--fg-dim)]">{topEvidence.caveat}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  to={routeFor(top)}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-violet-400"
                >
                  {top.cta} <ArrowRight size={13} />
                </Link>
                {canExportBundle && spotPacketBundle && (
                  <button
                    type="button"
                    onClick={() => downloadSpotPacketBundle(spotPacketBundle)}
                    className="inline-flex items-center gap-2 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-violet-100 transition hover:border-violet-200/50 hover:bg-violet-300/20"
                    aria-label="Download study queue packet bundle"
                    title="Download a local-only JSON bundle of sanitized SpotPackets for the ranked Study Queue hands"
                    data-testid="study-queue-packet-bundle-export"
                  >
                    <Download size={13} /> Export packet bundle
                  </button>
                )}
                {nextPacketPath && (
                  <Link
                    to={nextPacketPath}
                    onClick={() => updatePacketProgress(nextPacket, 'reviewed')}
                    className="inline-flex items-center gap-2 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/20"
                    aria-label="Review next study packet in Hand Replay"
                    title="Open the next sanitized SpotPacket in Hand Replay with source and trainer prompt panels"
                    data-testid="study-queue-next-packet-review-link"
                  >
                    Review next packet <ArrowRight size={13} />
                  </Link>
                )}
                {nextPacketArenaPath && (
                  <Link
                    to={nextPacketArenaPath}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/20"
                    aria-label="Drill next study packet in Arena"
                    title="Open the next sanitized Study Queue SpotPacket as an Arena drill from the imported hand sequence. Browser-local SRS progress advances after each prompt; no answer, score, solver EV, or trainer feedback is stored."
                    data-testid="study-queue-next-packet-arena-link"
                  >
                    <Crosshair size={13} /> Drill in Arena
                  </Link>
                )}
              </div>
              {spotPacketBundle && (
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--fg-dim)]" data-testid="study-queue-packet-bundle-summary">
                  Local-only bundle: {spotPacketBundle.packets.length} packet{spotPacketBundle.packets.length === 1 ? '' : 's'} from {spotPacketBundle.source.requestedHandCount} queued hand{spotPacketBundle.source.requestedHandCount === 1 ? '' : 's'}; no solver EV, trainer answers, raw hand text, or villain names are included.
                </p>
              )}
              {spotPacketBundle && progressSummary.total > 0 && (
                <div
                  className={clsx(
                    'mt-3 rounded-lg border px-3 py-2 text-[11px]',
                    progressSummary.due > 0
                      ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
                      : 'border-sky-300/15 bg-sky-300/10 text-sky-100',
                  )}
                  data-testid="study-queue-packet-progress-summary"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-black uppercase tracking-wider">
                      <CheckCircle2 size={13} /> Local study progress
                    </span>
                    <span className="font-data font-black text-white">
                      {progressSummary.reviewed}/{progressSummary.total} reviewed · {progressSummary.starred} starred · {progressSummary.snoozed} snoozed · {progressSummary.due} due now
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed opacity-70" data-testid="study-queue-packet-progress-overview-copy">
                    {progressOverviewCopy(progressSummary, nextPacket, nextPacketProgress)}
                  </p>
                  <p className="mt-1 leading-relaxed opacity-60">Browser-only spaced-repeat metadata; not solver EV, answers, or trainer scoring.</p>
                </div>
              )}
              {spotPacketBundle && (
                <details
                  className="mt-3 rounded-lg border border-violet-300/15 bg-black/25 p-3 text-[11px] text-[var(--fg-dim)]"
                  data-testid="study-queue-packet-bundle-config"
                >
                  <summary
                    className="cursor-pointer select-none text-[10px] font-black uppercase tracking-widest text-violet-200"
                    data-testid="study-queue-packet-bundle-config-summary"
                  >
                    SpotPacket source/config drawer
                  </summary>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Bundle boundary</p>
                      <p className="mt-1 font-data text-xs font-black text-white">{bundleCoverageLabel(spotPacketBundle)}</p>
                      <p className="mt-1 leading-relaxed">
                        Target {formatSourceValue(spotPacketBundle.target)} · {formatSourceValue(spotPacketBundle.evidenceLabel)} · local only
                      </p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2" data-testid="study-queue-next-packet-summary">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Next actionable packet</p>
                      <p className="mt-1 font-data text-xs font-black text-white">{nextPacketSummary(nextPacket)}</p>
                      <p className="mt-1 leading-relaxed">{nextPacketSource(nextPacket)}</p>
                    </div>
                    {spotPacketBundle.externalReview && (
                      <div
                        className="rounded-md border border-amber-300/15 bg-amber-300/[0.06] p-2 md:col-span-2"
                        data-testid="study-queue-external-review-summary"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-100/60">External review checklist</p>
                        <p className="mt-1 font-data text-xs font-black text-white">
                          {externalReviewCoverageLabel(spotPacketBundle.externalReview)}
                        </p>
                        <p className="mt-1 leading-relaxed">
                          Missing assumptions: {externalReviewMissingAssumptionsLabel(spotPacketBundle.externalReview)}.
                        </p>
                        <p className="mt-1 leading-relaxed">
                          Suggested target families: {externalReviewTargetHintsLabel(spotPacketBundle.externalReview)}.
                        </p>
                        <p className="mt-1 leading-relaxed text-white/45">
                          Result {formatSourceValue(spotPacketBundle.externalReview.result.status)} · {formatSourceValue(spotPacketBundle.externalReview.result.evidenceLabel)} · target hints are suggested-only metadata; no auto-upload, solver EV, frequencies, trainer answers, or scoring attached.
                        </p>
                      </div>
                    )}
                    {progressPacket && (
                      <div
                        className="rounded-md border border-sky-300/15 bg-sky-300/[0.06] p-2 md:col-span-2"
                        data-testid="study-queue-next-packet-progress"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-sky-100/55">{progressPacketIsActionable ? 'Next packet progress' : 'Skipped packet progress'}</p>
                            <p className="mt-1 font-data text-xs font-black text-white">{progressStatusLabel(progressPacketProgress)}</p>
                            <p className="mt-1 leading-relaxed text-white/45" data-testid="study-queue-next-packet-srs">
                              {studyPacketSrsStatusLabel(progressPacketProgress)}. {progressPacketIsActionable ? 'Local SRS marker for this sanitized packet only' : 'Selected skipped packet marker; unsnooze or reset it if you want it to become actionable again'}; it does not record an answer, score, EV, or raw hand text.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => updatePacketProgress(progressPacket, 'reviewed')}
                              className={clsx(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition',
                                progressPacketProgress?.reviewedAt
                                  ? 'border-emerald-300/50 bg-emerald-300/15 text-emerald-100'
                                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-emerald-300/35 hover:text-emerald-100',
                              )}
                              aria-pressed={Boolean(progressPacketProgress?.reviewedAt)}
                              data-testid="study-queue-mark-reviewed-button"
                            >
                              <CheckCircle2 size={12} /> Reviewed
                            </button>
                            <button
                              type="button"
                              onClick={() => updatePacketProgress(progressPacket, 'starred')}
                              className={clsx(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition',
                                progressPacketProgress?.starred
                                  ? 'border-amber-300/50 bg-amber-300/15 text-amber-100'
                                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-amber-300/35 hover:text-amber-100',
                              )}
                              aria-pressed={Boolean(progressPacketProgress?.starred)}
                              data-testid="study-queue-toggle-star-button"
                            >
                              <Star size={12} /> Star
                            </button>
                            <button
                              type="button"
                              onClick={() => updatePacketProgress(progressPacket, 'snoozed')}
                              className={clsx(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition',
                                progressPacketProgress?.snoozedAt
                                  ? 'border-violet-300/50 bg-violet-300/15 text-violet-100'
                                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-violet-300/35 hover:text-violet-100',
                              )}
                              aria-pressed={Boolean(progressPacketProgress?.snoozedAt)}
                              data-testid="study-queue-toggle-snooze-button"
                            >
                              <Clock3 size={12} /> Snooze
                            </button>
                            <button
                              type="button"
                              onClick={() => updatePacketProgress(progressPacket, 'reset')}
                              className={clsx(
                                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider transition',
                                progressPacketProgress
                                  ? 'border-white/10 bg-white/[0.03] text-white/60 hover:border-rose-300/35 hover:text-rose-100'
                                  : 'border-white/5 bg-white/[0.02] text-white/30',
                              )}
                              aria-label="Reset next packet local study progress"
                              title="Clear only the browser-local progress/SRS marker for this sanitized packet. No hand data, answer, score, or EV is stored or removed."
                              data-testid="study-queue-reset-progress-button"
                            >
                              <RotateCcw size={12} /> Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2 md:col-span-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Caveats / omissions</p>
                      <p className="mt-1 leading-relaxed" data-testid="study-queue-packet-bundle-warnings">
                        {visibleBundleWarnings(spotPacketBundle) || 'no warnings'} · omitted hands: {omittedHandsLabel(spotPacketBundle)}
                      </p>
                      <p className="mt-1 leading-relaxed text-white/45">
                        This drawer is a source/config preview for local review only; it does not expose solver EV, trainer feedback, raw hand text, local paths, or villain names.
                      </p>
                    </div>
                  </div>
                </details>
              )}
              {hasDataHealthItem && dataHealthSummary && (
                <div
                  className="mt-3 rounded-lg border border-warn/25 bg-warn/10 p-3 text-[11px] text-[var(--fg-dim)]"
                  data-testid="study-queue-data-health-summary"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-black uppercase tracking-wider text-warn">
                      <AlertTriangle size={13} /> Upload/Data Health
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 font-data text-[9px] font-black uppercase text-white/55">
                      {dataHealthSummary.ledger.analysisPosture}
                    </span>
                  </div>
                  <p className="mt-2 leading-relaxed">
                    {dataHealthSummary.message} {dataHealthSummary.ledger.reviewFocus}
                  </p>
                  <p className="mt-2 leading-relaxed text-white/60">
                    Import ledger: {dataHealthSummary.ledger.parsedFiles}/{dataHealthSummary.ledger.totalFiles} files parsed ({percentLabel(dataHealthSummary.ledger.parsedFileRate)}); failed files {dataHealthSummary.ledger.failedFiles}; retained warnings are local diagnostics only.
                  </p>
                  {topWarningCategories.length > 0 ? (
                    <p className="mt-2 leading-relaxed text-white/60">
                      Top warning categories: {topWarningCategories.map((row) => `${row.label} ${row.count}`).join('; ')}.
                    </p>
                  ) : (
                    <p className="mt-2 leading-relaxed text-white/45">
                      No retained parser warning categories yet; this queue item is driven by per-hand source/context caveats.
                    </p>
                  )}
                  <Link
                    to={DATA_HEALTH_REVIEW_PATH}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-warn transition hover:bg-warn/15"
                    data-testid="study-queue-data-health-link"
                  >
                    Open Data Health <ArrowRight size={12} />
                  </Link>
                </div>
              )}
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
                data-testid={`study-queue-item-${index + 1}`}
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
                  <p className="line-clamp-2 text-xs leading-relaxed text-[var(--fg-dim)]">{item.explanation}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-[var(--fg-dim)]">{evidence.caveat}</p>
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
