import { beforeAll, describe, expect, it } from 'vitest';
import { buildDemoDataset } from '../demoDataset';

type DemoDataset = ReturnType<typeof buildDemoDataset>;

const HERO = 'scorza23';

describe('buildDemoDataset', () => {
  let dataset: DemoDataset;

  beforeAll(() => {
    dataset = buildDemoDataset();
  });

  it('creates a demo-scale sample with at least 10,000 hands for realistic database walkthroughs', () => {
    expect(dataset.summaries).toHaveLength(250);
    expect(dataset.handsData.length).toBeGreaterThanOrEqual(10_000);
    expect(new Set(dataset.handsData.map((entry) => entry.hand.id)).size).toBe(dataset.handsData.length);
    expect(new Set(dataset.summaries.map((summary) => summary.tournamentId)).size).toBe(250);
    expect(dataset.handsData.every((entry) => entry.hand.id.startsWith('DEMO-H-'))).toBe(true);
    expect(dataset.handsData.every((entry) => entry.heroDecision.handId === entry.hand.id)).toBe(true);
  });

  it('varies tournament depth with early bustouts and deep runs instead of flat hand counts', () => {
    const countsByTournament = new Map<string, number>();

    for (const entry of dataset.handsData) {
      countsByTournament.set(entry.hand.tournamentId, (countsByTournament.get(entry.hand.tournamentId) ?? 0) + 1);
    }

    const handCounts = [...countsByTournament.values()];
    expect(new Set(handCounts).size).toBeGreaterThan(10);
    expect(Math.min(...handCounts)).toBeLessThanOrEqual(12);
    expect(Math.max(...handCounts)).toBeGreaterThanOrEqual(95);
    expect(handCounts.filter((count) => count <= 15).length).toBeGreaterThanOrEqual(10);
    expect(handCounts.filter((count) => count >= 80).length).toBeGreaterThanOrEqual(10);
  });

  it('marks early-bustout finales as lost all-ins for realistic short tournament exits', () => {
    const entriesByTournament = new Map<string, typeof dataset.handsData>();

    for (const entry of dataset.handsData) {
      const entries = entriesByTournament.get(entry.hand.tournamentId) ?? [];
      entries.push(entry);
      entriesByTournament.set(entry.hand.tournamentId, entries);
    }

    const earlyBustFinales = [...entriesByTournament.values()]
      .filter((entries) => entries.length <= 12)
      .map((entries) => entries[entries.length - 1]!);

    expect(earlyBustFinales.length).toBeGreaterThanOrEqual(10);
    for (const entry of earlyBustFinales) {
      const heroPreflop = entry.actions.find(
        (action) => action.street === 'preflop' && action.playerName === HERO && !action.actionType.startsWith('post_'),
      );

      expect(heroPreflop?.isAllIn, entry.hand.id).toBe(true);
      expect(entry.hand.heroChipsAfter, entry.hand.id).toBeLessThan(entry.hand.heroChipsBefore ?? 0);
      expect(entry.heroDecision.netProfit, entry.hand.id).toBeLessThan(0);
    }
  });

  it('includes profitable finishes, leaks, and starred review hands for a believable walkthrough', () => {
    const cashes = dataset.summaries.filter((summary) => (summary.prize ?? 0) + (summary.bounty ?? 0) > 0);
    const deviations = dataset.handsData.filter((entry) => entry.heroDecision.deviationType !== null);
    const starred = dataset.handsData.filter((entry) => entry.hand.isStarred);

    expect(cashes.length).toBeGreaterThan(5);
    expect(deviations.length).toBeGreaterThan(5);
    expect(starred.length).toBeGreaterThan(0);
  });

  it('keeps every demo hand internally consistent for hand replay trust', () => {
    for (const entry of dataset.handsData) {
      const hero = entry.players.find((player) => player.isHero);
      const button = entry.players.find((player) => player.seatNumber === entry.hand.buttonSeat);
      const heroPreflop = entry.actions.find(
        (action) => action.street === 'preflop' && action.playerName === HERO && !action.actionType.startsWith('post_'),
      );
      const heroFlop = entry.actions.find((action) => action.street === 'flop' && action.playerName === HERO);
      const visibleCards = [
        ...(hero?.holeCards ?? []),
        ...(entry.hand.boardFlop ?? []),
        ...(entry.hand.boardTurn ? [entry.hand.boardTurn] : []),
        ...(entry.hand.boardRiver ? [entry.hand.boardRiver] : []),
      ];

      expect(hero, entry.hand.id).toBeDefined();
      expect(hero?.position, entry.hand.id).toBe(entry.heroDecision.position);
      expect(button?.position, entry.hand.id).toBe('BTN');
      expect(entry.players, entry.hand.id).toHaveLength(entry.hand.activePlayers);
      expect(new Set(visibleCards).size, entry.hand.id).toBe(visibleCards.length);
      expect(heroPreflop?.actionType, entry.hand.id).toBe(entry.heroDecision.action);
      expect(Boolean(entry.hand.boardFlop), entry.hand.id).toBe(entry.heroDecision.sawFlop);
      expect(Boolean(heroFlop && ['bet', 'raise'].includes(heroFlop.actionType)), entry.hand.id).toBe(entry.heroDecision.cbetMade);
    }
  });
});
