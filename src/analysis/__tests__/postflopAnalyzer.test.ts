import { describe, it, expect } from 'vitest';
import {
  classifyBoardTexture,
  analyzePostflop,
  isGoodBarrelCard,
} from '../postflopAnalyzer';
import type { Action } from '../../types/hand';

describe('classifyBoardTexture', () => {
  it('classifies high-card dry board (A-7-2 rainbow)', () => {
    const result = classifyBoardTexture(['Ah', '7d', '2c']);
    expect(result.texture).toBe('high_dry');
    expect(result.isRainbow).toBe(true);
    expect(result.highCardCount).toBe(1);
  });

  it('classifies K-Q-x rainbow as high_dry', () => {
    const result = classifyBoardTexture(['Kh', 'Qd', '3c']);
    expect(result.texture).toBe('high_dry');
    expect(result.highCardCount).toBe(2);
  });

  it('classifies wet broadway (K-Q-9 two-tone)', () => {
    const result = classifyBoardTexture(['Kh', 'Qh', '9d']);
    expect(result.texture).toBe('wet_broadway');
    expect(result.isTwoTone).toBe(true);
  });

  it('classifies low connected board (7-6-5)', () => {
    const result = classifyBoardTexture(['7h', '6d', '5c']);
    expect(result.texture).toBe('low_connected');
    expect(result.connectedness).toBeGreaterThanOrEqual(1);
  });

  it('classifies 8-7-4 as low connected', () => {
    const result = classifyBoardTexture(['8h', '7d', '4c']);
    expect(result.texture).toBe('low_connected');
  });

  it('classifies paired low board (9-6-6)', () => {
    const result = classifyBoardTexture(['9h', '6d', '6c']);
    expect(result.texture).toBe('paired_low');
    expect(result.isPaired).toBe(true);
  });

  it('classifies monotone low board (8c-6c-3c)', () => {
    const result = classifyBoardTexture(['8c', '6c', '3c']);
    expect(result.texture).toBe('monotone_low');
    expect(result.isMonotone).toBe(true);
  });

  it('classifies monotone board with high cards', () => {
    const result = classifyBoardTexture(['Ac', 'Kc', '3c']);
    expect(result.texture).toBe('monotone_c');
    expect(result.isMonotone).toBe(true);
    expect(result.highCardCount).toBe(2);
  });

  it('classifies neutral board when no category fits', () => {
    // J-5-2 rainbow — high card (J) but some connectedness from J being near others?
    // Actually J=11, 5, 2: gaps are 6 and 3, so disconnected. But J is broadway.
    // This should be high_dry since it has a high card, is rainbow, no connectedness
    const result = classifyBoardTexture(['Jh', '5d', '2c']);
    expect(result.texture).toBe('high_dry');
  });

  it('handles empty/invalid flop', () => {
    const result = classifyBoardTexture([]);
    expect(result.texture).toBe('neutral');
  });

  it('returns correct rank information', () => {
    const result = classifyBoardTexture(['Ah', 'Kd', '2c']);
    expect(result.highestCard).toBe(14); // Ace
    expect(result.lowestCard).toBe(2);
  });
});

describe('analyzePostflop', () => {
  const makeAction = (overrides: Partial<Action>): Action => ({
    handId: '1',
    street: 'flop',
    playerName: 'hero',
    actionType: 'check',
    amount: null,
    isAllIn: false,
    sequence: 0,
    ...overrides,
  });

  it('detects missed c-bet in HU as PFR', () => {
    const actions = [
      makeAction({ playerName: 'villain', actionType: 'check', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'hero', actionType: 'check', street: 'flop', sequence: 2 }),
    ];
    const spots = analyzePostflop(actions, 'hero', true, ['Ah', '7d', '2c'], 2, 100);
    expect(spots).toHaveLength(1);
    expect(spots[0]!.spot).toBe('MISSED_CBET');
    expect(spots[0]!.isCorrect).toBe(false);
  });

  it('does not flag missed c-bet when PFR checks out of position', () => {
    const actions = [
      makeAction({ playerName: 'hero', actionType: 'check', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'villain', actionType: 'check', street: 'flop', sequence: 2 }),
    ];
    const spots = analyzePostflop(actions, 'hero', true, ['Ah', '7d', '2c'], 2, 100);
    expect(spots.some((s) => s.spot === 'MISSED_CBET')).toBe(false);
  });

  it('detects c-bet HU', () => {
    const actions = [
      makeAction({ playerName: 'hero', actionType: 'bet', amount: 33, street: 'flop', sequence: 1 }),
    ];
    const spots = analyzePostflop(actions, 'hero', true, ['Kh', 'Qd', '3c'], 2, 100);
    expect(spots.some((s) => s.spot === 'CBET_HU')).toBe(true);
  });

  it('detects c-bet multiway', () => {
    const actions = [
      makeAction({ playerName: 'hero', actionType: 'bet', amount: 50, street: 'flop', sequence: 1 }),
    ];
    const spots = analyzePostflop(actions, 'hero', true, ['Kh', 'Qd', '3c'], 3, 100);
    expect(spots.some((s) => s.spot === 'CBET_MULTIWAY')).toBe(true);
  });

  it('detects double barrel', () => {
    const actions = [
      makeAction({ playerName: 'hero', actionType: 'bet', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'villain', actionType: 'call', street: 'flop', sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'bet', street: 'turn', sequence: 3 }),
    ];
    const spots = analyzePostflop(actions, 'hero', true, ['Kh', 'Qd', '3c'], 2, 100);
    expect(spots.some((s) => s.spot === 'DOUBLE_BARREL')).toBe(true);
  });

  it('detects missed double barrel', () => {
    const actions = [
      makeAction({ playerName: 'hero', actionType: 'bet', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'villain', actionType: 'call', street: 'flop', sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'check', street: 'turn', sequence: 3 }),
    ];
    const spots = analyzePostflop(actions, 'hero', true, ['Kh', 'Qd', '3c'], 2, 100);
    expect(spots.some((s) => s.spot === 'MISSED_DOUBLE_BARREL')).toBe(true);
  });

  it('detects bet vs missed c-bet', () => {
    const actions = [
      makeAction({ playerName: 'villain', actionType: 'check', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'hero', actionType: 'bet', street: 'flop', sequence: 2 }),
    ];
    const spots = analyzePostflop(actions, 'hero', false, ['Kh', 'Qd', '3c'], 2, 100);
    const betSpot = spots.find((s) => s.spot === 'BET_VS_MISSED_CBET');
    expect(betSpot).toBeDefined();
    expect(betSpot!.isCorrect).toBe(true);
  });

  it('detects missed exploitative bet vs missed c-bet', () => {
    const actions = [
      makeAction({ playerName: 'villain', actionType: 'check', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'hero', actionType: 'check', street: 'flop', sequence: 2 }),
    ];
    const spots = analyzePostflop(actions, 'hero', false, ['Kh', 'Qd', '3c'], 2, 100);
    const betSpot = spots.find((s) => s.spot === 'BET_VS_MISSED_CBET');
    expect(betSpot).toBeDefined();
    expect(betSpot!.isCorrect).toBe(false);
  });

  it('does not flag bet-vs-missed-cbet when hero is out of position', () => {
    const actions = [
      makeAction({ playerName: 'hero', actionType: 'check', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'villain', actionType: 'check', street: 'flop', sequence: 2 }),
    ];
    const spots = analyzePostflop(actions, 'hero', false, ['Kh', 'Qd', '3c'], 2, 100);
    expect(spots.some((s) => s.spot === 'BET_VS_MISSED_CBET')).toBe(false);
  });

  it('detects probe turn after check-check on flop', () => {
    const actions = [
      makeAction({ playerName: 'villain', actionType: 'check', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'hero', actionType: 'check', street: 'flop', sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'bet', street: 'turn', sequence: 3 }),
    ];
    const spots = analyzePostflop(actions, 'hero', false, ['9h', '5d', '6c'], 2, 100);
    expect(spots.some((s) => s.spot === 'PROBE_TURN')).toBe(true);
  });

  it('returns empty for no flop', () => {
    const spots = analyzePostflop([], 'hero', true, null, 2, 100);
    expect(spots).toHaveLength(0);
  });

  it('returns empty if hero was all-in preflop', () => {
    const actions = [
      makeAction({ playerName: 'hero', actionType: 'raise', street: 'preflop', isAllIn: true, sequence: 1 }),
      makeAction({ playerName: 'hero', actionType: 'check', street: 'flop', sequence: 2 }),
    ];
    const spots = analyzePostflop(actions, 'hero', true, ['Ah', '7d', '2c'], 2, 100);
    expect(spots).toHaveLength(0);
  });

  it('detects donk bet on turn', () => {
    const actions = [
      makeAction({ playerName: 'villain', actionType: 'bet', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'hero', actionType: 'call', street: 'flop', sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'bet', street: 'turn', sequence: 3 }),
    ];
    const spots = analyzePostflop(actions, 'hero', false, ['Ah', '7d', '2c'], 2, 100);
    expect(spots.some((s) => s.spot === 'DONK_BET_TURN')).toBe(true);
  });

  it('detects check-raise on flop', () => {
    const actions = [
      makeAction({ playerName: 'hero', actionType: 'check', street: 'flop', sequence: 1 }),
      makeAction({ playerName: 'villain', actionType: 'bet', street: 'flop', sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'raise', street: 'flop', sequence: 3 }),
    ];
    const spots = analyzePostflop(actions, 'hero', false, ['Ah', '7d', '2c'], 2, 100);
    expect(spots.some((s) => s.spot === 'CHECK_RAISE_FLOP')).toBe(true);
  });

  it('detects facing a bet on flop', () => {
    const actions = [
      makeAction({ playerName: 'villain', actionType: 'bet', amount: 50, street: 'flop', sequence: 1 }),
    ];
    const spots = analyzePostflop(actions, 'hero', false, ['Ah', '7d', '2c'], 2, 100);
    expect(spots.some((s) => s.spot === 'NONE' && s.note.includes('Facing 50% pot bet'))).toBe(true);
  });

  it('emits English postflop notes without Portuguese fragments', () => {
    const spotSets = [
      analyzePostflop([
        makeAction({ playerName: 'hero', actionType: 'bet', amount: 33, street: 'flop', sequence: 1 }),
      ], 'hero', true, ['Kh', 'Qd', '3c'], 2, 100),
      analyzePostflop([
        makeAction({ playerName: 'hero', actionType: 'bet', street: 'flop', sequence: 1 }),
        makeAction({ playerName: 'villain', actionType: 'call', street: 'flop', sequence: 2 }),
        makeAction({ playerName: 'hero', actionType: 'bet', street: 'turn', sequence: 3 }),
      ], 'hero', true, ['Kh', 'Qd', '3c'], 2, 100),
      analyzePostflop([
        makeAction({ playerName: 'villain', actionType: 'check', street: 'flop', sequence: 1 }),
        makeAction({ playerName: 'hero', actionType: 'check', street: 'flop', sequence: 2 }),
      ], 'hero', true, ['Ah', '7d', '2c'], 2, 100),
      analyzePostflop([
        makeAction({ playerName: 'villain', actionType: 'check', street: 'flop', sequence: 1 }),
        makeAction({ playerName: 'hero', actionType: 'bet', street: 'flop', sequence: 2 }),
      ], 'hero', false, ['Kh', 'Qd', '3c'], 2, 100),
    ];
    const portugueseFragments = /\b(recomendado|como|correto)\b|\bem board\b|\bno turn\b/i;

    const notes = spotSets.flat().map((spot) => spot.note);
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note).not.toMatch(portugueseFragments);
    }
  });
});

describe('isGoodBarrelCard', () => {
  it('overcard to board is good barrel card', () => {
    expect(isGoodBarrelCard('Kh', ['9d', '5c', '2h'])).toBe(true);
    expect(isGoodBarrelCard('Ah', ['Jd', '5c', '2h'])).toBe(true);
  });

  it('undercard to board is not a good barrel card', () => {
    expect(isGoodBarrelCard('3h', ['Kd', 'Qc', '9h'])).toBe(false);
  });

  it('broadway on low board is good barrel card', () => {
    expect(isGoodBarrelCard('Qh', ['9d', '4c', '2h'])).toBe(true);
  });
});
