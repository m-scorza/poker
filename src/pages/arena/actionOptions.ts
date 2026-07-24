import type { CurriculumSpotSeed } from '../../data/curriculumSeedPacks.generated';
import type { SpotPacket, SpotPacketLegalAction, SpotPacketWarning } from '../../analysis/spotPacket';
import type { TrainerAction } from '../../analysis/arena/drillLogic';
import { labelSeedAction } from '../../analysis/arena/drillLogic';

export type { TrainerAction } from '../../analysis/arena/drillLogic';

export type ActionColor = 'gray' | 'blue' | 'emerald' | 'amber' | 'rose';

export interface ActionOption {
  id: string;
  label: string;
  action: TrainerAction;
  color: ActionColor;
  meta?: string;
}

export const PREFLOP_ACTIONS: ActionOption[] = [
  { id: 'fold', label: 'Fold', action: 'fold', color: 'gray' },
  { id: 'call', label: 'Call', action: 'call', color: 'blue' },
  { id: 'raise', label: 'Raise', action: 'raise', color: 'emerald' },
];

export const CBET_ACTIONS: ActionOption[] = [
  { id: 'check', label: 'Check', action: 'check', color: 'gray' },
  { id: 'cbet', label: 'C-bet', action: 'bet', color: 'emerald' },
];

const STUDY_PACKET_WARNING_LABELS: Partial<Record<SpotPacketWarning, string>> = {
  not_solver_backed: 'not solver-backed',
  trainer_scoring_not_included: 'trainer scoring omitted',
  legal_action_menu_inferred: 'legal menu inferred',
  source_summary_missing: 'summary missing',
  icm_risk_context_estimated: 'ICM risk estimated',
  missing_payouts: 'payouts missing',
  missing_field_stack_distribution: 'field stacks missing',
  bb_multiway_defense_context: 'BB multiway caveat',
};

const LEGAL_ACTION_COLOR: Record<SpotPacketLegalAction['action'], ActionColor> = {
  fold: 'gray',
  check: 'gray',
  call: 'blue',
  bet: 'amber',
  raise: 'emerald',
  all_in: 'rose',
};

const LEGAL_ACTION_SOURCE_LABEL: Record<SpotPacketLegalAction['source'], string> = {
  observed_hero_action: 'observed',
  scenario_inferred: 'inferred',
  trainer_config: 'trainer config',
};

const STUDY_PACKET_WARNING_PRIORITY: SpotPacketWarning[] = [
  'not_solver_backed',
  'trainer_scoring_not_included',
  'legal_action_menu_inferred',
  'bb_multiway_defense_context',
  'icm_risk_context_estimated',
  'missing_payouts',
  'missing_field_stack_distribution',
];

export function getDisplayCards(handKey: string | undefined): [string, string] {
  const key = handKey && handKey.length >= 2 ? handKey : 'AA';
  const r1 = key[0] ?? 'A';
  const r2 = key[1] ?? r1;
  const suited = key.endsWith('s');
  return [`${r1}s`, suited ? `${r2}s` : `${r2}h`];
}

export function formatSourceValue(value: string): string {
  return value.replace(/_/g, ' ');
}

function packetWarningLabel(warning: SpotPacketWarning): string {
  return STUDY_PACKET_WARNING_LABELS[warning] ?? formatSourceValue(warning);
}

export function visiblePacketWarnings(packet: SpotPacket): string {
  const prioritized = [
    ...STUDY_PACKET_WARNING_PRIORITY.filter((warning) => packet.warnings.includes(warning)),
    ...packet.warnings.filter((warning) => !STUDY_PACKET_WARNING_PRIORITY.includes(warning)),
  ];
  const visible = prioritized.slice(0, 4).map(packetWarningLabel);
  const extraCount = prioritized.length - visible.length;
  return extraCount > 0 ? `${visible.join(' · ')} · +${extraCount} more` : visible.join(' · ');
}

export function studyPacketActionOptions(packet: SpotPacket | null): ActionOption[] | null {
  if (!packet?.trainerPrompt.legalActions.length) return null;
  return packet.trainerPrompt.legalActions.map((legalAction) => ({
    id: legalAction.id,
    label: legalAction.label,
    action: legalAction.action,
    color: LEGAL_ACTION_COLOR[legalAction.action],
    meta: LEGAL_ACTION_SOURCE_LABEL[legalAction.source],
  }));
}

function actionColorForSeed(action: string): ActionColor {
  if (action === 'fold' || action === 'check') return 'gray';
  if (action === 'call') return 'blue';
  if (action === 'all_in') return 'rose';
  if (action.startsWith('bet_')) return 'amber';
  return 'emerald';
}

export function curriculumActionOptions(spot: CurriculumSpotSeed | null): ActionOption[] | null {
  if (!spot) return null;
  const allActions = new Set<string>(
    spot.legalActions?.length
      ? [...spot.legalActions, ...spot.acceptedActions]
      : ['fold', 'call', 'raise', 'check', 'all_in', ...spot.acceptedActions],
  );
  return Array.from(allActions).map((action) => ({
    id: action,
    label: labelSeedAction(action),
    action,
    color: actionColorForSeed(action),
    meta: spot.acceptedActions.includes(action) ? 'seed answer' : 'option',
  }));
}
