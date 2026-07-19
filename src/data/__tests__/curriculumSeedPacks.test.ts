import { describe, expect, it } from 'vitest';
import { CURRICULUM_SEED_PACKS, type CurriculumSpotSeed } from '../curriculumSeedPacks.generated';

const FORBIDDEN_COPY = /reglife|gto wizard|youtube|video|aula|enfrentando|jogando|posição|pré flop/i;

const POSTFLOP_SLUGS = new Set([
  'in-position-cbet-vs-bb',
  'in-position-postflop',
  'in-position-turn-river-barrels-vs-bb',
  'out-of-position-cbet',
  'versus-bb-cbet',
]);

describe('curriculum seed packs', () => {
  it('exports brand-neutral local drill packs with source provenance', () => {
    expect(CURRICULUM_SEED_PACKS.length).toBeGreaterThanOrEqual(11);

    const vsThreeBet = CURRICULUM_SEED_PACKS.find((pack) => pack.slug === 'facing-3bet-frontier');
    expect(vsThreeBet?.title).toBe('Facing 3-bet frontier');
    expect(vsThreeBet?.source.kind).toBe('brand_neutralized_quiz_config');
    expect(vsThreeBet?.spots.length).toBeGreaterThanOrEqual(10);

    for (const pack of CURRICULUM_SEED_PACKS) {
      expect(`${pack.title} ${pack.description}`).not.toMatch(FORBIDDEN_COPY);
      expect(pack.source.path).toBe('../poker-knowledge/quiz_configs.json');
      expect(pack.spots.length).toBeGreaterThan(0);
      for (const spot of pack.spots) {
        expect(spot.combo).toMatch(/^[2-9TJQKA]{2}[so]?$/);
        expect(spot.position).toMatch(/^(UTG|LJ|HJ|CO|BTN|SB|BB)$/);
        expect(spot.stackBb).toBeGreaterThan(0);
        expect(spot.acceptedActions.length).toBeGreaterThan(0);
        expect(spot.sourceGroupIndex).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('attaches board context to postflop spots and leaves preflop spots unenriched', () => {
    const postflopConfigs = new Set<number>();

    for (const pack of CURRICULUM_SEED_PACKS) {
      const isPostflop = POSTFLOP_SLUGS.has(pack.slug);
      if (isPostflop) pack.source.sourceConfigIndexes.forEach((index) => postflopConfigs.add(index));

      const spots: readonly CurriculumSpotSeed[] = pack.spots;
      for (const spot of spots) {
        if (isPostflop) {
          expect(spot.board).toBeDefined();
          expect(spot.board!.length).toBeGreaterThanOrEqual(3);
          for (const card of spot.board!) expect(card).toMatch(/^[2-9TJQKA][cdhs]$/);
          expect(spot.villainPosition).toBeTruthy();
        } else {
          expect(spot.board).toBeUndefined();
          expect(spot.villainPosition).toBeUndefined();
          expect(spot.heroStackSize).toBeUndefined();
          expect(spot.villainStackSize).toBeUndefined();
          expect(spot.actionLine).toBeUndefined();
        }
      }
    }

    expect([...postflopConfigs].sort((a, b) => a - b)).toEqual([1, 2, 9, 13, 14, 15]);
  });

  it('summarizes action history into an English action line only on boarded spots', () => {
    const allSpots: readonly CurriculumSpotSeed[] = CURRICULUM_SEED_PACKS.flatMap((pack): readonly CurriculumSpotSeed[] => pack.spots);
    const spotsWithLine = allSpots.filter((spot) => spot.actionLine);

    expect(spotsWithLine.length).toBeGreaterThan(0);
    expect(spotsWithLine.every((spot) => spot.board)).toBe(true);
    expect(spotsWithLine.some((spot) => spot.actionLine!.startsWith('preflop:'))).toBe(true);
    for (const spot of spotsWithLine) expect(spot.actionLine!).not.toMatch(/PRÉ-FLOP|Raise|Cbet/);
  });
});
