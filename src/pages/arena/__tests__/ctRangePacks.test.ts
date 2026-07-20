import { describe, expect, it } from 'vitest';
import { buildDealFromRangeSession } from '../ctRangePacks';
import { curriculumDecision } from '../curriculumSeeds';
import { evaluateDrillAction } from '../../../analysis/arenaDrillEngine';
import type { RangePack } from '../../../data/ctPacks/types';
import { RANGE_PACK_LOADERS } from '../../../data/ctPacks/loaders.generated';

const FIXTURE: RangePack = {
  slug: 'fixture-pack',
  title: 'Fixture pack',
  description: 'Fixture.',
  scenario: 'RFI',
  tier: 'foundational',
  methodology: 'gto_cev',
  source: { kind: 'brand_neutralized_snapshot_config', capturedAt: '2026-07-18', path: 'research/ct-trainer-2026-07-18/', sha256: 'a'.repeat(64) },
  cells: [
    {
      position: 'UTG',
      stackBb: 100,
      buckets: [
        { actions: ['fold'], combos: ['2d2c', '3d3c'] },
        { actions: ['raise_2'], combos: ['AhKh', '3d3c'] },
      ],
    },
  ],
};

// Deterministic rng cycling through fixed values: cellIndex=0 always, then
// combo index alternates to hit each distinct combo.
function scriptedRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length]!;
}

describe('deal-from-range session', () => {
  it('samples exact combos and grades via bucket membership', () => {
    // combos sorted: ['2d2c','3d3c','AhKh']; rng picks cell 0 then combo index.
    const session = buildDealFromRangeSession(FIXTURE, 3, scriptedRng([0, 0, 0, 0.34, 0, 0.99]));
    expect(session.slug).toBe('fixture-pack');
    expect(session.source.kind).toBe('brand_neutralized_snapshot_config');
    expect(session.spots.map((spot) => spot.combo)).toEqual(['22', '33', 'AKs']);
    expect(session.spots.map((spot) => spot.acceptedActions)).toEqual([['fold'], ['fold', 'raise_2'], ['raise_2']]);
  });

  it('accepts any listed action for a mixed combo and rejects others', () => {
    const session = buildDealFromRangeSession(FIXTURE, 1, scriptedRng([0, 0.34]));
    const spot = session.spots[0]!;
    expect(spot.combo).toBe('33');
    const decision = curriculumDecision(session, spot);
    const ctx = { type: 'curriculum' as const, currentDecision: decision, currentPacket: null, currentCurriculumSpot: spot };

    expect(evaluateDrillAction(ctx, 'fold', 'game_plan')?.userIsCorrect).toBe(true);
    expect(evaluateDrillAction(ctx, 'raise_2', 'game_plan')?.userIsCorrect).toBe(true);
    expect(evaluateDrillAction(ctx, 'call', 'game_plan')?.userIsCorrect).toBe(false);
    expect(evaluateDrillAction(ctx, 'fold', 'game_plan')?.shouldRecordScore).toBe(true);
  });

  it('defaults to a fixed session length and only samples in-range actions', async () => {
    const module = await RANGE_PACK_LOADERS['open-raising-utg-utgplus1-lj-bb-early-seats-baseline']!();
    const pack = module.default;
    const legalActions = new Set(pack.cells.flatMap((cell) => cell.buckets.flatMap((bucket) => bucket.actions)));
    const session = buildDealFromRangeSession(pack);
    expect(session.spots).toHaveLength(20);
    for (const spot of session.spots) {
      expect(spot.acceptedActions.length).toBeGreaterThan(0);
      for (const action of spot.acceptedActions) expect(legalActions.has(action)).toBe(true);
    }
  });
});
