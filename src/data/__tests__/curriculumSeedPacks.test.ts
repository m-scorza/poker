import { describe, expect, it } from 'vitest';
import { CURRICULUM_SEED_PACKS } from '../curriculumSeedPacks.generated';

const FORBIDDEN_COPY = /reglife|gto wizard|youtube|video|aula|enfrentando|jogando|posição|pré flop/i;

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
});
