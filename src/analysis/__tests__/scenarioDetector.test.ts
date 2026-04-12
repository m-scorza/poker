import { describe, it, expect } from 'vitest';
import { detectScenario, buildHeroDecision } from '../scenarioDetector';
import { parsePokerStarsFile } from '../../parser/pokerstars';
import {
  HAND_FULL_STREETS,
  HAND_PREFLOP_ONLY,
  HAND_HEADS_UP,
  HAND_BB_VS_RAISE,
  HAND_BB_VS_ALLIN,
  HAND_BLIND_WAR,
  HAND_WALK,
  HAND_NON_CONTIGUOUS,
  HAND_FACING_LIMP,
} from '../../test/fixtures/sample-hands';

function parseFirst(text: string) {
  const results = parsePokerStarsFile(text);
  return results[0]!;
}

describe('detectScenario', () => {
  it('detects RFI — folded to hero at UTG', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const hero = parsed.players.find((p) => p.isHero)!;
    const scenario = detectScenario(
      parsed.actions,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('RFI');
  });

  it('detects RFI — folded to hero at UTG (preflop only)', () => {
    const parsed = parseFirst(HAND_PREFLOP_ONLY);
    const hero = parsed.players.find((p) => p.isHero)!;
    const scenario = detectScenario(
      parsed.actions,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('RFI');
  });

  it('detects HU_BTN — heads-up, hero is BTN/SB', () => {
    const parsed = parseFirst(HAND_HEADS_UP);
    const hero = parsed.players.find((p) => p.isHero)!;
    const scenario = detectScenario(
      parsed.actions,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('HU_BTN');
  });

  it('detects BB_VS_RAISE — hero in BB facing normal 2x open', () => {
    const parsed = parseFirst(HAND_BB_VS_RAISE);
    const hero = parsed.players.find((p) => p.isHero)!;
    const scenario = detectScenario(
      parsed.actions,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('BB_VS_RAISE');
  });

  it('detects BLIND_WAR — folded to SB', () => {
    const parsed = parseFirst(HAND_BLIND_WAR);
    const hero = parsed.players.find((p) => p.isHero)!;
    const scenario = detectScenario(
      parsed.actions,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('BLIND_WAR');
  });

  it('detects WALK — everyone folds to BB', () => {
    const parsed = parseFirst(HAND_WALK);
    const hero = parsed.players.find((p) => p.isHero)!;
    const scenario = detectScenario(
      parsed.actions,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('WALK');
  });

  it('detects FACING_LIMP — someone limped before hero', () => {
    const parsed = parseFirst(HAND_FACING_LIMP);
    const hero = parsed.players.find((p) => p.isHero)!;
    const scenario = detectScenario(
      parsed.actions,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('FACING_LIMP');
  });

  it('detects BB_VS_RAISE for non-contiguous seats', () => {
    // Hero is BB (seat 1), player3 (CO) raises
    const parsed = parseFirst(HAND_NON_CONTIGUOUS);
    const hero = parsed.players.find((p) => p.isHero)!;
    const scenario = detectScenario(
      parsed.actions,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('BB_VS_RAISE');
  });

  describe('Bug prevention', () => {
    it('Bug #1: NEVER classifies fold facing a raise as RFI', () => {
      // Hero (seat 3, CO) faces an all-in from UTG (seat 1).
      // BTN=4, 6-max: UTG(1) shoves, HJ(2) folds, CO(3=hero) folds.
      // Hero should see FACING_ALL_IN, NOT RFI.
      const parsed = parseFirst(HAND_BB_VS_ALLIN);
      const hero = parsed.players.find((p) => p.isHero)!;
      expect(hero.position).toBe('CO');
      const scenario = detectScenario(
        parsed.actions,
        'scorza23',
        hero.position,
        parsed.hand.bigBlind,
        parsed.hand.activePlayers,
      );
      expect(scenario).toBe('FACING_ALL_IN');
    });

    it('Bug #2: BB facing all-in is BB_VS_LARGE_RAISE, not BB_VS_RAISE', () => {
      // Create a scenario where BB faces an all-in
      const parsed = parseFirst(HAND_BB_VS_ALLIN);
      // player6 is BB (seat 6, BTN=4: BTN(4), SB(5), BB(6))
      const scenario = detectScenario(
        parsed.actions,
        'player6',
        'BB',
        parsed.hand.bigBlind,
        parsed.hand.activePlayers,
      );
      expect(scenario).toBe('BB_VS_LARGE_RAISE');
    });
  });
});

describe('buildHeroDecision', () => {
  it('builds a decision for a standard RFI hand', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const decision = buildHeroDecision(parsed);
    expect(decision).not.toBeNull();
    expect(decision!.handId).toBe('260356646368');
    expect(decision!.position).toBe('UTG');
    expect(decision!.handKey).toBe('AKs');
    expect(decision!.scenario).toBe('RFI');
    expect(decision!.action).toBe('raise');
    expect(decision!.sawFlop).toBe(true);
    expect(decision!.wasPreFlopRaiser).toBe(true);
  });

  it('computes stackBb correctly', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const decision = buildHeroDecision(parsed);
    expect(decision!.stackBb).toBe(1600 / 50); // 32bb
  });

  it('detects c-bet opportunity and execution', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const decision = buildHeroDecision(parsed);
    expect(decision!.cbetOpportunity).toBe(true);
    expect(decision!.cbetMade).toBe(true);
  });

  it('handles preflop-only hand (no flop)', () => {
    const parsed = parseFirst(HAND_PREFLOP_ONLY);
    const decision = buildHeroDecision(parsed);
    expect(decision!.sawFlop).toBe(false);
    expect(decision!.cbetOpportunity).toBe(false);
  });

  it('detects hero fold action', () => {
    const parsed = parseFirst(HAND_BB_VS_ALLIN);
    const decision = buildHeroDecision(parsed);
    expect(decision!.action).toBe('fold');
  });

  it('handles heads-up canonical key', () => {
    const parsed = parseFirst(HAND_HEADS_UP);
    const decision = buildHeroDecision(parsed);
    expect(decision!.handKey).toBe('98s'); // 9c 8c -> 98s
    expect(decision!.position).toBe('BTN/SB');
  });

  it('returns null if hero has no hole cards', () => {
    const parsed = parseFirst(HAND_BB_VS_ALLIN);
    // player2 folds and never shows cards — no hole cards available
    const decision = buildHeroDecision(parsed, 'player2');
    expect(decision).toBeNull();
  });

  it('handles walk (BB with no action needed)', () => {
    const parsed = parseFirst(HAND_WALK);
    const decision = buildHeroDecision(parsed);
    expect(decision).not.toBeNull();
    expect(decision!.scenario).toBe('WALK');
  });

  it('stubs compliance fields', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const decision = buildHeroDecision(parsed);
    expect(decision!.isCompliant).toBe(false);
    expect(decision!.deviationType).toBeNull();
  });
});
