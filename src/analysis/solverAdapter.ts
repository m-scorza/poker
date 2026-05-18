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

export function classifySolverCoverage(_spot: SolverSpotInput): SolverCoverage {
  return {
    status: 'unsupported',
    reason: 'no_solver_configured',
    confidence: 'none',
  };
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
