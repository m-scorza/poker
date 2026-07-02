import type { ParsedHand } from '../parser/pokerstars';
import type { FileType, PokerSite } from '../parser/siteIdentifier';
import type { HeroDecision, Position } from '../types/analysis';
import type { Action } from '../types/hand';
import type { StudyQueueItem } from './studyPlan';

export type SpotPacketTarget =
  | 'generic'
  | 'hrc'
  | 'icmizer'
  | 'gto_wizard'
  | 'postflopizer'
  | 'texas_solver'
  | 'wasm_postflop';

export type SpotPacketEvidenceLabel =
  | 'study_packet_only'
  | 'rule_based_source'
  | 'proxy_model_source'
  | 'solver_backed_result';

export type SpotPacketFileType = FileType | 'tracker_export' | 'manual_entry';
export type SpotPacketAccessMethod = 'local_file' | 'local_folder' | 'client_export' | 'tracker_export' | 'manual_entry' | 'unknown';
export type SpotPacketParserConfidence = 'high' | 'medium' | 'low' | 'unknown';
export type SpotPacketTournamentContextSource = 'imported_summary' | 'manual_entry' | 'tracker_export' | 'external_tool' | 'unknown';

export type SpotPacketExternalReviewAssumption =
  | 'source_metadata'
  | 'blinds_and_antes'
  | 'hero_cards'
  | 'table_stacks'
  | 'action_path'
  | 'pot_and_rake'
  | 'payout_table'
  | 'players_remaining'
  | 'paid_places'
  | 'field_stack_distribution'
  | 'opponent_bounty_table'
  | 'range_assumptions'
  | 'tree_configuration'
  | 'calculation_model';

export type SpotPacketExternalReviewTargetFamily =
  | 'preflop_solution_review'
  | 'tournament_icm_push_fold'
  | 'postflop_tree_review';

export type SpotPacketExternalReviewTargetReason =
  | 'preflop_range_configuration'
  | 'icm_pko_or_all_in_preflop'
  | 'postflop_tree_or_line_review';

export interface SpotPacketExternalReviewTargetHint {
  family: SpotPacketExternalReviewTargetFamily;
  targets: SpotPacketTarget[];
  targetLabels: string[];
  reason: SpotPacketExternalReviewTargetReason;
  status: 'suggested_only';
}

export interface SpotPacketExternalReview {
  status: 'not_submitted';
  target: SpotPacketTarget;
  targetLabel: string;
  packetHash: string;
  targetHints?: SpotPacketExternalReviewTargetHint[];
  assumptions: {
    present: SpotPacketExternalReviewAssumption[];
    missing: SpotPacketExternalReviewAssumption[];
  };
  result: {
    status: 'not_attached';
    evidenceLabel: 'study_packet_only';
    solverBacked: false;
  };
}

export interface SpotPacketPayoutTableContext {
  source: SpotPacketTournamentContextSource;
  valuesAvailable: true;
  valuesIncluded: boolean;
}

export interface SpotPacketOpponentBountyTableContext {
  source: SpotPacketTournamentContextSource;
  valuesAvailable: true;
  valuesIncluded: false;
  playerCount?: number;
}

export type SpotPacketWarning =
  | 'missing_original_hand_history'
  | 'missing_hero_cards'
  | 'missing_big_blind'
  | 'missing_ante_type'
  | 'missing_payouts'
  | 'missing_players_remaining'
  | 'missing_paid_places'
  | 'missing_field_stack_distribution'
  | 'missing_bounty_context'
  | 'opponent_bounty_values_unknown'
  | 'pko_coverage_context_partial'
  | 'multi_bounty_context_missing'
  | 'pko_pay_jump_context_missing'
  | 'range_assumptions_unknown'
  | 'bb_multiway_defense_context'
  | 'risk_advantage_unknown'
  | 'icm_risk_context_estimated'
  | 'tree_configuration_required'
  | 'multiway_postflop_solver_limited'
  | 'unsupported_large_field_icm'
  | 'external_tool_required'
  | 'not_solver_backed'
  | 'legal_action_menu_inferred'
  | 'trainer_scoring_not_included'
  | 'source_summary_missing'
  | 'rake_excluded_or_unknown'
  | 'unsupported_room_native_parser';

export interface SpotPacketSource {
  handId: string;
  site: PokerSite;
  fileType: SpotPacketFileType;
  accessMethod: SpotPacketAccessMethod;
  parserConfidence: SpotPacketParserConfidence;
  localOnly: true;
}

export interface SpotPacketGame {
  type: 'mtt' | 'cash' | 'unknown';
  smallBlind: number;
  bigBlind: number;
  ante: number;
  maxSeats: number;
  activePlayers: number;
}

export interface SpotPacketTournament {
  id: string;
  name?: string;
  buyIn?: number;
  fee?: number;
  currency?: string;
  finishPosition?: number | null;
  prize?: number | null;
  bounty?: number | null;
  icmStage?: string;
  playersRemaining?: number;
  paidPlaces?: number;
  payouts?: number[];
  payoutTable?: SpotPacketPayoutTableContext;
  opponentBountyTable?: SpotPacketOpponentBountyTableContext;
}

export interface SpotPacketPlayer {
  playerId: string;
  seatNumber: number;
  position: Position;
  stackChips: number;
  stackBb: number | null;
  isHero: boolean;
  hasHoleCards: boolean;
}

export interface SpotPacketHero {
  position: Position;
  handKey: string;
  action: HeroDecision['action'];
  stackBb: number;
  scenario: HeroDecision['scenario'];
  openerPosition?: Position | null;
  deviationType: HeroDecision['deviationType'];
}

export interface SpotPacketAction {
  sequence: number;
  street: Action['street'];
  playerId: string;
  playerPosition: Position | null;
  action: Action['actionType'];
  amountChips: number | null;
  amountBb: number | null;
  isAllIn: boolean;
}

export interface SpotPacketPot {
  totalChips: number;
  totalBb: number | null;
  rakeChips: number;
}

export interface SpotPacketRiskContext {
  source: 'table_stacks_only';
  exactRiskPremium: false;
  heroStackBb: number | null;
  openerStackBb: number | null;
  effectiveStackBb: number | null;
  heroStackRank: number | null;
  knownStackCount: number;
  shortestKnownStackBb: number | null;
  riskRelationship: 'hero_covers_opener' | 'opener_covers_hero' | 'same_stack' | 'unknown';
}

export type SpotPacketLegalActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';
export type SpotPacketLegalActionSource = 'scenario_inferred' | 'observed_hero_action' | 'trainer_config';

export interface SpotPacketLegalAction {
  id: string;
  action: SpotPacketLegalActionKind;
  label: string;
  amountChips: number | null;
  amountBb: number | null;
  source: SpotPacketLegalActionSource;
}

export interface SpotPacketTrainerPrompt {
  source: 'parsed_hand' | 'trainer_config';
  sourceId?: string;
  moduleId?: string;
  configId?: string;
  legalActions: SpotPacketLegalAction[];
  scoring: {
    status: 'not_included';
    supportsMixedActions: true;
  };
}

export interface SpotPacketReviewQuestion {
  scenario: HeroDecision['scenario'];
  heroAction: HeroDecision['action'];
  heroHand: string;
  ask: 'external_review' | 'study_prompt';
}

export type SpotPacketPreflopCallerRole = 'limper_before_open' | 'caller_after_open' | 'caller_without_raise';
export type SpotPacketPreflopReviewFocus =
  | 'unopened_raise_review'
  | 'heads_up_open_defense'
  | 'squeeze_or_iso_review'
  | 'limped_pot_review'
  | 'three_bet_or_more_review'
  | 'walk_or_unopened'
  | 'other_preflop_review';

export interface SpotPacketPreflopCaller {
  sequence: number;
  position: Position | null;
  role: SpotPacketPreflopCallerRole;
  amountBb: number | null;
}

export interface SpotPacketPreflopContext {
  openerPosition: Position | null;
  raiseCountBeforeHero: number;
  callerCountBeforeHero: number;
  callersBeforeHero: SpotPacketPreflopCaller[];
  limperPositionsBeforeOpen: Array<Position | null>;
  callerPositionsAfterOpen: Array<Position | null>;
  squeezeCandidate: boolean;
  isoRaiseOverLimp: boolean;
  reviewFocus: SpotPacketPreflopReviewFocus;
}

export interface SpotPacket {
  schemaVersion: 'spot-packet/v1';
  packetId: string;
  inputHash: string;
  createdAt: string;
  target: SpotPacketTarget;
  evidenceLabel: SpotPacketEvidenceLabel;
  externalReview?: SpotPacketExternalReview;
  warnings: SpotPacketWarning[];
  source: SpotPacketSource;
  game: SpotPacketGame;
  tournament?: SpotPacketTournament;
  players: SpotPacketPlayer[];
  hero: SpotPacketHero;
  actionPath: SpotPacketAction[];
  board: string[];
  pot: SpotPacketPot;
  preflopContext: SpotPacketPreflopContext;
  riskContext?: SpotPacketRiskContext;
  trainerPrompt: SpotPacketTrainerPrompt;
  reviewQuestion: SpotPacketReviewQuestion;
}

export interface BuildSpotPacketLegalActionInput {
  action: SpotPacketLegalActionKind;
  label?: string;
  amountChips?: number | null;
  source?: SpotPacketLegalActionSource;
}

export interface BuildSpotPacketTrainerPromptOptions {
  source?: SpotPacketTrainerPrompt['source'];
  sourceId?: string;
  moduleId?: string;
  configId?: string;
  legalActions?: BuildSpotPacketLegalActionInput[];
}

export interface BuildSpotPacketExternalReviewOptions {
  enabled?: boolean;
  targetLabel?: string;
}

export type BuildSpotPacketTournamentContext = Pick<
  SpotPacketTournament,
  'playersRemaining' | 'paidPlaces' | 'payouts' | 'payoutTable' | 'opponentBountyTable'
>;

export interface BuildSpotPacketOptions {
  createdAt?: string;
  target?: SpotPacketTarget;
  source?: Partial<Omit<SpotPacketSource, 'handId' | 'localOnly'>>;
  tournamentContext?: BuildSpotPacketTournamentContext;
  trainerPrompt?: BuildSpotPacketTrainerPromptOptions;
  externalReview?: BuildSpotPacketExternalReviewOptions;
}

export type SpotPacketBundleWarning =
  | SpotPacketWarning
  | 'empty_study_queue_bundle'
  | 'study_queue_hand_missing';

export type SpotPacketBundleOmissionReason =
  | 'missing_parsed_hand'
  | 'missing_hero_decision'
  | 'packet_limit_reached';

export interface SpotPacketBundleQueueItem {
  itemId: string;
  title: string;
  source: StudyQueueItem['source'];
  priorityScore: number;
  confidence: StudyQueueItem['confidence'];
  handIds: string[];
  packetIds: string[];
  missingHandIds: string[];
}

export interface SpotPacketBundleOmittedHand {
  itemId: string;
  handId: string;
  reason: SpotPacketBundleOmissionReason;
}

export interface SpotPacketBundleExternalReviewAssumptionCount {
  assumption: SpotPacketExternalReviewAssumption;
  packetCount: number;
}

export interface SpotPacketBundleExternalReviewTargetHint extends SpotPacketExternalReviewTargetHint {
  packetCount: number;
}

export interface SpotPacketBundleExternalReviewSummary {
  status: 'setup_checklist_only';
  target: SpotPacketTarget;
  targetLabel: string;
  packetCount: number;
  packetsWithChecklist: number;
  packetsMissingChecklist: number;
  targetHints?: SpotPacketBundleExternalReviewTargetHint[];
  missingAssumptionCounts: SpotPacketBundleExternalReviewAssumptionCount[];
  result: {
    status: 'not_attached';
    evidenceLabel: 'study_packet_only';
    solverBacked: false;
  };
}

export interface SpotPacketBundle {
  schemaVersion: 'spot-packet-bundle/v1';
  bundleId: string;
  inputHash: string;
  createdAt: string;
  target: SpotPacketTarget;
  evidenceLabel: SpotPacketEvidenceLabel;
  externalReview?: SpotPacketBundleExternalReviewSummary;
  localOnly: true;
  source: {
    type: 'study_queue';
    itemCount: number;
    requestedHandCount: number;
    packetCount: number;
  };
  warnings: SpotPacketBundleWarning[];
  queueItems: SpotPacketBundleQueueItem[];
  omittedHands: SpotPacketBundleOmittedHand[];
  packetIds: string[];
  packets: SpotPacket[];
}

export interface BuildStudyQueueSpotPacketBundleOptions {
  createdAt?: string;
  target?: SpotPacketTarget;
  maxPackets?: number;
  packetOptions?: Omit<BuildSpotPacketOptions, 'createdAt' | 'target'>;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function chipsToBb(amount: number | null, bigBlind: number): number | null {
  if (amount === null || bigBlind <= 0) return null;
  return round2(amount / bigBlind);
}

function boardCards(parsedHand: ParsedHand): string[] {
  const { hand } = parsedHand;
  return [
    ...(hand.boardFlop ?? []),
    ...(hand.boardTurn ? [hand.boardTurn] : []),
    ...(hand.boardRiver ? [hand.boardRiver] : []),
  ];
}

function isIcmSensitive(decision: HeroDecision): boolean {
  return decision.icmStage === 'bubble'
    || decision.icmStage === 'itm'
    || decision.icmStage === 'final_table'
    || Boolean(decision.bountyContext);
}

function isPkoContext(decision: HeroDecision): boolean {
  return decision.bountyContext?.tournamentType === 'knockout'
    || decision.bountyContext?.tournamentType === 'progressive_ko';
}

function isPayJumpSensitive(decision: HeroDecision): boolean {
  return decision.icmStage === 'bubble'
    || decision.icmStage === 'itm'
    || decision.icmStage === 'final_table';
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function stableHash(value: unknown): string {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function uniqueWarnings(warnings: SpotPacketWarning[]): SpotPacketWarning[] {
  return Array.from(new Set(warnings));
}

function uniqueBundleWarnings(warnings: SpotPacketBundleWarning[]): SpotPacketBundleWarning[] {
  return Array.from(new Set(warnings));
}

type SpotPacketExternalReviewCore = Omit<SpotPacketExternalReview, 'packetHash'>;

const EXTERNAL_REVIEW_TARGET_LABELS: Record<SpotPacketTarget, string> = {
  generic: 'Generic external review',
  hrc: 'HoldemResources Calculator (HRC)',
  icmizer: 'ICMIZER',
  gto_wizard: 'GTO Wizard',
  postflopizer: 'Postflopizer',
  texas_solver: 'TexasSolver',
  wasm_postflop: 'WASM postflop solver',
};

const PREFLOP_REVIEW_SCENARIOS = new Set<HeroDecision['scenario']>([
  'RFI',
  'BLIND_WAR',
  'HU_BTN',
  'FACING_RAISE',
  'FACING_3BET',
  'FACING_ALL_IN',
  'FACING_LIMP',
  'BB_VS_RAISE',
  'BB_VS_RAISE_MULTIWAY',
  'BB_VS_LARGE_RAISE',
  'BB_VS_LIMP',
]);

function externalReviewTargetHint(
  family: SpotPacketExternalReviewTargetFamily,
  targets: SpotPacketTarget[],
  reason: SpotPacketExternalReviewTargetReason,
): SpotPacketExternalReviewTargetHint {
  return {
    family,
    targets,
    targetLabels: targets.map((target) => EXTERNAL_REVIEW_TARGET_LABELS[target]),
    reason,
    status: 'suggested_only',
  };
}

function isPostflopReviewCandidate(heroDecision: HeroDecision, board: string[]): boolean {
  return board.length > 0
    || Boolean(heroDecision.postflopActions?.length)
    || heroDecision.cbetOpportunity
    || heroDecision.doubleBarrelOpportunity;
}

function buildExternalReviewTargetHints(
  heroDecision: HeroDecision,
  board: string[],
): SpotPacketExternalReviewTargetHint[] {
  const hints: SpotPacketExternalReviewTargetHint[] = [];

  const tournamentSensitivePreflop = isIcmSensitive(heroDecision)
    || heroDecision.scenario === 'FACING_ALL_IN'
    || Boolean(heroDecision.wentAllInPreflop)
    || Boolean(heroDecision.fakeShoveSpot)
    || Boolean(heroDecision.restealSpot);

  if (tournamentSensitivePreflop) {
    hints.push(externalReviewTargetHint(
      'tournament_icm_push_fold',
      ['hrc', 'icmizer'],
      'icm_pko_or_all_in_preflop',
    ));
  }

  if (isPostflopReviewCandidate(heroDecision, board)) {
    hints.push(externalReviewTargetHint(
      'postflop_tree_review',
      ['gto_wizard', 'postflopizer'],
      'postflop_tree_or_line_review',
    ));
  }

  if (hints.length === 0 && PREFLOP_REVIEW_SCENARIOS.has(heroDecision.scenario)) {
    hints.push(externalReviewTargetHint(
      'preflop_solution_review',
      ['gto_wizard', 'hrc'],
      'preflop_range_configuration',
    ));
  }

  return hints;
}

function shouldBuildExternalReview(
  target: SpotPacketTarget,
  options?: BuildSpotPacketExternalReviewOptions,
): boolean {
  return options?.enabled === true || target !== 'generic';
}

function buildExternalReviewCore(params: {
  target: SpotPacketTarget;
  targetLabel?: string;
  warnings: SpotPacketWarning[];
  actionPath: SpotPacketAction[];
  riskContext: SpotPacketRiskContext;
  hasPayoutContext: boolean;
  hasOpponentBountyContext: boolean;
  tournamentContext: BuildSpotPacketTournamentContext | undefined;
  targetHints: SpotPacketExternalReviewTargetHint[];
}): SpotPacketExternalReviewCore {
  const warningSet = new Set(params.warnings);
  const present: SpotPacketExternalReviewAssumption[] = ['source_metadata'];
  const missing: SpotPacketExternalReviewAssumption[] = [
    'range_assumptions',
    'tree_configuration',
    'calculation_model',
  ];

  if (warningSet.has('missing_big_blind')) missing.push('blinds_and_antes');
  else present.push('blinds_and_antes');

  if (warningSet.has('missing_hero_cards')) missing.push('hero_cards');
  else present.push('hero_cards');

  if (params.riskContext.knownStackCount > 0) present.push('table_stacks');
  else missing.push('table_stacks');

  if (params.actionPath.length > 0) present.push('action_path');
  else missing.push('action_path');

  if (warningSet.has('rake_excluded_or_unknown')) missing.push('pot_and_rake');
  else present.push('pot_and_rake');

  if (params.hasPayoutContext) present.push('payout_table');
  else if (warningSet.has('missing_payouts')) missing.push('payout_table');

  if (params.tournamentContext?.playersRemaining !== undefined) present.push('players_remaining');
  else if (warningSet.has('missing_players_remaining')) missing.push('players_remaining');

  if (params.tournamentContext?.paidPlaces !== undefined) present.push('paid_places');
  else if (warningSet.has('missing_paid_places')) missing.push('paid_places');

  if (warningSet.has('missing_field_stack_distribution')) missing.push('field_stack_distribution');
  else if (params.tournamentContext?.playersRemaining !== undefined) present.push('field_stack_distribution');

  if (params.hasOpponentBountyContext) present.push('opponent_bounty_table');
  else if (warningSet.has('opponent_bounty_values_unknown')) missing.push('opponent_bounty_table');

  return {
    status: 'not_submitted',
    target: params.target,
    targetLabel: params.targetLabel ?? EXTERNAL_REVIEW_TARGET_LABELS[params.target],
    ...(params.targetHints.length > 0 ? { targetHints: params.targetHints } : {}),
    assumptions: {
      present: Array.from(new Set(present)),
      missing: Array.from(new Set(missing)),
    },
    result: {
      status: 'not_attached',
      evidenceLabel: 'study_packet_only',
      solverBacked: false,
    },
  };
}

function countExternalReviewMissingAssumptions(
  reviews: SpotPacketExternalReview[],
): SpotPacketBundleExternalReviewAssumptionCount[] {
  const counts = new Map<SpotPacketExternalReviewAssumption, number>();

  for (const review of reviews) {
    for (const assumption of review.assumptions.missing) {
      counts.set(assumption, (counts.get(assumption) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([assumption, packetCount]) => ({ assumption, packetCount }));
}

function countExternalReviewTargetHints(
  reviews: SpotPacketExternalReview[],
): SpotPacketBundleExternalReviewTargetHint[] {
  const counts = new Map<string, { hint: SpotPacketExternalReviewTargetHint; packetCount: number }>();

  for (const review of reviews) {
    for (const hint of review.targetHints ?? []) {
      const key = `${hint.family}|${hint.reason}|${hint.targets.join(',')}`;
      const existing = counts.get(key);
      if (existing) existing.packetCount += 1;
      else counts.set(key, { hint, packetCount: 1 });
    }
  }

  return Array.from(counts.values())
    .sort((left, right) => right.packetCount - left.packetCount || left.hint.family.localeCompare(right.hint.family))
    .map(({ hint, packetCount }) => ({ ...hint, packetCount }));
}

function buildBundleExternalReviewSummary(
  target: SpotPacketTarget,
  packets: SpotPacket[],
): SpotPacketBundleExternalReviewSummary | undefined {
  const reviews = packets
    .map((packet) => packet.externalReview)
    .filter((review): review is SpotPacketExternalReview => Boolean(review));

  if (reviews.length === 0) return undefined;

  const targetHints = countExternalReviewTargetHints(reviews);

  return {
    status: 'setup_checklist_only',
    target,
    targetLabel: reviews[0]?.targetLabel ?? EXTERNAL_REVIEW_TARGET_LABELS[target],
    packetCount: packets.length,
    packetsWithChecklist: reviews.length,
    packetsMissingChecklist: Math.max(0, packets.length - reviews.length),
    ...(targetHints.length > 0 ? { targetHints } : {}),
    missingAssumptionCounts: countExternalReviewMissingAssumptions(reviews),
    result: {
      status: 'not_attached',
      evidenceLabel: 'study_packet_only',
      solverBacked: false,
    },
  };
}

function normalizedPayoutTableContext(
  tournamentContext: BuildSpotPacketTournamentContext | undefined,
): SpotPacketPayoutTableContext | undefined {
  if (tournamentContext?.payoutTable) return tournamentContext.payoutTable;
  if (tournamentContext?.payouts?.length) {
    return {
      source: 'unknown',
      valuesAvailable: true,
      valuesIncluded: true,
    };
  }
  return undefined;
}

function normalizedOpponentBountyTableContext(
  tournamentContext: BuildSpotPacketTournamentContext | undefined,
): SpotPacketOpponentBountyTableContext | undefined {
  const context = tournamentContext?.opponentBountyTable;
  if (!context) return undefined;

  return {
    source: context.source,
    valuesAvailable: true,
    valuesIncluded: false,
    ...(context.playerCount !== undefined && Number.isFinite(context.playerCount) && context.playerCount >= 0
      ? { playerCount: Math.floor(context.playerCount) }
      : {}),
  };
}

function legalActionId(action: SpotPacketLegalActionKind, amountBb: number | null): string {
  const actionSlug = action.replace('_', '-');
  return amountBb === null ? actionSlug : `${actionSlug}-${amountBb}bb`.replace('.', '_');
}

function legalActionLabel(action: SpotPacketLegalActionKind, amountBb: number | null): string {
  const baseLabel: Record<SpotPacketLegalActionKind, string> = {
    fold: 'Fold',
    check: 'Check',
    call: 'Call',
    bet: 'Bet',
    raise: 'Raise',
    all_in: 'All-in',
  };
  if (amountBb === null) return baseLabel[action];
  return `${baseLabel[action]} ${amountBb} BB`;
}

function legalActionsForScenario(heroDecision: HeroDecision): SpotPacketLegalActionKind[] {
  switch (heroDecision.scenario) {
    case 'RFI':
    case 'BLIND_WAR':
      return ['fold', 'raise', 'all_in'];
    case 'HU_BTN':
      return ['fold', 'call', 'raise', 'all_in'];
    case 'FACING_RAISE':
    case 'FACING_3BET':
    case 'BB_VS_RAISE':
    case 'BB_VS_RAISE_MULTIWAY':
    case 'BB_VS_LARGE_RAISE':
      return ['fold', 'call', 'raise', 'all_in'];
    case 'FACING_ALL_IN':
      return ['fold', 'call'];
    case 'FACING_LIMP':
      return ['fold', 'call', 'raise'];
    case 'BB_VS_LIMP':
      return ['check', 'raise'];
    case 'WALK':
      return ['check'];
    default:
      return ['fold', 'call', 'raise'];
  }
}

function observedHeroActionKind(
  heroDecision: HeroDecision,
  heroAction: Action | null,
): SpotPacketLegalActionKind {
  if (heroAction?.isAllIn || heroDecision.wentAllInPreflop) return 'all_in';
  if (heroAction?.actionType === 'bet') return 'bet';
  return heroDecision.action;
}

function normalizeLegalActions(
  legalActions: BuildSpotPacketLegalActionInput[],
  bigBlind: number,
  defaultSource: SpotPacketLegalActionSource,
): SpotPacketLegalAction[] {
  const normalized = legalActions.map((input): SpotPacketLegalAction => {
    const amountChips = input.amountChips ?? null;
    const amountBb = chipsToBb(amountChips, bigBlind);
    return {
      id: legalActionId(input.action, amountBb),
      action: input.action,
      label: input.label ?? legalActionLabel(input.action, amountBb),
      amountChips,
      amountBb,
      source: input.source ?? defaultSource,
    };
  });

  const seen = new Set<string>();
  return normalized.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  });
}

function buildInferredLegalActions(
  heroDecision: HeroDecision,
  heroAction: Action | null,
  bigBlind: number,
): SpotPacketLegalAction[] {
  const observedAction = observedHeroActionKind(heroDecision, heroAction);
  const scenarioActions = legalActionsForScenario(heroDecision);
  const actionKinds = scenarioActions.includes(observedAction)
    ? scenarioActions
    : [...scenarioActions, observedAction];

  return normalizeLegalActions(
    actionKinds.map((action) => {
      const observed = action === observedAction;
      return {
        action,
        amountChips: observed ? heroAction?.amount ?? null : null,
        source: observed ? 'observed_hero_action' : 'scenario_inferred',
      };
    }),
    bigBlind,
    'scenario_inferred',
  );
}

function buildTrainerPrompt(
  heroDecision: HeroDecision,
  heroAction: Action | null,
  bigBlind: number,
  options?: BuildSpotPacketTrainerPromptOptions,
): SpotPacketTrainerPrompt {
  const explicitLegalActions = options?.legalActions?.length
    ? normalizeLegalActions(
      options.legalActions,
      bigBlind,
      options.source === 'trainer_config' ? 'trainer_config' : 'scenario_inferred',
    )
    : null;

  return {
    source: options?.source ?? 'parsed_hand',
    ...(options?.sourceId ? { sourceId: options.sourceId } : {}),
    ...(options?.moduleId ? { moduleId: options.moduleId } : {}),
    ...(options?.configId ? { configId: options.configId } : {}),
    legalActions: explicitLegalActions ?? buildInferredLegalActions(heroDecision, heroAction, bigBlind),
    scoring: {
      status: 'not_included',
      supportsMixedActions: true,
    },
  };
}

function buildRiskContext(
  parsedHand: ParsedHand,
  heroDecision: HeroDecision,
  heroPlayer: ParsedHand['players'][number] | null,
): SpotPacketRiskContext {
  const bigBlind = parsedHand.hand.bigBlind;
  const heroStackBb = heroPlayer ? chipsToBb(heroPlayer.chipsBefore, bigBlind) : null;
  const openerPlayer = heroDecision.openerPosition
    ? parsedHand.players.find((player) => player.position === heroDecision.openerPosition) ?? null
    : null;
  const openerStackBb = openerPlayer ? chipsToBb(openerPlayer.chipsBefore, bigBlind) : null;
  const knownStacks = parsedHand.players
    .map((player) => ({
      isHero: player.isHero,
      seatNumber: player.seatNumber,
      stackBb: chipsToBb(player.chipsBefore, bigBlind),
    }))
    .filter((player): player is { isHero: boolean; seatNumber: number; stackBb: number } => player.stackBb !== null)
    .sort((left, right) => right.stackBb - left.stackBb || left.seatNumber - right.seatNumber);
  const heroKnownStack = knownStacks.find((player) => player.isHero);
  const heroStackRank = heroKnownStack ? knownStacks.indexOf(heroKnownStack) + 1 : null;
  const shortestKnownStackBb = knownStacks.length > 0 ? knownStacks[knownStacks.length - 1]!.stackBb : null;
  const effectiveStackBb = heroStackBb !== null && openerStackBb !== null ? Math.min(heroStackBb, openerStackBb) : null;
  const riskRelationship: SpotPacketRiskContext['riskRelationship'] = heroStackBb === null || openerStackBb === null
    ? 'unknown'
    : heroStackBb > openerStackBb
      ? 'hero_covers_opener'
      : openerStackBb > heroStackBb
        ? 'opener_covers_hero'
        : 'same_stack';

  return {
    source: 'table_stacks_only',
    exactRiskPremium: false,
    heroStackBb,
    openerStackBb,
    effectiveStackBb,
    heroStackRank,
    knownStackCount: knownStacks.length,
    shortestKnownStackBb,
    riskRelationship,
  };
}

const PREFLOP_VOLUNTARY_ACTIONS = new Set<SpotPacketAction['action']>(['fold', 'check', 'call', 'raise', 'bet']);

function buildPreflopContext(
  actionPath: SpotPacketAction[],
  heroDecision: HeroDecision,
): SpotPacketPreflopContext {
  const voluntaryPreflopActions = actionPath.filter((action) => (
    action.street === 'preflop' && PREFLOP_VOLUNTARY_ACTIONS.has(action.action)
  ));
  const heroActionIndex = voluntaryPreflopActions.findIndex((action) => action.playerId === 'hero');
  const actionsBeforeHero = (heroActionIndex === -1
    ? voluntaryPreflopActions
    : voluntaryPreflopActions.slice(0, heroActionIndex))
    .filter((action) => action.playerId !== 'hero');

  const raiseActions = actionsBeforeHero.filter((action) => action.action === 'raise');
  const firstRaiseSequence = raiseActions[0]?.sequence ?? null;
  const callersBeforeHero = actionsBeforeHero
    .filter((action) => action.action === 'call')
    .map((action): SpotPacketPreflopCaller => {
      const role: SpotPacketPreflopCallerRole = firstRaiseSequence === null
        ? 'caller_without_raise'
        : action.sequence < firstRaiseSequence
          ? 'limper_before_open'
          : 'caller_after_open';

      return {
        sequence: action.sequence,
        position: action.playerPosition,
        role,
        amountBb: action.amountBb,
      };
    });
  const callerPlayerIds = new Set(actionsBeforeHero
    .filter((action) => action.action === 'call')
    .map((action) => action.playerId));
  const limperPositionsBeforeOpen = callersBeforeHero
    .filter((caller) => caller.role === 'limper_before_open')
    .map((caller) => caller.position);
  const callerPositionsAfterOpen = callersBeforeHero
    .filter((caller) => caller.role === 'caller_after_open')
    .map((caller) => caller.position);
  const squeezeCandidate = raiseActions.length > 0 && callerPositionsAfterOpen.length > 0;
  const isoRaiseOverLimp = raiseActions.length > 0 && limperPositionsBeforeOpen.length > 0;
  const openerPosition = heroDecision.openerPosition ?? raiseActions[0]?.playerPosition ?? null;

  const reviewFocus: SpotPacketPreflopReviewFocus = raiseActions.length >= 2
    ? 'three_bet_or_more_review'
    : squeezeCandidate || isoRaiseOverLimp || heroDecision.scenario === 'BB_VS_RAISE_MULTIWAY'
      ? 'squeeze_or_iso_review'
      : heroDecision.scenario === 'BB_VS_RAISE'
        ? 'heads_up_open_defense'
        : callersBeforeHero.length > 0 && raiseActions.length === 0
          ? 'limped_pot_review'
          : heroDecision.scenario === 'RFI' || heroDecision.scenario === 'BLIND_WAR'
            ? 'unopened_raise_review'
            : heroDecision.scenario === 'WALK'
              ? 'walk_or_unopened'
              : 'other_preflop_review';

  return {
    openerPosition,
    raiseCountBeforeHero: raiseActions.length,
    callerCountBeforeHero: callerPlayerIds.size,
    callersBeforeHero,
    limperPositionsBeforeOpen,
    callerPositionsAfterOpen,
    squeezeCandidate,
    isoRaiseOverLimp,
    reviewFocus,
  };
}

function hasPotentialMultiBountyAllInContext(
  actionPath: SpotPacketAction[],
  preflopContext: SpotPacketPreflopContext,
): boolean {
  const nonHeroAllInPlayers = new Set(actionPath
    .filter((action) => action.street === 'preflop' && action.isAllIn && action.playerId !== 'hero')
    .map((action) => action.playerId));

  return nonHeroAllInPlayers.size >= 2
    || (nonHeroAllInPlayers.size >= 1 && preflopContext.callerCountBeforeHero > 0);
}

export function buildSpotPacketFromParsedHand(
  parsedHand: ParsedHand,
  heroDecision: HeroDecision,
  options: BuildSpotPacketOptions = {},
): SpotPacket {
  const { hand } = parsedHand;
  const bigBlind = hand.bigBlind;
  const target = options.target ?? 'generic';
  const externalReviewRequested = shouldBuildExternalReview(target, options.externalReview);
  const heroPlayer = parsedHand.players.find((player) => player.isHero)
    ?? parsedHand.players.find((player) => player.position === heroDecision.position)
    ?? null;

  const storedSource = hand.importSource;
  const source: SpotPacketSource = {
    handId: hand.id,
    site: options.source?.site ?? storedSource?.site ?? 'unknown',
    fileType: options.source?.fileType ?? storedSource?.fileType ?? 'hand_history',
    accessMethod: options.source?.accessMethod ?? storedSource?.accessMethod ?? 'unknown',
    parserConfidence: options.source?.parserConfidence ?? storedSource?.parserConfidence ?? 'unknown',
    localOnly: true,
  };

  const playerIdByName = new Map<string, string>();
  const players = parsedHand.players.map((player): SpotPacketPlayer => {
    const playerId = player.isHero ? 'hero' : `seat-${player.seatNumber}`;
    playerIdByName.set(player.playerName, playerId);
    return {
      playerId,
      seatNumber: player.seatNumber,
      position: player.position,
      stackChips: player.chipsBefore,
      stackBb: chipsToBb(player.chipsBefore, bigBlind),
      isHero: player.isHero,
      hasHoleCards: Boolean(player.holeCards),
    };
  });

  const sortedActions = [...parsedHand.actions].sort((left, right) => left.sequence - right.sequence);
  const voluntaryHeroActions = new Set<Action['actionType']>(['fold', 'check', 'call', 'raise', 'bet']);
  const heroAction = sortedActions.find((action) => {
    if (playerIdByName.get(action.playerName) !== 'hero') return false;
    if (!voluntaryHeroActions.has(action.actionType)) return false;
    return action.actionType === heroDecision.action || action.isAllIn || heroDecision.wentAllInPreflop;
  }) ?? null;

  const actionPath = sortedActions
    .map((action): SpotPacketAction => {
      const player = parsedHand.players.find((candidate) => candidate.playerName === action.playerName);
      return {
        sequence: action.sequence,
        street: action.street,
        playerId: playerIdByName.get(action.playerName) ?? 'unknown',
        playerPosition: player?.position ?? null,
        action: action.actionType,
        amountChips: action.amount,
        amountBb: chipsToBb(action.amount, bigBlind),
        isAllIn: action.isAllIn,
      };
    });
  const preflopContext = buildPreflopContext(actionPath, heroDecision);
  const riskContext = buildRiskContext(parsedHand, heroDecision, heroPlayer);
  const trainerPrompt = buildTrainerPrompt(heroDecision, heroAction, bigBlind, options.trainerPrompt);
  const board = boardCards(parsedHand);
  const targetHints = buildExternalReviewTargetHints(heroDecision, board);
  const payoutTable = normalizedPayoutTableContext(options.tournamentContext);
  const opponentBountyTable = normalizedOpponentBountyTableContext(options.tournamentContext);
  const hasPayoutContext = Boolean(payoutTable);
  const hasOpponentBountyContext = Boolean(opponentBountyTable);

  const warnings: SpotPacketWarning[] = ['not_solver_backed', 'trainer_scoring_not_included'];
  if (bigBlind <= 0) warnings.push('missing_big_blind');
  if (!heroPlayer?.holeCards) warnings.push('missing_hero_cards');
  if (hand.ante > 0) warnings.push('missing_ante_type');
  if (source.site === 'ggpoker') warnings.push('rake_excluded_or_unknown');
  if (source.site === 'known_unsupported') warnings.push('unsupported_room_native_parser');
  if (hand.tournamentId && source.fileType === 'hand_history') warnings.push('source_summary_missing');
  if (!options.trainerPrompt?.legalActions?.length) warnings.push('legal_action_menu_inferred');
  if (heroDecision.scenario === 'BB_VS_RAISE_MULTIWAY') warnings.push('bb_multiway_defense_context');

  if (isIcmSensitive(heroDecision)) {
    if (!hasPayoutContext) warnings.push('missing_payouts');
    if (options.tournamentContext?.playersRemaining === undefined) warnings.push('missing_players_remaining');
    if (options.tournamentContext?.paidPlaces === undefined) warnings.push('missing_paid_places');
    const fullFieldStacksVisible = options.tournamentContext?.playersRemaining !== undefined
      && options.tournamentContext.playersRemaining <= riskContext.knownStackCount;
    if (!fullFieldStacksVisible) warnings.push('missing_field_stack_distribution');
    warnings.push('icm_risk_context_estimated');
    if (riskContext.riskRelationship === 'unknown') warnings.push('risk_advantage_unknown');
    if (isPkoContext(heroDecision)) {
      if (!hasOpponentBountyContext) warnings.push('opponent_bounty_values_unknown');
      warnings.push('pko_coverage_context_partial');
      if (hasPotentialMultiBountyAllInContext(actionPath, preflopContext)) warnings.push('multi_bounty_context_missing');
      if (isPayJumpSensitive(heroDecision) && !hasPayoutContext) {
        warnings.push('pko_pay_jump_context_missing');
      }
      if (parsedHand.tournament.bounty == null && !hasOpponentBountyContext) warnings.push('missing_bounty_context');
    }
  }

  if (externalReviewRequested) {
    warnings.push('external_tool_required', 'tree_configuration_required', 'range_assumptions_unknown');
  }

  const packetWarnings = uniqueWarnings(warnings);
  const externalReviewCore = externalReviewRequested
    ? buildExternalReviewCore({
      target,
      targetLabel: options.externalReview?.targetLabel,
      warnings: packetWarnings,
      actionPath,
      riskContext,
      hasPayoutContext,
      hasOpponentBountyContext,
      tournamentContext: options.tournamentContext,
      targetHints,
    })
    : undefined;

  const tournament: SpotPacketTournament | undefined = hand.tournamentId ? {
    id: hand.tournamentId,
    ...(parsedHand.tournament.name ? { name: parsedHand.tournament.name } : {}),
    ...(parsedHand.tournament.buyIn !== undefined ? { buyIn: parsedHand.tournament.buyIn } : {}),
    ...(parsedHand.tournament.fee !== undefined ? { fee: parsedHand.tournament.fee } : {}),
    ...(parsedHand.tournament.currency ? { currency: parsedHand.tournament.currency } : {}),
    ...(parsedHand.tournament.finishPosition !== undefined ? { finishPosition: parsedHand.tournament.finishPosition } : {}),
    ...(parsedHand.tournament.prize !== undefined ? { prize: parsedHand.tournament.prize } : {}),
    ...(parsedHand.tournament.bounty !== undefined ? { bounty: parsedHand.tournament.bounty } : {}),
    ...(heroDecision.icmStage ? { icmStage: heroDecision.icmStage } : {}),
    ...(options.tournamentContext?.playersRemaining !== undefined ? { playersRemaining: options.tournamentContext.playersRemaining } : {}),
    ...(options.tournamentContext?.paidPlaces !== undefined ? { paidPlaces: options.tournamentContext.paidPlaces } : {}),
    ...(options.tournamentContext?.payouts !== undefined ? { payouts: options.tournamentContext.payouts } : {}),
    ...(payoutTable ? { payoutTable } : {}),
    ...(opponentBountyTable ? { opponentBountyTable } : {}),
  } : undefined;

  const game: SpotPacketGame = {
    type: hand.tournamentId ? 'mtt' : 'cash',
    smallBlind: hand.smallBlind,
    bigBlind,
    ante: hand.ante,
    maxSeats: hand.maxSeats,
    activePlayers: hand.activePlayers,
  };

  const hero: SpotPacketHero = {
    position: heroDecision.position,
    handKey: heroDecision.handKey,
    action: heroDecision.action,
    stackBb: heroDecision.stackBb,
    scenario: heroDecision.scenario,
    openerPosition: heroDecision.openerPosition,
    deviationType: heroDecision.deviationType,
  };
  const reviewAsk: SpotPacketReviewQuestion['ask'] = source.site === 'known_unsupported'
    ? 'study_prompt'
    : 'external_review';

  const packetCore = {
    schemaVersion: 'spot-packet/v1' as const,
    source,
    target,
    game,
    tournament,
    players,
    hero,
    actionPath,
    board,
    pot: {
      totalChips: hand.totalPot,
      totalBb: chipsToBb(hand.totalPot, bigBlind),
      rakeChips: hand.rake,
    },
    preflopContext,
    riskContext,
    trainerPrompt,
    reviewQuestion: {
      scenario: heroDecision.scenario,
      heroAction: heroDecision.action,
      heroHand: heroDecision.handKey,
      ask: reviewAsk,
    },
    warnings: packetWarnings,
    evidenceLabel: 'study_packet_only' as const,
  };
  const hashCore = externalReviewCore ? { ...packetCore, externalReview: externalReviewCore } : packetCore;
  const inputHash = stableHash(hashCore);

  return {
    ...packetCore,
    ...(externalReviewCore ? { externalReview: { ...externalReviewCore, packetHash: inputHash } } : {}),
    packetId: `spot-${inputHash}`,
    inputHash,
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
}

export function buildStudyQueueSpotPacketBundle(
  studyQueue: StudyQueueItem[],
  parsedHands: ParsedHand[],
  decisions: HeroDecision[],
  options: BuildStudyQueueSpotPacketBundleOptions = {},
): SpotPacketBundle {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const target = options.target ?? 'generic';
  const maxPackets = options.maxPackets ?? Number.POSITIVE_INFINITY;
  const studyQueueExternalReview = options.packetOptions?.externalReview ?? { enabled: true };
  const parsedByHandId = new Map(parsedHands.map((parsedHand) => [parsedHand.hand.id, parsedHand]));
  const decisionByHandId = new Map<string, HeroDecision>();
  for (const decision of decisions) {
    if (!decisionByHandId.has(decision.handId)) decisionByHandId.set(decision.handId, decision);
  }

  const requestedHandIds = new Set<string>();
  const packets: SpotPacket[] = [];
  const packetByHandId = new Map<string, SpotPacket>();
  const omittedHands: SpotPacketBundleOmittedHand[] = [];

  const queueItems = studyQueue.map((item): SpotPacketBundleQueueItem => {
    const packetIds = new Set<string>();
    const missingHandIds: string[] = [];

    for (const handId of item.handIds) {
      requestedHandIds.add(handId);

      const existingPacket = packetByHandId.get(handId);
      if (existingPacket) {
        packetIds.add(existingPacket.packetId);
        continue;
      }

      if (packets.length >= maxPackets) {
        omittedHands.push({ itemId: item.id, handId, reason: 'packet_limit_reached' });
        missingHandIds.push(handId);
        continue;
      }

      const parsedHand = parsedByHandId.get(handId);
      if (!parsedHand) {
        omittedHands.push({ itemId: item.id, handId, reason: 'missing_parsed_hand' });
        missingHandIds.push(handId);
        continue;
      }

      const decision = decisionByHandId.get(handId);
      if (!decision) {
        omittedHands.push({ itemId: item.id, handId, reason: 'missing_hero_decision' });
        missingHandIds.push(handId);
        continue;
      }

      const packet = buildSpotPacketFromParsedHand(parsedHand, decision, {
        ...options.packetOptions,
        createdAt,
        target,
        externalReview: studyQueueExternalReview,
      });
      packets.push(packet);
      packetByHandId.set(handId, packet);
      packetIds.add(packet.packetId);
    }

    return {
      itemId: item.id,
      title: item.title,
      source: item.source,
      priorityScore: item.priorityScore,
      confidence: item.confidence,
      handIds: [...item.handIds],
      packetIds: Array.from(packetIds),
      missingHandIds,
    };
  });

  const bundleWarnings = uniqueBundleWarnings([
    'not_solver_backed',
    'trainer_scoring_not_included',
    ...packets.flatMap((packet) => packet.warnings),
    ...(packets.length === 0 ? ['empty_study_queue_bundle' as const] : []),
    ...(omittedHands.length > 0 ? ['study_queue_hand_missing' as const] : []),
  ]);
  const externalReview = buildBundleExternalReviewSummary(target, packets);
  const bundleCore = {
    schemaVersion: 'spot-packet-bundle/v1' as const,
    target,
    evidenceLabel: 'study_packet_only' as const,
    ...(externalReview ? { externalReview } : {}),
    localOnly: true as const,
    source: {
      type: 'study_queue' as const,
      itemCount: studyQueue.length,
      requestedHandCount: requestedHandIds.size,
      packetCount: packets.length,
    },
    warnings: bundleWarnings,
    queueItems,
    omittedHands,
    packetIds: packets.map((packet) => packet.packetId),
  };
  const inputHash = stableHash(bundleCore);

  return {
    ...bundleCore,
    bundleId: `spot-bundle-${inputHash}`,
    inputHash,
    createdAt,
    packets,
  };
}
