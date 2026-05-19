import { describe, expect, it } from 'vitest';
import {
  createDeterministicProxySolverAdapter,
  createUnsupportedSolverAdapter,
  classifySolverCoverage,
  type SolverSpotInput,
} from '../solverAdapter';

const baseSpot: SolverSpotInput = {
  handId: 'H-1',
  gameType: 'mtt',
  street: 'preflop',
  heroPosition: 'BB',
  heroStackBb: 22,
  effectiveStackBb: 18,
  potBb: 5.5,
  board: [],
  heroCards: ['As', 'Kd'],
  actions: [
    { street: 'preflop', playerPosition: 'BTN', action: 'raise', amountBb: 2.2 },
    { street: 'preflop', playerPosition: 'BB', action: 'call', amountBb: 1.2 },
  ],
  tournamentContext: {
    stage: 'middle',
    playersRemaining: 84,
    paidPlaces: 45,
  },
};

describe('solver adapter boundary', () => {
  it('classifies clearly unsupported spots before any solver claims are made', () => {
    expect(classifySolverCoverage(baseSpot)).toEqual({
      status: 'unsupported',
      reason: 'no_solver_configured',
      confidence: 'none',
    });
  });

  it('returns no recommendation from the unsupported adapter and preserves the spot id', async () => {
    const adapter = createUnsupportedSolverAdapter();
    const result = await adapter.analyze(baseSpot);

    expect(result.spotId).toBe('H-1');
    expect(result.coverage.status).toBe('unsupported');
    expect(result.recommendation).toBeNull();
    expect(result.evLossBb).toBeNull();
    expect(result.explanation).toContain('No solver adapter is configured');
  });

  it('keeps rule/proxy/solver-backed labels explicit in result metadata', async () => {
    const result = await createUnsupportedSolverAdapter().analyze(baseSpot);

    expect(result.evidenceKind).toBe('unsupported');
    expect(result.source).toBe('local-boundary');
    expect(result.coverage.confidence).toBe('none');
  });

  it('classifies spot readiness without making solver EV claims when a solver is configured later', () => {
    expect(classifySolverCoverage({ ...baseSpot, heroStackBb: 0 }, { solverConfigured: true })).toEqual({
      status: 'unsupported',
      reason: 'missing_required_context',
      confidence: 'none',
    });
    expect(classifySolverCoverage({ ...baseSpot, gameType: 'unknown' }, { solverConfigured: true })).toEqual({
      status: 'unsupported',
      reason: 'unsupported_game_type',
      confidence: 'none',
    });
    expect(classifySolverCoverage({ ...baseSpot, street: 'turn' }, { solverConfigured: true })).toEqual({
      status: 'unsupported',
      reason: 'unsupported_street',
      confidence: 'none',
    });
    expect(classifySolverCoverage({ ...baseSpot, effectiveStackBb: 160 }, { solverConfigured: true })).toEqual({
      status: 'partial',
      reason: 'unsupported_stack_depth',
      confidence: 'low',
    });
    expect(
      classifySolverCoverage(
        { ...baseSpot, tournamentContext: { stage: 'bubble', requiresIcm: true } },
        { solverConfigured: true },
      ),
    ).toEqual({
      status: 'partial',
      reason: 'unsupported_tournament_context',
      confidence: 'low',
    });
  });

  it('returns deterministic proxy recommendations without solver-backed evidence or EV loss', async () => {
    const adapter = createDeterministicProxySolverAdapter();

    const first = await adapter.analyze(baseSpot);
    const second = await adapter.analyze({ ...baseSpot, actions: [...baseSpot.actions] });

    expect(adapter.evidenceKind).toBe('proxy_model');
    expect(first.evidenceKind).toBe('proxy_model');
    expect(first.evidenceKind).not.toBe('solver_backed');
    expect(first.evLossBb).toBeNull();
    expect(first.coverage.status).toBe('covered');
    expect(first.recommendation).not.toBeNull();
    expect(first).toEqual(second);
    expect(first.explanation).toContain('deterministic proxy');
    expect(first.explanation).toContain('not a solver');
  });

  it('keeps proxy adapter unsupported when required context is missing', async () => {
    const adapter = createDeterministicProxySolverAdapter();
    const result = await adapter.analyze({ ...baseSpot, handId: '', heroStackBb: Number.NaN });

    expect(result.evidenceKind).toBe('unsupported');
    expect(result.coverage).toEqual({
      status: 'unsupported',
      reason: 'missing_required_context',
      confidence: 'none',
    });
    expect(result.recommendation).toBeNull();
    expect(result.evLossBb).toBeNull();
    expect(result.explanation).toContain('cannot produce a proxy recommendation');
  });

  it('does not recommend through the proxy adapter for ICM or bounty-sensitive tournament spots', async () => {
    const adapter = createDeterministicProxySolverAdapter();
    const result = await adapter.analyze({
      ...baseSpot,
      tournamentContext: { stage: 'bubble', requiresIcm: true, isBounty: true },
    });

    expect(result.evidenceKind).toBe('unsupported');
    expect(result.coverage).toEqual({
      status: 'partial',
      reason: 'unsupported_tournament_context',
      confidence: 'low',
    });
    expect(result.recommendation).toBeNull();
    expect(result.evLossBb).toBeNull();
    expect(result.explanation).toContain('ICM or bounty');
  });
});
