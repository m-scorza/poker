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

    it('extracts tournament name', () => {
      const [parsed] = parsePokerStarsFile(HAND_FULL_STREETS);
      expect(parsed!.tournament.name).toBe('$0.85+$0.15 USD Hold\'em No Limit');
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

    it('captures grand total when summary splits into main + side pots', () => {
      const sidePotHand = [
        "PokerStars Hand #999000001: Tournament #1234567, $1.40+$0.10 USD Hold'em No Limit - Level I (50/100) - 2026/02/16 15:05:00 UTC [2026/02/16 10:05:00 ET]",
        "Table '1234567 1' 3-max Seat #1 is the button",
        'Seat 1: hero (1000 in chips)',
        'Seat 2: villA (500 in chips)',
        'Seat 3: villB (300 in chips)',
        'hero: posts small blind 50',
        'villA: posts big blind 100',
        '*** HOLE CARDS ***',
        'Dealt to hero [Ac Kc]',
        'villB: raises 200 to 300 and is all-in',
        'hero: raises 700 to 1000 and is all-in',
        'villA: calls 400 and is all-in',
        '*** FLOP *** [2d 7s 9h]',
        '*** TURN *** [2d 7s 9h] [Jc]',
        '*** RIVER *** [2d 7s 9h Jc] [Qd]',
        '*** SHOW DOWN ***',
        'hero: shows [Ac Kc] (high card Ace)',
        'villA: shows [Th Td] (a pair of Tens)',
        'villB: shows [Qs Qc] (three of a kind, Queens)',
        'villB collected 900 from main pot',
        'villA collected 400 from side pot',
        '*** SUMMARY ***',
        'Total pot 1300 Main pot 900. Side pot 400. | Rake 0',
        'Board [2d 7s 9h Jc Qd]',
        'Seat 1: hero (button) (small blind) showed [Ac Kc] and lost',
        'Seat 2: villA (big blind) showed [Th Td] and lost',
        'Seat 3: villB showed [Qs Qc] and won (900)',
      ].join('\n');
      const [parsed] = parsePokerStarsFile(sidePotHand);
      expect(parsed!.hand.totalPot).toBe(1300);
    });

    it('captures grand total when summary has multiple side pots', () => {
      const multiSidePotLine = 'Total pot 49540 Main pot 28270. Side pot-1 9510. Side pot-2 11760. | Rake 0';
      const hand = [
        "PokerStars Hand #999000002: Tournament #1234567, $1.40+$0.10 USD Hold'em No Limit - Level I (50/100) - 2026/02/16 15:05:00 UTC [2026/02/16 10:05:00 ET]",
        "Table '1234567 1' 4-max Seat #1 is the button",
        'Seat 1: hero (1000 in chips)',
        'Seat 2: villA (500 in chips)',
        'Seat 3: villB (300 in chips)',
        'Seat 4: villC (200 in chips)',
        'hero: posts small blind 50',
        'villA: posts big blind 100',
        '*** HOLE CARDS ***',
        'Dealt to hero [Ac Kc]',
        'villB: raises 200 to 300 and is all-in',
        'villC: calls 200 and is all-in',
        'hero: raises 700 to 1000 and is all-in',
        'villA: calls 400 and is all-in',
        '*** FLOP *** [2d 7s 9h]',
        '*** TURN *** [2d 7s 9h] [Jc]',
        '*** RIVER *** [2d 7s 9h Jc] [Qd]',
        '*** SHOW DOWN ***',
        'hero: shows [Ac Kc] (high card Ace)',
        'villA: shows [Th Td] (a pair of Tens)',
        'villB: shows [Qs Qc] (three of a kind, Queens)',
        'villC: shows [3d 3s] (a pair of Threes)',
        'villB collected 28270 from main pot',
        'villA collected 9510 from side pot-1',
        'villA collected 11760 from side pot-2',
        '*** SUMMARY ***',
        multiSidePotLine,
        'Board [2d 7s 9h Jc Qd]',
        'Seat 1: hero (button) (small blind) showed [Ac Kc] and lost',
        'Seat 2: villA (big blind) showed [Th Td] and won',
        'Seat 3: villB showed [Qs Qc] and won (28270)',
        'Seat 4: villC showed [3d 3s] and lost',
      ].join('\n');
      const [parsed] = parsePokerStarsFile(hand);
      expect(parsed!.hand.totalPot).toBe(49540);
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

  describe('bounty tournaments and cents math', () => {
    it('extracts hand-level bounty and sets tournament category to Progressive KO', () => {
      const bountyHand = [
        "PokerStars Hand #260356649000: Tournament #3989541132, $10.00+$10.00+$2.00 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:00:00 ET",
        "Table '3989541132 1' 9-max Seat #1 is the button",
        "Seat 1: hero (1500 in chips)",
        "Seat 2: villA (1500 in chips)",
        "hero: posts small blind 10",
        "villA: posts big blind 20",
        "*** HOLE CARDS ***",
        "Dealt to hero [Ac Kc]",
        "hero: raises 40 to 60",
        "villA: calls 40",
        "*** FLOP *** [Ad Kd 2s]",
        "hero: bets 100",
        "villA: raises 100 to 200",
        "hero: raises 1240 to 1440 and is all-in",
        "villA: calls 1240 and is all-in",
        "*** TURN *** [Ad Kd 2s] [3h]",
        "*** RIVER *** [Ad Kd 2s 3h] [4c]",
        "hero wins the $10.00 bounty for eliminating villA",
        "*** SHOW DOWN ***",
        "hero: shows [Ac Kc] (two pair, Aces and Kings)",
        "villA: shows [Qh Qs] (a pair of Queens)",
        "hero collected 3000 from pot",
        "*** SUMMARY ***",
        "Total pot 3000 | Rake 0",
        "Board [Ad Kd 2s 3h 4c]",
        "Seat 1: hero (button) (small blind) showed [Ac Kc] and won (3000)",
        "Seat 2: villA (big blind) showed [Qh Qs] and lost"
      ].join('\n');

      const [parsed] = parsePokerStarsFile(bountyHand, 'hero');
      expect(parsed).toBeDefined();
      expect(parsed!.hand.bountyCollected).toBe(10);
      expect(parsed!.tournament.category).toBe('Progressive KO');
      expect((parsed!.tournament as any).bounty).toBeUndefined();
    });

    it('processes stack and voluntary actions using cents math without float drift', () => {
      const floatDriftHand = [
        "PokerStars Hand #260356649001: Tournament #3989541132, $1.50+$0.15 USD Hold'em No Limit - Level I (1/2) - 2026/04/05 18:00:00 ET",
        "Table '3989541132 1' 9-max Seat #1 is the button",
        "Seat 1: hero (1.50 in chips)",
        "Seat 2: villA (1.50 in chips)",
        "hero: posts small blind 0.10",
        "villA: posts big blind 0.20",
        "*** HOLE CARDS ***",
        "Dealt to hero [Ac Kc]",
        "hero: bets 0.30",
        "villA: calls 0.30",
        "*** FLOP *** [Ad Kd 2s]",
        "hero: bets 1.10 and is all-in",
        "villA: calls 1.10 and is all-in",
        "*** SHOW DOWN ***",
        "hero: shows [Ac Kc]",
        "villA: shows [Qh Qs]",
        "hero collected 3.00 from pot",
        "*** SUMMARY ***",
        "Total pot 3.00 | Rake 0",
        "Seat 1: hero (button) (small blind) showed [Ac Kc] and won (3.00)",
        "Seat 2: villA (big blind) showed [Qh Qs] and lost"
      ].join('\n');

      const [parsed] = parsePokerStarsFile(floatDriftHand, 'hero');
      expect(parsed).toBeDefined();
      expect(parsed!.hand.heroChipsAfter).toBe(3.00);
      expect(parsed!.players.find(p => p.isHero)!.chipsAfter).toBe(3.00);
    });
  });
});
