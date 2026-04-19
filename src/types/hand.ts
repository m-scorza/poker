import type { Position } from './analysis';

/** A single parsed PokerStars hand. */
export interface Hand {
  id: string;
  tournamentId: string;
  date: Date;
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  maxSeats: number;
  activePlayers: number;
  buttonSeat: number;
  boardFlop: string[] | null;
  boardTurn: string | null;
  boardRiver: string | null;
  totalPot: number;
  rake: number;
  /** True if the hand reached an actual showdown (*** SHOW DOWN *** section present). */
  hasShowdown: boolean;
  /** True if the user starred this hand for later review. */
  isStarred?: boolean;
  heroChipsBefore: number;
  heroChipsAfter: number;
  villainDeltas: { name: string; net: number }[];
}

/** One player's data within a single hand. */
export interface PlayerInHand {
  handId: string;
  seatNumber: number;
  playerName: string;
  chipsBefore: number;
  chipsAfter?: number;
  position: Position;
  isHero: boolean;
  holeCards: [string, string] | null;
}

/** A single action taken by a player on a given street. */
export interface Action {
  handId: string;
  street: 'preflop' | 'flop' | 'turn' | 'river';
  playerName: string;
  actionType:
    | 'fold'
    | 'check'
    | 'call'
    | 'raise'
    | 'bet'
    | 'post_sb'
    | 'post_bb'
    | 'post_ante';
  amount: number | null;
  isAllIn: boolean;
  sequence: number;
}

/** Aggregated tournament metadata. */
export interface Tournament {
  id: string;
  name?: string;
  category?: string; // e.g., 'Mystery Battle Royale', 'The Big', 'Bounty Builder'
  startDate?: Date;
  buyIn: number;
  fee: number;
  format: string;
  finishPosition: number | null;
  prize: number | null;
  bounty: number | null;
  handsPlayed: number;
}
