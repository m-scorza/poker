/**
 * Property-based parser invariants over generated hand histories.
 *
 * The generator's betting engine does exact chip accounting, so each hand
 * carries its ground truth. For every seed we assert the parser reproduces
 * it: exact final stacks, exact pot, the full action list, chip conservation,
 * valid unique positions, and board consistency. A failure names the seed —
 * `generateHand(<seed>).text` reproduces the input byte-for-byte.
 */

import { describe, expect, it } from 'vitest';
import { parsePokerStarsFileWithDiagnostics } from '../pokerstars';
import { FUZZ_HERO, generateFile, generateHand } from '../../test/fuzz/handHistoryGenerator';
import type { Position } from '../../types/hand';

const SEED_COUNT = 250;

const VALID_POSITIONS = new Set<Position>([
  'UTG', 'UTG+1', 'MP1', 'MP', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB', 'BTN/SB',
]);

describe('parser fuzz invariants', () => {
  it(`holds every invariant across ${SEED_COUNT} generated hands`, () => {
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const { text, expected } = generateHand(seed);
      const label = `seed ${seed}`;

      const { hands, skippedBlocks } = parsePokerStarsFileWithDiagnostics(text, FUZZ_HERO);
      expect(skippedBlocks, `${label}: skipped blocks`).toBe(0);
      expect(hands, `${label}: parsed hand count`).toHaveLength(1);
      const parsed = hands[0]!;

      expect(parsed.hand.id, label).toBe(expected.handId);
      expect(parsed.hand.smallBlind, label).toBe(expected.smallBlind);
      expect(parsed.hand.bigBlind, label).toBe(expected.bigBlind);
      expect(parsed.hand.ante, label).toBe(expected.ante);
      expect(parsed.hand.totalPot, label).toBe(expected.pot);
      expect(parsed.hand.rake, label).toBe(0);
      expect(parsed.hand.activePlayers, label).toBe(expected.activePlayers);
      expect(parsed.hand.hasShowdown, label).toBe(expected.hasShowdown);

      // Board consistency.
      expect(parsed.hand.boardFlop, label).toEqual(expected.boardFlop);
      expect(parsed.hand.boardTurn, label).toBe(expected.boardTurn);
      expect(parsed.hand.boardRiver, label).toBe(expected.boardRiver);

      // Exact stack reproduction — the strongest accounting invariant.
      expect(parsed.players, label).toHaveLength(expected.seats.length);
      for (const seat of expected.seats) {
        const player = parsed.players.find((p) => p.playerName === seat.playerName)!;
        expect(player, `${label}: player ${seat.playerName} missing`).toBeDefined();
        expect(player.seatNumber, `${label}: ${seat.playerName} seat`).toBe(seat.seatNumber);
        expect(player.chipsBefore, `${label}: ${seat.playerName} chipsBefore`).toBe(seat.chipsBefore);
        expect(player.chipsAfter, `${label}: ${seat.playerName} chipsAfter`).toBe(seat.chipsAfter);
      }
      const heroSeat = expected.seats.find((s) => s.playerName === FUZZ_HERO)!;
      expect(parsed.hand.heroChipsBefore, label).toBe(heroSeat.chipsBefore);
      expect(parsed.hand.heroChipsAfter, label).toBe(heroSeat.chipsAfter);

      // Chip conservation: hero net + villain nets == −rake (rake 0 here).
      const heroNet = parsed.hand.heroChipsAfter - parsed.hand.heroChipsBefore;
      const villainNet = parsed.hand.villainDeltas.reduce((sum, v) => sum + v.net, 0);
      expect(heroNet + villainNet, `${label}: chip conservation`).toBeCloseTo(0, 6);

      // Positions: one per player, all valid, unique, and the blinds exist.
      const positions = parsed.players.map((p) => p.position);
      expect(new Set(positions).size, `${label}: duplicate positions`).toBe(positions.length);
      for (const position of positions) {
        expect(VALID_POSITIONS.has(position), `${label}: position ${position}`).toBe(true);
      }
      if (expected.activePlayers === 2) {
        expect(positions.sort(), label).toEqual(['BB', 'BTN/SB']);
      } else {
        expect(positions, label).toContain('BTN');
        expect(positions, label).toContain('SB');
        expect(positions, label).toContain('BB');
      }

      // Hero hole cards present and rank-normalized.
      const heroPlayer = parsed.players.find((p) => p.isHero)!;
      expect(heroPlayer, `${label}: hero player`).toBeDefined();
      expect(heroPlayer.holeCards, `${label}: hero cards`).not.toBeNull();

      // Full action-list reproduction: names, types, streets, amounts, all-ins.
      expect(
        parsed.actions.map((a) => ({
          playerName: a.playerName,
          actionType: a.actionType,
          street: a.street,
          amount: a.amount,
          isAllIn: a.isAllIn,
        })),
        `${label}: action list`,
      ).toEqual(expected.actions);
    }
  });

  it('parses multi-hand files with jittered separators and optional BOM', () => {
    const { text, hands } = generateFile(42, 25);
    const result = parsePokerStarsFileWithDiagnostics(text, FUZZ_HERO);
    expect(result.skippedBlocks).toBe(0);
    expect(result.hands).toHaveLength(25);
    expect(result.hands.map((h) => h.hand.id)).toEqual(hands.map((h) => h.expected.handId));
  });

  it('deduplicates a file concatenated with itself', () => {
    const { text } = generateFile(7, 10);
    const doubled = `${text}\n\n\n${text.replace(/^\uFEFF/, '')}`;
    const result = parsePokerStarsFileWithDiagnostics(doubled, FUZZ_HERO);
    expect(result.hands).toHaveLength(10);
  });

  it('is deterministic: same seed, same bytes', () => {
    expect(generateHand(123).text).toBe(generateHand(123).text);
    expect(generateFile(9, 5).text).toBe(generateFile(9, 5).text);
  });
});
