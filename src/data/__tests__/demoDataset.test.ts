import { beforeAll, describe, expect, it } from 'vitest';
import { buildDemoDataset, DEMO_MANIFEST } from '../demoDataset';
import { DEMO_VILLAINS } from '../demoVillains';
import {
  batchCheckCompliance,
  complianceExclusionReasonForDecision,
} from '../../analysis/rangeChecker';

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

  it('grades every decision with the engine, never with a hand-authored verdict', () => {
    const decisions = dataset.handsData.map((entry) => entry.heroDecision);
    const regraded = batchCheckCompliance(decisions);

    const drifted = decisions.filter((decision, index) => {
      const expected = regraded[index]!;
      return (
        decision.isCompliant !== expected.isCompliant ||
        decision.deviationType !== expected.deviationType
      );
    });

    expect(drifted).toHaveLength(0);

    // Re-grading is a no-op on refused spots, so the check above cannot see
    // drift there. Assert they carry the same seeded default an imported hand
    // gets (scenarioDetector.ts), rather than an invented "compliant".
    const refused = decisions.filter(
      (decision) => complianceExclusionReasonForDecision(decision) !== null,
    );
    expect(refused.length).toBeGreaterThan(0);
    for (const decision of refused) {
      expect(decision.isCompliant).toBe(false);
      expect(decision.deviationType).toBeNull();
    }
  });

  it('gives every facing-raise spot a real opener that acted before hero', () => {
    const preflopOrder = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

    for (const entry of dataset.handsData) {
      const { scenario, position, openerPosition } = entry.heroDecision;
      if (scenario !== 'FACING_RAISE' && scenario !== 'BB_VS_RAISE') continue;

      // Without an opener the engine refuses the spot and blames the parser —
      // for a hand the parser never touched.
      expect(openerPosition).toBeTruthy();
      expect(preflopOrder.indexOf(openerPosition!)).toBeLessThan(
        preflopOrder.indexOf(position),
      );
    }
  });

  it('surfaces deviations the engine finds, not only the ones the generator intended', () => {
    const deviationTypes = new Set(
      dataset.handsData
        .map((entry) => entry.heroDecision.deviationType)
        .filter((type): type is NonNullable<typeof type> => type !== null),
    );

    // These two are only reachable through the real range grids — a
    // hand-authored ladder cannot mint them.
    expect(deviationTypes.has('OPENED_OUT_OF_RANGE')).toBe(true);
    expect(deviationTypes.has('SB_OUT_OF_RANGE')).toBe(true);
    expect(deviationTypes.has('COLD_CALL')).toBe(true);
  });

  it('renders chip and stack values without floating-point artefacts', () => {
    for (const entry of dataset.handsData.slice(0, 500)) {
      expect(Number.isInteger(entry.hand.heroChipsBefore)).toBe(true);
      expect(Number.isInteger(entry.hand.heroChipsAfter)).toBe(true);
      // One decimal place of bb depth, so no 18.400000000000002 reaches the UI.
      expect(entry.heroDecision.stackBb).toBe(
        Number(entry.heroDecision.stackBb.toFixed(1)),
      );
    }
  });

  it('exposes a demo manifest matching the implementation', () => {
    expect(DEMO_MANIFEST.version).toBe('2.0.0');
    expect(DEMO_MANIFEST.villainCount).toBe(DEMO_VILLAINS.length);
    expect(DEMO_MANIFEST.intendedHeroLeaks).toContain('BB_OVERFOLD');
  });
});
