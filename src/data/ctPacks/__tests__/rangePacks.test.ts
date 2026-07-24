import { describe, expect, it } from 'vitest';
import { RANGE_PACK_REGISTRY } from '../registry.generated';
import { RANGE_PACK_LOADERS } from '../loaders.generated';
import anchorPack from '../packs/open-raising-utg-utgplus1-lj-bb-early-seats-baseline.generated';
import threeBetPack from '../packs/facing-a-3-bet-co-btn-baseline.generated';

const FORBIDDEN = /reglife|gto wizard|youtube|\bmc\b|c5a|c6a|https?:|\bct\b|pr[eé] flop|posi[cç]/i;
const COMBO = /^([2-9TJQKA][cdhs][2-9TJQKA][cdhs]|[2-9TJQKA]{2}[so]?)$/;

describe('CT range pack registry', () => {
  it('pins the imported preflop and postflop pack inventory', () => {
    expect(RANGE_PACK_REGISTRY).toHaveLength(94);
    expect(
      Object.fromEntries(
        ['preflop', 'flop', 'turn', 'river'].map((street) => [
          street,
          RANGE_PACK_REGISTRY.filter((pack) => pack.street === street).length,
        ]),
      ),
    ).toEqual({ preflop: 45, flop: 32, turn: 11, river: 6 });
    const totals = RANGE_PACK_REGISTRY.reduce(
      (acc, pack) => ({
        cells: acc.cells + pack.cellCount,
        buckets: acc.buckets + pack.bucketCount,
        combos: acc.combos + pack.comboCount,
        distinct: acc.distinct + pack.distinctComboCount,
      }),
      { cells: 0, buckets: 0, combos: 0, distinct: 0 },
    );
    expect(totals).toEqual({ cells: 765, buckets: 2148, combos: 523675, distinct: 371010 });
  });

  it('keeps every registry entry brand-neutral with content-hash provenance', () => {
    for (const pack of RANGE_PACK_REGISTRY) {
      expect(pack.slug).toMatch(/^[a-z0-9-]+$/);
      expect(`${pack.title} ${pack.description} ${pack.stageContext ?? ''}`).not.toMatch(FORBIDDEN);
      expect(pack.slug).not.toMatch(FORBIDDEN);
      expect(['gto_cev', 'mda_exploit']).toContain(pack.methodology);
      expect(['foundational', 'blind_battles', 'advanced']).toContain(pack.tier);
      expect(['preflop', 'flop', 'turn', 'river']).toContain(pack.street);
      expect(pack.source.kind).toBe('brand_neutralized_snapshot_config');
      expect(pack.source.capturedAt).toBe('2026-07-18');
      expect(pack.source.path).toBe('research/ct-trainer-2026-07-18/');
      expect(pack.source.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(pack.chunk).toBe(`./packs/${pack.slug}.generated`);
    }
  });

  it('labels the ICM/PKO variants with a tournament-stage context', () => {
    const staged = RANGE_PACK_REGISTRY.filter((pack) => pack.stageContext);
    expect(staged.length).toBeGreaterThanOrEqual(3);
    for (const pack of staged) expect(pack.stageContext).toMatch(/Tournament ICM context/);
  });

  it('exposes exactly one lazy loader per registry slug', () => {
    const loaderSlugs = Object.keys(RANGE_PACK_LOADERS).sort();
    const registrySlugs = RANGE_PACK_REGISTRY.map((pack) => pack.slug).sort();
    expect(loaderSlugs).toEqual(registrySlugs);
  });

  it('loads every pack chunk and matches the registry fidelity counts', async () => {
    for (const entry of RANGE_PACK_REGISTRY) {
      const module = await RANGE_PACK_LOADERS[entry.slug]!();
      const pack = module.default;
      expect(pack.slug).toBe(entry.slug);
      expect(pack.street).toBe(entry.street);
      expect(pack.source.sha256).toBe(entry.source.sha256);

      let bucketCount = 0;
      let comboCount = 0;
      const distinct = new Set<string>();
      for (const cell of pack.cells) {
        expect(cell.buckets.length).toBeGreaterThan(0);
        if (pack.street === 'preflop') {
          expect(cell.board).toBeUndefined();
        } else {
          expect(cell.board).toHaveLength(pack.street === 'flop' ? 3 : pack.street === 'turn' ? 4 : 5);
          expect(cell.dealCombos?.length).toBeGreaterThan(0);
        }
        bucketCount += cell.buckets.length;
        for (const bucket of cell.buckets) {
          expect(bucket.actions.length).toBeGreaterThan(0);
          expect(new Set(bucket.combos).size).toBe(bucket.combos.length);
          expect(bucket.combos.find((combo) => !COMBO.test(combo))).toBeUndefined();
          if (cell.board) {
            expect(
              bucket.combos.find((combo) => cell.board!.includes(combo.slice(0, 2)) || cell.board!.includes(combo.slice(2, 4))),
            ).toBeUndefined();
          }
          for (const combo of bucket.combos) {
            distinct.add(`${cell.position}|${cell.stackBb}|${(cell.board ?? []).join('-')}|${combo}`);
          }
          comboCount += bucket.combos.length;
        }
      }
      expect(pack.cells.length).toBe(entry.cellCount);
      expect(bucketCount).toBe(entry.bucketCount);
      expect(comboCount).toBe(entry.comboCount);
      expect(distinct.size).toBe(entry.distinctComboCount);
    }
  }, 120_000);
});

describe('CT range pack anchors (verbatim from snapshot)', () => {
  const utg100 = anchorPack.cells.find((cell) => cell.position === 'UTG' && cell.stackBb === 100)!;
  const foldBucket = utg100.buckets.find((bucket) => bucket.actions.join() === 'fold')!;
  const raiseBucket = utg100.buckets.find((bucket) => bucket.actions.join() === 'raise_2')!;

  it('preserves the exact UTG 100bb open range partition', () => {
    expect(anchorPack.cells).toHaveLength(12);
    expect(foldBucket.combos).toHaveLength(252);
    expect(raiseBucket.combos).toHaveLength(264);
    expect(foldBucket.combos).toContain('2d2c');
    expect(raiseBucket.combos).not.toContain('2d2c');
    expect(raiseBucket.combos).toContain('AhKh');
    expect(foldBucket.combos).not.toContain('AhKh');
  });

  it('carries the mixed-strategy combos in both buckets', () => {
    const mixed = foldBucket.combos.filter((combo) => raiseBucket.combos.includes(combo));
    expect(mixed).toHaveLength(58);
    expect(mixed).toContain('3d3c');
  });

  it('preserves the CO-vs-BTN 100bb facing-3-bet response buckets', () => {
    const cell = threeBetPack.cells.find((entry) => entry.stackBb === 100)!;
    const actionsFor = (combo: string) =>
      cell.buckets.filter((bucket) => bucket.combos.includes(combo)).flatMap((bucket) => bucket.actions).sort();
    const counts = Object.fromEntries(cell.buckets.map((bucket) => [bucket.actions.join('+'), bucket.combos.length]));
    expect(counts).toEqual({ all_in: 12, call: 216, fold: 300, raise_22: 170 });
    expect(actionsFor('KdKc')).toEqual(['raise_22']);
    expect(actionsFor('AhKh')).toEqual(['raise_22']);
    expect(actionsFor('QhJh')).toEqual(['call']);
  });
});
