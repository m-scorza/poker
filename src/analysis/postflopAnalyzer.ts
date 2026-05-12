/**
 * Postflop analysis engine.
 *
 * - Board texture classification (for Advanced profile c-bet decisions)
 * - Missed c-bet detection
 * - Probe turn / donk bet detection
 * - Bet vs missed c-bet detection
 *
 * Source: CLAUDE.md "Postflop Analysis", docs/strategy/04-postflop-strategy.md
 */

import type { Action } from '../types/hand';
import type { BoardTexture } from '../data/strategyProfiles';
import { getRecommendedCbetSizing, calculateMDF, calculatePotOdds } from './math';

// --- Card helpers ---

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

function cardRank(card: string): number {
  return RANK_VALUES[card[0]!] ?? 0;
}

function cardSuit(card: string): string {
  return card[1] ?? '';
}

function isHighCard(card: string): boolean {
  return cardRank(card) >= 10; // T, J, Q, K, A
}

function isBroadway(card: string): boolean {
  return cardRank(card) >= 10;
}

// --- Board Texture Classification ---

export interface BoardAnalysis {
  texture: BoardTexture;
  isMonotone: boolean;
  isTwoTone: boolean;
  isRainbow: boolean;
  isPaired: boolean;
  highCardCount: number;
  connectedness: number; // 0 = disconnected, 1+ = connected
  highestCard: number;
  lowestCard: number;
}

/**
 * Classify flop texture for c-bet decision making.
 *
 * Categories from CLAUDE.md:
 * - high_dry: A-7-2, K-Q-x rainbow → c-bet 100% at 25-33%
 * - wet_broadway: K-Q-9 with flush draw → c-bet 100% at 50-75%
 * - low_connected: 7-6-5, 8-7-4 → check back frequently
 * - paired_low: 9-6-6 → check or bet 25%
 * - monotone_low: 8c-6c-3c → check frequently
 * - neutral: everything else
 */
export function classifyBoardTexture(flopCards: string[]): BoardAnalysis {
  if (flopCards.length !== 3) {
    return {
      texture: 'neutral',
      isMonotone: false,
      isTwoTone: false,
      isRainbow: true,
      isPaired: false,
      highCardCount: 0,
      connectedness: 0,
      highestCard: 0,
      lowestCard: 0,
    };
  }

  const ranks = flopCards.map(cardRank).sort((a, b) => b - a);
  const suits = flopCards.map(cardSuit);

  const uniqueSuits = new Set(suits).size;
  const isMonotone = uniqueSuits === 1;
  const isTwoTone = uniqueSuits === 2;
  const isRainbow = uniqueSuits === 3;

  const rankCounts = new Map<number, number>();
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1);
  }
  const isPaired = Array.from(rankCounts.values()).some((c) => c >= 2);

  const highCardCount = flopCards.filter(isHighCard).length;
  const highestCard = ranks[0]!;
  const lowestCard = ranks[ranks.length - 1]!;

  // Connectedness: how close are the cards?
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let connectedness = 0;
  if (uniqueRanks.length >= 2) {
    const gaps = [];
    for (let i = 0; i < uniqueRanks.length - 1; i++) {
      gaps.push(uniqueRanks[i]! - uniqueRanks[i + 1]!);
    }
    // Connected = gaps of 1 or 2
    connectedness = gaps.filter((g) => g <= 2).length;
  }

  // Classification logic
  let texture: BoardTexture = 'neutral';

  // Paired low: any paired board with low cards (< T)
  if (isPaired && highestCard < 10) {
    texture = 'paired_low';
  }
  // Monotone: all same suit
  else if (isMonotone) {
    if (highCardCount === 0) {
      texture = 'monotone_low';
    } else {
      texture = ('monotone_' + suits[0]) as BoardTexture;
    }
  }
  // Low connected: all cards below T, and connected (gaps ≤ 2)
  else if (highCardCount === 0 && connectedness >= 1) {
    texture = 'low_connected';
  }
  // Wet broadway: 2+ broadways with flush draw (two-tone or monotone)
  else if (highCardCount >= 2 && !isRainbow) {
    texture = 'wet_broadway';
  }
  // High-card dry: has a high card, rainbow or dry
  else if (highCardCount >= 1 && isRainbow && connectedness === 0) {
    texture = 'high_dry';
  }
  // High card with some connection but rainbow
  else if (highCardCount >= 2 && isRainbow) {
    texture = 'high_dry';
  }

  return {
    texture,
    isMonotone,
    isTwoTone,
    isRainbow,
    isPaired,
    highCardCount,
    connectedness,
    highestCard,
    lowestCard,
  };
}

// --- Postflop Spot Detection ---

export type PostflopSpot =
  | 'MISSED_CBET'           // PFR checked flop HU
  | 'CBET_HU'               // PFR bet flop HU
  | 'CBET_MULTIWAY'         // PFR bet flop multiway
  | 'BET_VS_MISSED_CBET'    // Villain missed c-bet, hero should bet 100%
  | 'PROBE_TURN'            // BB after check-check on flop, bets turn
  | 'DOUBLE_BARREL'         // PFR c-bet flop, continues turn
  | 'MISSED_DOUBLE_BARREL'  // PFR c-bet flop, checked turn
  | 'DONK_BET_TURN'         // BB leads turn after calling flop c-bet
  | 'CHECK_RAISE_FLOP'      // BB check-raised the flop
  | 'NONE';

export interface PostflopAction {
  spot: PostflopSpot;
  street: 'flop' | 'turn' | 'river';
  sizing: number | null;    // As fraction of pot, if applicable
  isCorrect: boolean | null; // Whether the play aligns with theory
  note: string;
}

/**
 * Analyze hero's postflop play in a single hand.
 *
 * Returns an array of notable postflop spots detected.
 */
export function analyzePostflop(
  actions: Action[],
  heroName: string,
  heroWasPFR: boolean,
  flopCards: string[] | null,
  flopPlayerCount: number,
  totalPot: number,
): PostflopAction[] {
  const spots: PostflopAction[] = [];
  if (!flopCards) return spots;

  const flopActions = actions.filter((a) => a.street === 'flop');
  const turnActions = actions.filter((a) => a.street === 'turn');
  const heroFlopActions = flopActions.filter((a) => a.playerName === heroName);
  const heroTurnActions = turnActions.filter((a) => a.playerName === heroName);

  const isHU = flopPlayerCount === 2;
  const boardAnalysis = classifyBoardTexture(flopCards);

  // If hero was all-in preflop, no postflop actions are possible.
  const heroPreflopActions = actions.filter((a) => a.street === 'preflop' && a.playerName === heroName);
  const heroAllInPreflop = heroPreflopActions.some((a) => a.isAllIn);
  
  if (heroAllInPreflop) {
    return spots; // Return empty — no postflop leaks.
  }

  if (heroWasPFR) {
    // Did hero c-bet?
    const heroBetFlop = heroFlopActions.some((a) => a.actionType === 'bet');

    if (heroBetFlop) {
      // C-bet made
      const betAction = heroFlopActions.find((a) => a.actionType === 'bet');
      const sizing = betAction?.amount && totalPot > 0 ? betAction.amount / totalPot : null;
      
      // NEW: Texture-aware sizing validation
      const rec = getRecommendedCbetSizing(boardAnalysis.texture);
      const isCorrectSizing = sizing !== null ? sizing >= rec.minSizing && sizing <= rec.maxSizing : true;

      spots.push({
        spot: isHU ? 'CBET_HU' : 'CBET_MULTIWAY',
        street: 'flop',
        sizing,
        isCorrect: isCorrectSizing, 
        note: isHU
          ? `C-bet HU em board ${boardAnalysis.texture}. Recomendado: ${rec.label}.`
          : 'C-bet multiway',
      });

      // Check for double barrel
      if (turnActions.length > 0) {
        const heroBetTurn = heroTurnActions.some((a) => a.actionType === 'bet');
        if (heroBetTurn) {
          spots.push({
            spot: 'DOUBLE_BARREL',
            street: 'turn',
            sizing: null,
            isCorrect: null,
            note: 'Double barrel no turn',
          });
        } else if (heroTurnActions.some((a) => a.actionType === 'check')) {
          spots.push({
            spot: 'MISSED_DOUBLE_BARREL',
            street: 'turn',
            sizing: null,
            isCorrect: null,
            note: 'Failed to continue on turn after c-bet',
          });
        }
      }
    } else if (isHU) {
      // Missed c-bet in HU as PFR — this is always a leak in Game Plan
      spots.push({
        spot: 'MISSED_CBET',
        street: 'flop',
        sizing: null,
        isCorrect: false,
        note: `Missed c-bet HU como PFR em board ${boardAnalysis.texture}`,
      });
    }
  } else {
    // Hero was NOT PFR — check for exploitative spots

    // Bet vs missed c-bet: villain was PFR, checked, hero should bet 100%
    const villainFlopActions = flopActions.filter((a) => a.playerName !== heroName);
    const villainCheckedFlop = villainFlopActions.some((a) => a.actionType === 'check');
    const heroBetFlop = heroFlopActions.some((a) => a.actionType === 'bet');

    if (isHU && villainCheckedFlop) {
      spots.push({
        spot: 'BET_VS_MISSED_CBET',
        street: 'flop',
        sizing: heroBetFlop ? null : null,
        isCorrect: heroBetFlop,
        note: heroBetFlop
          ? 'Bet vs missed c-bet (correto)'
          : 'Missed exploitative bet vs missed c-bet',
      });
    }

    // Probe turn: BB after check-check on flop
    const heroCheckedFlop = heroFlopActions.some((a) => a.actionType === 'check');
    if (isHU && heroCheckedFlop && villainCheckedFlop && turnActions.length > 0) {
      const heroBetTurn = heroTurnActions.some((a) => a.actionType === 'bet');
      if (heroBetTurn) {
        spots.push({
          spot: 'PROBE_TURN',
          street: 'turn',
          sizing: null,
          isCorrect: true,
          note: 'Probe bet on turn after check-check on flop',
        });
      }
    }

    // Donk bet turn: BB called c-bet on flop, leads turn
    const heroCalledFlop = heroFlopActions.some((a) => a.actionType === 'call');
    if (heroCalledFlop && turnActions.length > 0) {
      const heroBetTurn = heroTurnActions.some((a) => a.actionType === 'bet');
      if (heroBetTurn) {
        spots.push({
          spot: 'DONK_BET_TURN',
          street: 'turn',
          sizing: null,
          isCorrect: null, // Context-dependent
          note: 'Donk bet on turn after calling flop c-bet',
        });
      }
    }

    // Check if hero faced a bet (and didn't fold/call yet)
    const villainBet = flopActions.find((a) => a.playerName !== heroName && (a.actionType === 'bet' || a.actionType === 'raise'));
    if (villainBet && villainBet.amount && totalPot > 0) {
      const sizing = villainBet.amount / totalPot;
      
      spots.push({
        spot: 'NONE', // Custom spot for facing bet
        street: 'flop',
        sizing,
        isCorrect: null,
        note: `Facing ${(sizing * 100).toFixed(0)}% pot bet. Pot Odds: ${(calculatePotOdds(totalPot, villainBet.amount) * 100).toFixed(1)}%. MDF: ${(calculateMDF(totalPot, villainBet.amount) * 100).toFixed(1)}%.`,
      });
    }

    // Check-raise on flop
    const heroCheckRaised =
      heroFlopActions.some((a) => a.actionType === 'check') &&
      heroFlopActions.some((a) => a.actionType === 'raise');
    if (heroCheckRaised) {
      spots.push({
        spot: 'CHECK_RAISE_FLOP',
        street: 'flop',
        sizing: null,
        isCorrect: null,
        note: 'Check-raise on flop',
      });
    }
  }

  return spots;
}

/**
 * Check if a turn card is good for double barrel.
 * Good barrel cards: overcards that connect with IP range but not BB range.
 * Source: CLAUDE.md "Double Barrel (Turn)"
 */
export function isGoodBarrelCard(turnCard: string, flopCards: string[]): boolean {
  const turnRank = cardRank(turnCard);
  const flopHighest = Math.max(...flopCards.map(cardRank));

  // Overcard to the board = good barrel card
  if (turnRank > flopHighest) return true;

  // Broadway card on a low/medium board
  if (isBroadway(turnCard) && flopHighest < 10) return true;

  return false;
}
