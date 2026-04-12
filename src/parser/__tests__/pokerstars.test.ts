import { describe, it, expect } from 'vitest';
import { parsePokerStarsFile } from '../pokerstars';
import {
  HAND_FULL_STREETS,
  HAND_PREFLOP_ONLY,
  HAND_HEADS_UP,
  HAND_NON_CONTIGUOUS,
  HAND_WITH_BOM,
  MULTI_HAND_FILE,
  DUPLICATE_HAND,
  HAND_SHOWDOWN,
} from '../../test/fixtures/sample-hands';

describe('parsePokerStarsFile', () => {
  describe('header parsing', () => {
    it('extracts hand ID', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.id).toBe('260356646368');
    });

    it('extracts tournament ID', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.tournamentId).toBe('3989541132');
    });

    it('extracts buy-in and fee', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.tournament.buyIn).toBe(0.85);
      expect(parsed!.tournament.fee).toBe(0.15);
    });

    it('extracts blinds correctly', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.smallBlind).toBe(25);
      expect(parsed!.hand.bigBlind).toBe(50);
    });

    it('extracts level from roman numerals', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.level).toBe(3); // Level III
    });

    it('extracts date', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.date.getUTCFullYear()).toBe(2026);
      expect(parsed!.hand.date.getUTCMonth()).toBe(3); // April = 3
      expect(parsed!.hand.date.getUTCDate()).toBe(5);
    });

    it('extracts table format and button', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.maxSeats).toBe(9);
      expect(parsed!.hand.buttonSeat).toBe(1);
    });
  });

  describe('seat parsing', () => {
    it('parses all active seats', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.players).toHaveLength(9);
      expect(parsed!.hand.activePlayers).toBe(9);
    });

    it('correctly identifies hero', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const hero = parsed!.players.find((p) => p.isHero);
      expect(hero).toBeDefined();
      expect(hero!.playerName).toBe('scorza23');
      expect(hero!.seatNumber).toBe(4);
    });

    it('assigns correct chip counts', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const hero = parsed!.players.find((p) => p.isHero);
      expect(hero!.chipsBefore).toBe(1600);
    });
  });

  describe('position assignment', () => {
    it('assigns positions for 9-player table', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const hero = parsed!.players.find((p) => p.isHero);
      // BTN=1, SB=2, BB=3, UTG=4, ...
      expect(hero!.position).toBe('UTG');
    });

    it('assigns BTN/SB for heads-up (Bug #3)', () => {
      const [parsed] = parsePokerStarsFile(HAND_HEADS_UP);
      const hero = parsed!.players.find((p) => p.isHero);
      expect(hero!.position).toBe('BTN/SB');
    });

    it('handles non-contiguous seats (Bug #4)', () => {
      const [parsed] = parsePokerStarsFile(HAND_NON_CONTIGUOUS);
      // Seats 1, 3, 6, 8. BTN=6. Order: 6(BTN), 8(SB), 1(BB), 3(CO)
      const hero = parsed!.players.find((p) => p.isHero);
      expect(hero!.seatNumber).toBe(1);
      expect(hero!.position).toBe('BB');
    });
  });

  describe('hole cards', () => {
    it('parses hero hole cards', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const hero = parsed!.players.find((p) => p.isHero);
      expect(hero!.holeCards).toEqual(['Ah', 'Kh']);
    });

    it('parses shown cards from showdown', () => {
      const [parsed] = parsePokerStarsFile(HAND_SHOWDOWN);
      const villain = parsed!.players.find((p) => p.playerName === 'player3');
      expect(villain!.holeCards).toEqual(['7s', '7h']);
    });
  });

  describe('actions', () => {
    it('parses forced bets', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const antes = parsed!.actions.filter((a) => a.actionType === 'post_ante');
      expect(antes.length).toBe(9);
      expect(antes[0]!.amount).toBe(5);

      const sb = parsed!.actions.find((a) => a.actionType === 'post_sb');
      expect(sb!.amount).toBe(25);

      const bb = parsed!.actions.find((a) => a.actionType === 'post_bb');
      expect(bb!.amount).toBe(50);
    });

    it('parses raises with "to" amount', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const raise = parsed!.actions.find(
        (a) => a.playerName === 'scorza23' && a.actionType === 'raise',
      );
      expect(raise!.amount).toBe(100); // "raises 50 to 100"
    });

    it('parses calls', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const call = parsed!.actions.find(
        (a) => a.playerName === 'player3' && a.actionType === 'call' && a.street === 'preflop',
      );
      expect(call!.amount).toBe(50);
    });

    it('parses bets', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const bet = parsed!.actions.find(
        (a) => a.playerName === 'scorza23' && a.actionType === 'bet',
      );
      expect(bet!.amount).toBe(66);
      expect(bet!.street).toBe('flop');
    });

    it('detects all-in flag', () => {
      const [parsed] = parsePokerStarsFile(HAND_SHOWDOWN);
      const allIn = parsed!.actions.find((a) => a.isAllIn);
      expect(allIn).toBeDefined();
      expect(allIn!.playerName).toBe('player3');
      expect(allIn!.actionType).toBe('raise');
    });

    it('assigns correct streets', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const heroActions = parsed!.actions.filter(
        (a) => a.playerName === 'scorza23' && a.actionType !== 'post_ante',
      );
      expect(heroActions[0]!.street).toBe('preflop'); // raise
      expect(heroActions[1]!.street).toBe('flop'); // bet 66
      expect(heroActions[2]!.street).toBe('turn'); // bet 150
    });

    it('increments sequence numbers', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      const sequences = parsed!.actions.map((a) => a.sequence);
      // Check they're strictly increasing
      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBeGreaterThan(sequences[i - 1]!);
      }
    });
  });

  describe('board', () => {
    it('parses flop cards', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.boardFlop).toEqual(['Td', '7h', '2s']);
    });

    it('parses turn card', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.boardTurn).toBe('Ks');
    });

    it('has null board when hand ends preflop', () => {
      const [parsed] = parsePokerStarsFile(HAND_PREFLOP_ONLY);
      expect(parsed!.hand.boardFlop).toBeNull();
      expect(parsed!.hand.boardTurn).toBeNull();
      expect(parsed!.hand.boardRiver).toBeNull();
    });

    it('parses river card', () => {
      const [parsed] = parsePokerStarsFile(HAND_SHOWDOWN);
      expect(parsed!.hand.boardRiver).toBe('2d');
    });
  });

  describe('summary', () => {
    it('parses total pot', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.totalPot).toBe(477);
    });

    it('parses rake', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.hand.rake).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles BOM encoding (Bug #6)', () => {
      const results = parsePokerStarsFile(HAND_WITH_BOM);
      expect(results).toHaveLength(1);
      expect(results[0]!.hand.id).toBe('260356647200');
    });

    it('parses multi-hand file', () => {
      const results = parsePokerStarsFile(MULTI_HAND_FILE);
      expect(results).toHaveLength(2);
      expect(results[0]!.hand.id).toBe('111111111111');
      expect(results[1]!.hand.id).toBe('222222222222');
    });

    it('deduplicates by hand ID (Bug #5)', () => {
      const combined = MULTI_HAND_FILE + '\n\n\n' + DUPLICATE_HAND;
      const results = parsePokerStarsFile(combined);
      expect(results).toHaveLength(2); // Not 3
    });

    it('returns empty array for empty input', () => {
      expect(parsePokerStarsFile('')).toEqual([]);
      expect(parsePokerStarsFile('   \n\n  ')).toEqual([]);
    });

    it('returns empty array for invalid input', () => {
      expect(parsePokerStarsFile('not a hand history')).toEqual([]);
    });
  });
});
