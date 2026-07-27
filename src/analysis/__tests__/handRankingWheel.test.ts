/**
 * Domain sanity — wheel (A-2-3-4-5) and steel-wheel hand ranking.
 *
 * Hand evaluation is delegated to `poker-odds-calculator` (used by
 * `HandReplay.tsx` for equity math), so the app never re-implements ranking.
 * The one place that delegation can silently go wrong is the wheel: the ace
 * must play LOW (making the five-high straight the weakest straight) while
 * still playing HIGH at the top of the deck. These assertions pin that
 * behaviour so a library swap or upgrade that regresses it fails loudly.
 *
 * Resolves AUDIT_NEW.md G1 (wheel / steel-wheel correctness fixture test).
 */
import { describe, it, expect } from 'vitest';
import { HandRank, CardGroup, FullDeckGame } from 'poker-odds-calculator';

const game = new FullDeckGame();

function evaluate(cards: string): HandRank {
  return HandRank.evaluate(game, CardGroup.fromString(cards));
}

describe('wheel straight (A-2-3-4-5)', () => {
  it('ranks a mixed-suit wheel as a straight, not a high-card ace', () => {
    const wheel = evaluate('Ah2d3c4s5h');
    expect(wheel.getRank()).toBe(game.STRAIGHT);
    expect(wheel.toString()).toBe('Five high straight');
  });

  it('plays the ace low: the wheel loses to a six-high straight', () => {
    const wheel = evaluate('Ah2d3c4s5h');
    const sixHigh = evaluate('2d3c4s5h6d');
    expect(sixHigh.getRank()).toBe(game.STRAIGHT);
    expect(wheel.compareTo(sixHigh)).toBeLessThan(0);
    expect(sixHigh.compareTo(wheel)).toBeGreaterThan(0);
  });

  it('is the weakest straight: the wheel loses to a broadway straight', () => {
    const wheel = evaluate('Ah2d3c4s5h');
    const broadway = evaluate('AhKdQcJsTh');
    expect(broadway.getRank()).toBe(game.STRAIGHT);
    expect(broadway.toString()).toBe('Ace high straight');
    expect(wheel.compareTo(broadway)).toBeLessThan(0);
  });

  it('still resolves to the wheel when picking the best five of seven cards', () => {
    const sevenCard = evaluate('Ah2d3c4s5hKdQc');
    expect(sevenCard.getRank()).toBe(game.STRAIGHT);
    expect(sevenCard.toString()).toBe('Five high straight');
  });
});

describe('steel wheel (A-2-3-4-5 suited)', () => {
  it('ranks a suited wheel as a straight flush', () => {
    const steelWheel = evaluate('As2s3s4s5s');
    expect(steelWheel.getRank()).toBe(game.STRAIGHT_FLUSH);
    expect(steelWheel.toString()).toBe('Five high straight flush');
  });

  it('plays the ace low: the steel wheel loses to a six-high straight flush', () => {
    const steelWheel = evaluate('As2s3s4s5s');
    const sixHighSF = evaluate('2s3s4s5s6s');
    expect(sixHighSF.getRank()).toBe(game.STRAIGHT_FLUSH);
    expect(steelWheel.compareTo(sixHighSF)).toBeLessThan(0);
  });

  it('is the weakest straight flush: it loses to a royal flush', () => {
    const steelWheel = evaluate('As2s3s4s5s');
    const royalFlush = evaluate('AsKsQsJsTs');
    expect(royalFlush.getRank()).toBe(game.STRAIGHT_FLUSH);
    expect(royalFlush.toString()).toBe('Royal flush');
    expect(steelWheel.compareTo(royalFlush)).toBeLessThan(0);
  });
});
