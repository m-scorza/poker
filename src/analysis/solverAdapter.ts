import type { ParsedHand } from '../parser/pokerstars';
import type { HeroDecision } from '../types/analysis';
import type { Action, PlayerInHand } from '../types/hand';

export type SolverStreet = 'preflop' | 'flop' | 'turn' | 'river';
export type SolverActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
export type SolverEvidenceKind = 'unsupported' | 'rule_based' | 'proxy_model' | 'solver_backed';

export interface SolverSpotAction {
  street: SolverStreet;
  playerPosition: string;
  action: SolverActionKind;
  amountBb?: number;
}

export interface SolverTournamentContext {
  stage?: string;
  playersRemaining?: number;
  paidPlaces?: number;
  averageStackBb?: number;
  isBounty?: boolean;
  requiresIcm?: boolean;
}

export interface SolverSpotInput {
  handId: string;
  gameType: 'mtt' | 'cash' | 'sng' | 'unknown';
  street: SolverStreet;
  heroPosition: string;
  heroStackBb: number;
  effectiveStackBb: number;
  potBb: number;
  board: string[];
  heroCards?: string[];
  actions: SolverSpotAction[];
  tournamentContext?: SolverTournamentContext;
}

export interface SolverCoverage {
  status: 'unsupported' | 'partial' | 'covered';
  reason?:
    | 'no_solver_configured'
    | 'unsupported_game_type'
    | 'unsupported_street'
    | 'unsupported_stack_depth'
    | 'unsupported_tournament_context'
    | 'missing_required_context';
  confidence: 'none' | 'low' | 'medium' | 'high';
}

export interface SolverRecommendation {
  preferredAction: SolverActionKind;
  mixedActions?: Array<{ action: SolverActionKind; frequency: number }>;
  notes?: string[];
}

export interface SolverAnalysisResult {
  spotId: string;
  source: 'local-boundary' | string;
  evidenceKind: SolverEvidenceKind;
  coverage: SolverCoverage;
  recommendation: SolverRecommendation | null;
  evLossBb: number | null;
  explanation: string;
}

export interface SolverAdapter {
  readonly id: string;
  readonly evidenceKind: SolverEvidenceKind;
  analyze(spot: SolverSpotInput): Promise<SolverAnalysisResult>;
}

export interface SolverCoverageOptions {
  solverConfigured?: boolean;
  supportedGameTypes?: Array<SolverSpotInput['gameType']>;
  supportedStreets?: SolverStreet[];
  maxEffectiveStackBb?: number;
}

export type SolverSpotBuildWarning =
  | 'missing_hero_player'
  | 'missing_hero_cards'
  | 'missing_big_blind'
  | 'unsupported_street'
  | 'missing_hero_action';

export interface SolverSpotBuildResult {
  spot: SolverSpotInput | null;
  warnings: SolverSpotBuildWarning[];
}

const FORCED_ACTION_TYPES = new Set<Action['actionType']>(['post_ante', 'post_sb', 'post_bb']);

function roundBb(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function boardCards(parsedHand: ParsedHand, street: SolverStreet): string[] {
  const { hand } = parsedHand;
  if (street === 'preflop') return [];

  const cards = [...(hand.boardFlop ?? [])];
  if ((street === 'turn' || street === 'river') && hand.boardTurn) cards.push(hand.boardTurn);
  if (street === 'river' && hand.boardRiver) cards.push(hand.boardRiver);
  return cards;
}

function mapSolverAction(action: Action): SolverActionKind | null {
  if (action.isAllIn) return 'all-in';
  switch (action.actionType) {
    case 'fold':
    case 'check':
    case 'call':
    case 'raise':
    case 'bet':
      return action.actionType;
    case 'post_ante':
    case 'post_sb':
    case 'post_bb':
      return null;
  }
}

function playerPosition(playerName: string, players: PlayerInHand[]): string | null {
  return players.find((player) => player.playerName === playerName)?.position ?? null;
}

function potBeforeActionBb(actions: Action[], stopSequence: number, bigBlind: number): number {
  return roundBb(
    actions
      .filter((action) => action.sequence < stopSequence && action.amount !== null)
      .reduce((sum, action) => sum + (action.amount ?? 0), 0) / bigBlind,
  );
}

function effectiveStackBb(hero: PlayerInHand, players: PlayerInHand[], bigBlind: number): number {
  const largestOpponentStack = players
    .filter((player) => !player.isHero)
    .reduce((largest, player) => Math.max(largest, player.chipsBefore), 0);
  return roundBb(Math.min(hero.chipsBefore, largestOpponentStack || hero.chipsBefore) / bigBlind);
}

export function buildSolverSpotInputFromParsedHand(
  parsedHand: ParsedHand,
  heroDecision: HeroDecision,
): SolverSpotBuildResult {
  const warnings: SolverSpotBuildWarning[] = [];
  const { hand, players, actions } = parsedHand;
  const bigBlind = hand.bigBlind;
  const hero = players.find((player) => player.isHero || player.handId === heroDecision.handId && player.position === heroDecision.position);

  if (!hero) warnings.push('missing_hero_player');
  if (!hero?.holeCards) warnings.push('missing_hero_cards');
  if (bigBlind <= 0) warnings.push('missing_big_blind');

  const heroAction = actions.find(
    (action) =>
      action.playerName === hero?.playerName &&
      action.street === 'preflop' &&
      !FORCED_ACTION_TYPES.has(action.actionType),
  );
  if (!heroAction) warnings.push('missing_hero_action');

  const street: SolverStreet = 'preflop';
  if (!hero || !hero.holeCards || bigBlind <= 0 || !heroAction) {
    return { spot: null, warnings };
  }

  const solverActions = actions
    .filter((action) => action.street === street && action.sequence < heroAction.sequence)
    .map((action): SolverSpotAction | null => {
      const actionKind = mapSolverAction(action);
      const position = playerPosition(action.playerName, players);
      if (!actionKind || !position) return null;
      return {
        street,
        playerPosition: position,
        action: actionKind,
        ...(action.amount !== null ? { amountBb: roundBb(action.amount / bigBlind) } : {}),
      };
    })
    .filter((action): action is SolverSpotAction => action !== null);

  return {
    spot: {
      handId: hand.id,
      gameType: hand.tournamentId ? 'mtt' : 'cash',
      street,
      heroPosition: hero.position,
      heroStackBb: roundBb(hero.chipsBefore / bigBlind),
      effectiveStackBb: effectiveStackBb(hero, players, bigBlind),
      potBb: potBeforeActionBb(actions, heroAction.sequence, bigBlind),
      board: boardCards(parsedHand, street),
      heroCards: [...hero.holeCards],
      actions: solverActions,
      tournamentContext: heroDecision.icmStage ? { stage: heroDecision.icmStage } : undefined,
    },
    warnings,
  };
}

export function classifySolverCoverage(
  spot: SolverSpotInput,
  options: SolverCoverageOptions = {},
): SolverCoverage {
  if (!options.solverConfigured) {
    return { status: 'unsupported', reason: 'no_solver_configured', confidence: 'none' };
  }

  const supportedGameTypes = options.supportedGameTypes ?? ['mtt', 'cash'];
  const supportedStreets = options.supportedStreets ?? ['preflop', 'flop'];
  const maxEffectiveStackBb = options.maxEffectiveStackBb ?? 100;

  if (
    !spot.handId ||
    !spot.heroPosition ||
    !spot.heroStackBb ||
    !Number.isFinite(spot.heroStackBb) ||
    !spot.effectiveStackBb ||
    !Number.isFinite(spot.effectiveStackBb) ||
    !Number.isFinite(spot.potBb)
  ) {
    return { status: 'unsupported', reason: 'missing_required_context', confidence: 'none' };
  }
  if (!supportedGameTypes.includes(spot.gameType)) {
    return { status: 'unsupported', reason: 'unsupported_game_type', confidence: 'none' };
  }
  if (!supportedStreets.includes(spot.street)) {
    return { status: 'unsupported', reason: 'unsupported_street', confidence: 'none' };
  }
  if (spot.effectiveStackBb > maxEffectiveStackBb) {
    return { status: 'partial', reason: 'unsupported_stack_depth', confidence: 'low' };
  }
  if (spot.tournamentContext?.requiresIcm || spot.tournamentContext?.isBounty) {
    return { status: 'partial', reason: 'unsupported_tournament_context', confidence: 'low' };
  }
  return { status: 'covered', confidence: 'high' };
}

export function createUnsupportedSolverAdapter(): SolverAdapter {
  return {
    id: 'unsupported-local-boundary',
    evidenceKind: 'unsupported',
    async analyze(spot: SolverSpotInput): Promise<SolverAnalysisResult> {
      const coverage = classifySolverCoverage(spot);
      return {
        spotId: spot.handId,
        source: 'local-boundary',
        evidenceKind: 'unsupported',
        coverage,
        recommendation: null,
        evLossBb: null,
        explanation:
          'No solver adapter is configured. This boundary prevents the app from labeling rule-based or proxy findings as solver-backed EV.',
      };
    },
  };
}

export function createDeterministicProxySolverAdapter(): SolverAdapter {
  return {
    id: 'deterministic-proxy-fixture',
    evidenceKind: 'proxy_model',
    async analyze(spot: SolverSpotInput): Promise<SolverAnalysisResult> {
      const coverage = classifySolverCoverage(spot, { solverConfigured: true });
      if (coverage.status !== 'covered') {
        const tournamentWarning = coverage.reason === 'unsupported_tournament_context'
          ? ' ICM or bounty-sensitive spots require explicit model support and cannot use this proxy.'
          : '';
        return {
          spotId: spot.handId,
          source: 'deterministic-proxy-fixture',
          evidenceKind: 'unsupported',
          coverage,
          recommendation: null,
          evLossBb: null,
          explanation: `Coverage is ${coverage.status}; the deterministic proxy cannot produce a proxy recommendation.${tournamentWarning}`,
        };
      }

      const preferredAction = deterministicProxyAction(spot);
      return {
        spotId: spot.handId,
        source: 'deterministic-proxy-fixture',
        evidenceKind: 'proxy_model',
        coverage,
        recommendation: {
          preferredAction,
          mixedActions: [{ action: preferredAction, frequency: 1 }],
          notes: [
            'Deterministic proxy fixture for internal UI/testing only.',
            'Not solver-backed and not suitable for EV-loss claims.',
          ],
        },
        evLossBb: null,
        explanation:
          'This is a deterministic proxy recommendation for internal testing, not a solver-backed analysis. It must not be described as solver EV.',
      };
    },
  };
}

function deterministicProxyAction(spot: SolverSpotInput): SolverActionKind {
  const candidates: SolverActionKind[] = ['fold', 'call', 'raise'];
  const key = [
    spot.gameType,
    spot.street,
    spot.heroPosition,
    spot.heroStackBb,
    spot.effectiveStackBb,
    spot.potBb,
    spot.heroCards?.join('') ?? '',
    spot.actions.map((action) => `${action.playerPosition}:${action.action}:${action.amountBb ?? ''}`).join('|'),
  ].join('#');
  const index = Math.abs(stableHash(key)) % candidates.length;
  return candidates[index] ?? 'call';
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return hash;
}
