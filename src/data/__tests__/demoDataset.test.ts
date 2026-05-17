import { beforeAll, describe, expect, it } from 'vitest';
import { buildDemoDataset, DEMO_MANIFEST } from '../demoDataset';
import { DEMO_VILLAINS } from '../demoVillains';

type DemoDataset = ReturnType<typeof buildDemoDataset>;

const HERO = 'scorza23';

describe('buildDemoDataset V2', () => {
  let dataset: DemoDataset;

  beforeAll(() => {
    dataset = buildDemoDataset();
  });

  it('creates a demo-scale sample with at least 10,000 hands', () => {
    expect(dataset.summaries).toHaveLength(250);
    expect(dataset.handsData.length).toBeGreaterThanOrEqual(10_000);
    expect(new Set(dataset.handsData.map((entry) => entry.hand.id)).size).toBe(dataset.handsData.length);
  });

  it('includes multiple fictional villain archetypes from DEMO_VILLAINS', () => {
    const observedVillains = new Set<string>();
    dataset.handsData.forEach(entry => {
      entry.players.forEach(p => {
        if (!p.isHero) observedVillains.add(p.playerName);
      });
    });

    const demoVillainNames = DEMO_VILLAINS.map(v => v.name);
    const foundDemoVillains = [...observedVillains].filter(name => demoVillainNames.includes(name));

    // We expect a good variety of our named villains to appear
    expect(foundDemoVillains.length).toBeGreaterThanOrEqual(DEMO_VILLAINS.length * 0.8);
  });

  it('covers a broad range of scenarios (diversity audit)', () => {
    const scenarios = new Set(dataset.handsData.map(entry => entry.heroDecision.scenario));

    expect(scenarios.has('RFI')).toBe(true);
    expect(scenarios.has('FACING_RAISE')).toBe(true);
    expect(scenarios.has('BB_VS_RAISE')).toBe(true);
    expect(scenarios.size).toBeGreaterThanOrEqual(3);
  });

  it('contains intentional hero leaks for detection (leak audit)', () => {
    const deviations = dataset.handsData.filter(entry => entry.heroDecision.deviationType !== null);
    const deviationTypes = new Set(deviations.map(entry => entry.heroDecision.deviationType));

    expect(deviations.length).toBeGreaterThan(50);
    expect(deviationTypes.has('OVERFOLD') || deviationTypes.has('SB_OVERFOLD')).toBe(true);
    expect(deviationTypes.has('BB_FOLD_SUITED')).toBe(true);
    expect(deviationTypes.has('LIMPED') || deviationTypes.has('SB_LIMPED')).toBe(true);
  });

  it('maintains hand internal consistency for V2 logic', () => {
    for (const entry of dataset.handsData.slice(0, 100)) { // Sample check
      const hero = entry.players.find(p => p.isHero);
      expect(hero).toBeDefined();
      expect(hero?.playerName).toBe(HERO);

      const heroPreflop = entry.actions.find(
        a => a.street === 'preflop' && a.playerName === HERO && !a.actionType.startsWith('post_')
      );
      expect(heroPreflop?.actionType).toBe(entry.heroDecision.action);

      if (entry.heroDecision.scenario === 'BB_VS_RAISE') {
        expect(hero?.position).toBe('BB');
      }
    }
  });

  it('exposes a demo manifest matching the implementation', () => {
    expect(DEMO_MANIFEST.version).toBe('2.0.0');
    expect(DEMO_MANIFEST.villainCount).toBe(DEMO_VILLAINS.length);
    expect(DEMO_MANIFEST.intendedHeroLeaks).toContain('BB_OVERFOLD');
  });
});
