import { describe, expect, it } from 'vitest';
import { buildDemoDataset } from '../demoDataset';

const HERO = 'scorza23';

describe('buildDemoDataset', () => {
  it('creates a prospect-ready sample with enough tournaments and hands to unlock Career Coach', () => {
    const dataset = buildDemoDataset();

    expect(dataset.summaries).toHaveLength(40);
    expect(dataset.handsData).toHaveLength(120);
    expect(new Set(dataset.handsData.map((entry) => entry.hand.id)).size).toBe(120);
    expect(new Set(dataset.summaries.map((summary) => summary.tournamentId)).size).toBe(40);
    expect(dataset.handsData.every((entry) => entry.hand.id.startsWith('DEMO-H-'))).toBe(true);
    expect(dataset.handsData.every((entry) => entry.heroDecision.handId === entry.hand.id)).toBe(true);
  });

  it('includes profitable finishes, leaks, and starred review hands for a believable walkthrough', () => {
    const dataset = buildDemoDataset();

    const cashes = dataset.summaries.filter((summary) => (summary.prize ?? 0) + (summary.bounty ?? 0) > 0);
    const deviations = dataset.handsData.filter((entry) => entry.heroDecision.deviationType !== null);
    const starred = dataset.handsData.filter((entry) => entry.hand.isStarred);

    expect(cashes.length).toBeGreaterThan(5);
    expect(deviations.length).toBeGreaterThan(5);
    expect(starred.length).toBeGreaterThan(0);
  });

  it('keeps every demo hand internally consistent for hand replay trust', () => {
    const dataset = buildDemoDataset();

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
