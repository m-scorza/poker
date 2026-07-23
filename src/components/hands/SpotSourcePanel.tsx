import { AlertTriangle, CheckCircle2, Download, ListChecks, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import type {
  SpotPacket,
  SpotPacketEvidenceLabel,
  SpotPacketLegalAction,
  SpotPacketPreflopCaller,
  SpotPacketWarning,
} from '../../analysis/spotPacket';
import { chipAmount } from '../../utils/format';

interface SpotSourcePanelProps {
  packet: SpotPacket;
}

const EVIDENCE_LABELS: Record<SpotPacketEvidenceLabel, string> = {
  study_packet_only: 'Study packet only',
  rule_based_source: 'Rule-based source',
  proxy_model_source: 'Proxy model source',
  solver_backed_result: 'Solver-backed result',
};

const WARNING_LABELS: Record<SpotPacketWarning, string> = {
  missing_original_hand_history: 'Original hand history is missing',
  missing_hero_cards: 'Hero cards are missing',
  missing_big_blind: 'Big blind is missing',
  missing_ante_type: 'Ante type is unknown',
  missing_payouts: 'Payouts are missing',
  missing_players_remaining: 'Players remaining is missing',
  missing_paid_places: 'Paid places is missing',
  missing_field_stack_distribution: 'Full field stack distribution is missing',
  missing_bounty_context: 'Bounty context is missing',
  opponent_bounty_values_unknown: 'Opponent bounty values are unknown',
  pko_coverage_context_partial: 'Bounty/PKO coverage context is partial',
  multi_bounty_context_missing: 'Multi-bounty all-in context is missing',
  pko_pay_jump_context_missing: 'PKO pay-jump context is missing',
  range_assumptions_unknown: 'Range assumptions are unknown',
  bb_multiway_defense_context: 'BB multiway defense context needs review',
  risk_advantage_unknown: 'Risk advantage is unknown',
  icm_risk_context_estimated: 'ICM risk context is estimated',
  tree_configuration_required: 'External tree configuration is required',
  multiway_postflop_solver_limited: 'Multiway postflop solving is limited',
  unsupported_large_field_icm: 'Large-field ICM needs an external tool',
  external_tool_required: 'External tool required for exact output',
  not_solver_backed: 'Not solver-backed',
  legal_action_menu_inferred: 'Legal action menu is inferred',
  trainer_scoring_not_included: 'Trainer scoring is not included',
  source_summary_missing: 'Tournament summary is missing',
  rake_excluded_or_unknown: 'Rake is excluded or unknown',
  unsupported_room_native_parser: 'Room parser is recognized but unsupported',
};

const LEGAL_ACTION_CLASS: Record<SpotPacketLegalAction['action'], string> = {
  fold: 'border-white/10 bg-white/5 text-white/55',
  check: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  call: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  bet: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  raise: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
  all_in: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
};

const ACTION_SOURCE_LABEL: Record<SpotPacketLegalAction['source'], string> = {
  observed_hero_action: 'observed',
  scenario_inferred: 'inferred',
  trainer_config: 'trainer config',
};

const WARNING_PRIORITY: SpotPacketWarning[] = [
  'not_solver_backed',
  'trainer_scoring_not_included',
  'legal_action_menu_inferred',
  'opponent_bounty_values_unknown',
  'pko_coverage_context_partial',
  'multi_bounty_context_missing',
  'pko_pay_jump_context_missing',
  'bb_multiway_defense_context',
  'icm_risk_context_estimated',
  'missing_payouts',
  'missing_field_stack_distribution',
];

function prioritizedWarnings(warnings: SpotPacketWarning[]): SpotPacketWarning[] {
  return [
    ...WARNING_PRIORITY.filter((warning) => warnings.includes(warning)),
    ...warnings.filter((warning) => !WARNING_PRIORITY.includes(warning)),
  ];
}

function formatSourceValue(value: string): string {
  return value.replace(/_/g, ' ');
}

function formatBb(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${chipAmount(value)}bb`;
}

function formatRiskRelationship(value: NonNullable<SpotPacket['riskContext']>['riskRelationship']): string {
  return value.replace(/_/g, ' ');
}

function formatPosition(value: SpotPacketPreflopCaller['position']): string {
  return value ?? 'Unknown';
}

function formatPreflopFocus(value: SpotPacket['preflopContext']['reviewFocus']): string {
  const labels: Record<SpotPacket['preflopContext']['reviewFocus'], string> = {
    unopened_raise_review: 'unopened raise review',
    heads_up_open_defense: 'heads-up open defense',
    squeeze_or_iso_review: 'squeeze / iso review',
    limped_pot_review: 'limped pot review',
    three_bet_or_more_review: '3-bet+ review',
    walk_or_unopened: 'walk / unopened',
    other_preflop_review: 'preflop review',
  };
  return labels[value];
}

function formatCallerRole(value: SpotPacketPreflopCaller['role']): string {
  const labels: Record<SpotPacketPreflopCaller['role'], string> = {
    limper_before_open: 'limp before open',
    caller_after_open: 'after open',
    caller_without_raise: 'limp / call',
  };
  return labels[value];
}

function formatCaller(caller: SpotPacketPreflopCaller): string {
  const amount = caller.amountBb === null ? '' : ` ${formatBb(caller.amountBb)}`;
  return `${formatPosition(caller.position)} ${formatCallerRole(caller.role)}${amount}`;
}

function preflopFlags(packet: SpotPacket): string {
  const flags = [
    packet.preflopContext.squeezeCandidate ? 'squeeze candidate' : null,
    packet.preflopContext.isoRaiseOverLimp ? 'iso-raise over limp' : null,
  ].filter(Boolean);
  return flags.length ? flags.join(', ') : 'review only';
}

function formatAssumptionList(values: string[]): string {
  if (values.length === 0) return 'none';
  return values.map(formatSourceValue).join(', ');
}

function externalReviewTargetReasonLabel(
  reason: NonNullable<NonNullable<SpotPacket['externalReview']>['targetHints']>[number]['reason'],
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

function packetJson(packet: SpotPacket): string {
  return JSON.stringify(packet, null, 2);
}

function packetFilename(packet: SpotPacket): string {
  const safeId = packet.packetId.replace(/[^a-z0-9._-]/gi, '-');
  return `${safeId || 'spot-packet'}.json`;
}

function downloadPacketJson(packet: SpotPacket): void {
  const blob = new Blob([packetJson(packet)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = packetFilename(packet);
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SpotSourcePanel({ packet }: SpotSourcePanelProps) {
  const prioritized = prioritizedWarnings(packet.warnings);
  const visibleWarnings = prioritized.slice(0, 8);
  const extraWarningCount = packet.warnings.length - visibleWarnings.length;

  return (
    <section
      aria-label="Spot study packet"
      data-testid="spot-source-panel"
      className="mb-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-200">
              <ShieldCheck size={12} /> {EVIDENCE_LABELS[packet.evidenceLabel]}
            </span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-200">
              Local only
            </span>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200">
              Not solver-backed
            </span>
          </div>
          <h4 className="mt-2 font-data text-sm font-black uppercase tracking-tight text-white">Study Packet</h4>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-[var(--fg-dim)]">
            This is a reproducible local review packet for the current hand. It exposes source, legal-action, and risk-context metadata without EV, solver frequencies, trainer answers, or raw hand text.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <button
            type="button"
            onClick={() => downloadPacketJson(packet)}
            data-testid="spot-source-panel-download-json"
            className="inline-flex items-center gap-1 rounded-lg border border-violet-400/25 bg-violet-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-violet-100 transition hover:border-violet-300/45 hover:bg-violet-400/20"
            aria-label="Download spot packet JSON"
            title="Download sanitized SpotPacket JSON for local study/export"
          >
            <Download size={12} /> JSON
          </button>
          <div className="font-data text-[10px] uppercase tracking-wider text-white/45">
            <div>{packet.packetId}</div>
            <div>{formatSourceValue(packet.source.site)} / {formatSourceValue(packet.source.parserConfidence)}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
        <div data-testid="spot-source-panel-legal-menu" className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-200">
            <ListChecks size={13} /> Legal menu
          </div>
          <div className="flex flex-wrap gap-2">
            {packet.trainerPrompt.legalActions.map((action) => (
              <span
                key={action.id}
                className={clsx(
                  'rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wide',
                  LEGAL_ACTION_CLASS[action.action],
                )}
                title={`${ACTION_SOURCE_LABEL[action.source]}${action.amountBb !== null ? ` · ${formatBb(action.amountBb)}` : ''}`}
              >
                {action.label}
                <span className="ml-1 text-white/35">{ACTION_SOURCE_LABEL[action.source]}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--fg-muted)]">
            Prompt source: {formatSourceValue(packet.trainerPrompt.source)}. Scoring status: {formatSourceValue(packet.trainerPrompt.scoring.status)}; mixed-action prompts are supported, but answer buckets are intentionally absent.
          </p>
        </div>

        <div data-testid="spot-source-panel-caveats" className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-200">
            <AlertTriangle size={13} /> Caveats
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleWarnings.map((warning) => (
              <span
                key={warning}
                className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-100/80"
              >
                {WARNING_LABELS[warning]}
              </span>
            ))}
            {extraWarningCount > 0 && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/45">
                +{extraWarningCount} more
              </span>
            )}
          </div>
          {packet.riskContext && (
            <div data-testid="spot-source-panel-risk-context" className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <span className="text-[var(--fg-dim)]">Risk context</span>
              <span className="text-right font-data font-bold text-white">table-stack estimate</span>
              <span className="text-[var(--fg-dim)]">Hero stack</span>
              <span className="text-right font-data font-bold text-white">{formatBb(packet.riskContext.heroStackBb)}</span>
              <span className="text-[var(--fg-dim)]">Opener relation</span>
              <span className="text-right font-data font-bold text-white">{formatRiskRelationship(packet.riskContext.riskRelationship)}</span>
            </div>
          )}
          {(packet.preflopContext.callersBeforeHero.length > 0 || packet.preflopContext.reviewFocus === 'squeeze_or_iso_review') && (
            <div data-testid="spot-source-panel-preflop-context" className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <span className="text-[var(--fg-dim)]">Preflop context</span>
              <span className="text-right font-data font-bold text-white">{formatPreflopFocus(packet.preflopContext.reviewFocus)}</span>
              <span className="text-[var(--fg-dim)]">Opener</span>
              <span className="text-right font-data font-bold text-white">{formatPosition(packet.preflopContext.openerPosition)}</span>
              <span className="text-[var(--fg-dim)]">Callers before hero</span>
              <span className="text-right font-data font-bold text-white">
                {packet.preflopContext.callersBeforeHero.length > 0
                  ? packet.preflopContext.callersBeforeHero.map(formatCaller).join(', ')
                  : 'none'}
              </span>
              <span className="text-[var(--fg-dim)]">Review flags</span>
              <span className="text-right font-data font-bold text-white">{preflopFlags(packet)}</span>
            </div>
          )}
        </div>
      </div>

      {packet.externalReview && (
        <div
          data-testid="spot-source-panel-external-review"
          className="mt-3 rounded-lg border border-sky-400/20 bg-sky-400/10 p-3 text-[11px] leading-relaxed"
        >
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-200">
            <ShieldCheck size={13} /> External review target
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <span className="block text-[var(--fg-dim)]">Target</span>
              <span className="font-data font-bold text-white">{packet.externalReview.targetLabel}</span>
            </div>
            <div>
              <span className="block text-[var(--fg-dim)]">Reproducible packet hash</span>
              <span className="font-data font-bold text-white">{packet.externalReview.packetHash}</span>
            </div>
            <div>
              <span className="block text-[var(--fg-dim)]">Assumptions present</span>
              <span className="font-data font-bold text-white">
                {formatAssumptionList(packet.externalReview.assumptions.present)}
              </span>
            </div>
            <div>
              <span className="block text-[var(--fg-dim)]">Assumptions missing</span>
              <span className="font-data font-bold text-white">
                {formatAssumptionList(packet.externalReview.assumptions.missing)}
              </span>
            </div>
          </div>
          {packet.externalReview.targetHints && packet.externalReview.targetHints.length > 0 && (
            <div
              className="mt-3 rounded-md border border-white/10 bg-black/20 p-2"
              data-testid="spot-source-panel-target-hints"
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-sky-100/60">Suggested target families</p>
              <div className="mt-2 grid gap-1.5">
                {packet.externalReview.targetHints.map((hint) => (
                  <div
                    key={`${hint.family}-${hint.reason}-${hint.targets.join('-')}`}
                    className="rounded-md border border-sky-300/15 bg-sky-300/[0.05] px-2 py-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-data font-black text-white">{hint.targetLabels.join(' / ')}</span>
                      <span className="rounded-full border border-sky-200/20 bg-sky-200/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-100/70">
                        Suggested only
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--fg-muted)]">{externalReviewTargetReasonLabel(hint.reason)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-white/45">
                Target hints route manual review setup only; they do not upload this hand, attach solver EV, import frequencies, or reveal trainer answers.
              </p>
            </div>
          )}
          <p className="mt-2 text-[var(--fg-muted)]">
            External result status: {formatSourceValue(packet.externalReview.result.status)}. This block is a sanitized setup checklist only; no solver result, EV, frequency, or trainer answer is attached.
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-[11px] leading-relaxed text-[var(--fg-muted)]">
        <CheckCircle2 size={13} className="shrink-0 text-emerald-300" />
        Export target: {formatSourceValue(packet.target)} · Review ask: {formatSourceValue(packet.reviewQuestion.ask)} · Exact risk premium and solver EV are not included.
      </div>
    </section>
  );
}
