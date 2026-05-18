import { describe, expect, it } from 'vitest';
import { createUnsupportedSolverAdapter, classifySolverCoverage, type SolverSpotInput } from '../solverAdapter';

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
});
