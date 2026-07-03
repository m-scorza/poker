/**
 * Final Table analysis — stack dynamics, fake shove detection, resteal spots.
 *
 * Sources:
 * - docs/knowledge/strategy/07-final-table-play.md §1-9
 * - docs/knowledge/strategy/05-icm-and-risk-premium.md §3-4
 * - [Vol.3, D#01, D#02, D#05, D#15, D#20]
 */

import type { Hand, PlayerInHand, Action, Position } from '../types/hand';

export type FTStackType = 'chip_leader' | 'medium' | 'short';

export interface FTPlayerProfile {
  playerName: string;
  chips: number;
  stackBb: number;
  stackType: FTStackType;
  /** Approximate risk premium vs the other players */
  riskPremiumEstimate: number;
  isHero: boolean;
}

export interface FakeShoveSpot {
  handId: string;
  heroPosition: Position;
  heroStackBb: number;
  raiseSize: number;
  /** Raise committed more than 40% of stack but less than all-in */
  isFakeShove: boolean;
  opponentsRemaining: number;
  note: string;
}

export interface RestealSpot {
  handId: string;
  heroPosition: Position;
  heroStackBb: number;
  villainPosition: string;
  villainStackType: FTStackType;
  heroAction: 'resteal' | 'fold' | 'call';
  riskPremiumEstimate: number;
  note: string;
}

/**
 * Classify stack types for all players at a final table hand.
 *
 * Chip leader: top 20% of chips (or largest stack by significant margin)
 * Short: bottom 30% or < 15bb
 * Medium: everyone else
 *
 * Source: docs/knowledge/strategy/07-final-table-play.md §1
 */
export function classifyFTStacks(
  players: PlayerInHand[],
  bigBlind: number,
): FTPlayerProfile[] {
  if (players.length === 0) return [];

  const totalChips = players.reduce((sum, p) => sum + p.chipsBefore, 0);
  const avgChips = totalChips / players.length;

  const sorted = [...players].sort((a, b) => b.chipsBefore - a.chipsBefore);
  const topChips = sorted[0]!.chipsBefore;

  return players.map((p) => {
    const stackBb = bigBlind > 0 ? p.chipsBefore / bigBlind : 0;
    let stackType: FTStackType;

    // Chip leader: has >= 1.5x average AND is the largest stack
    if (p.chipsBefore === topChips && p.chipsBefore >= avgChips * 1.5) {
      stackType = 'chip_leader';
    }
    // Short: < 15bb or bottom 30% of chips
    else if (stackBb < 15 || p.chipsBefore < avgChips * 0.5) {
      stackType = 'short';
    }
    // Medium: everyone else
    else {
      stackType = 'medium';
    }

    // Estimate risk premium based on stack type
    let riskPremiumEstimate: number;
    switch (stackType) {
      case 'chip_leader':
        riskPremiumEstimate = 3; // Low RP
        break;
      case 'medium':
        riskPremiumEstimate = 12; // High RP — most constrained
        break;
      case 'short':
        riskPremiumEstimate = 5; // Low-medium RP — "nothing to lose"
        break;
    }

    return {
      playerName: p.playerName,
      chips: p.chipsBefore,
      stackBb,
      stackType,
      riskPremiumEstimate,
      isHero: p.isHero,
    };
  });
}

/**
 * Detect a fake shove — large open raise (40-70% of stack) at FT that
 * leaves fold equity against multi-way action.
 *
 * Source: docs/knowledge/strategy/07-final-table-play.md §3
 *
 * Conditions:
 * - Hero has 8-15bb
 * - Hero raises but doesn't go all-in
 * - Raise is ≥40% of hero's stack
 * - Multiple opponents behind
 */
export function detectFakeShove(
  hand: Hand,
  hero: PlayerInHand,
  actions: Action[],
): FakeShoveSpot | null {
  const stackBb = hand.bigBlind > 0 ? hero.chipsBefore / hand.bigBlind : 0;

  // Only applies at 8-15bb
  if (stackBb < 8 || stackBb > 15) return null;

  // Find hero's preflop raise
  const heroRaise = actions.find(
    (a) =>
      a.playerName === hero.playerName &&
      a.street === 'preflop' &&
      a.actionType === 'raise' &&
      !a.isAllIn,
  );

  if (!heroRaise || !heroRaise.amount) return null;

  // Check if raise is ≥40% of stack but not all-in
  const raisePercentOfStack = heroRaise.amount / hero.chipsBefore;
  if (raisePercentOfStack < 0.4) return null;

  const opponentsRemaining = hand.activePlayers - 1;
  const isFakeShove = raisePercentOfStack >= 0.4 && raisePercentOfStack < 1.0 && opponentsRemaining >= 2;

  return {
    handId: hand.id,
    heroPosition: hero.position,
    heroStackBb: stackBb,
    raiseSize: heroRaise.amount,
    isFakeShove,
    opponentsRemaining,
    note: isFakeShove
      ? `Fake shove detected: raise of ${(raisePercentOfStack * 100).toFixed(0)}% of stack with ${opponentsRemaining} opponents. Preserves fold equity against multi-way action.`
      : `Large raise (${(raisePercentOfStack * 100).toFixed(0)}% of stack) but fake shove conditions not met.`,
  };
}

/**
 * Detect resteal spots at the final table.
 *
 * A resteal spot exists when:
 * - A player opens (especially from late position)
 * - Hero is in BTN, SB, or BB
 * - Hero has a short-to-medium stack (10-25bb)
 * - The opener is the chip leader or has risk advantage
 *
 * Source: docs/knowledge/strategy/07-final-table-play.md §4
 */
export function detectRestealSpot(
  hand: Hand,
  hero: PlayerInHand,
  players: PlayerInHand[],
  actions: Action[],
): RestealSpot | null {
  const stackBb = hand.bigBlind > 0 ? hero.chipsBefore / hand.bigBlind : 0;

  // Only for short-medium stacks in late positions
  if (stackBb < 8 || stackBb > 25) return null;
  if (!['BTN', 'SB', 'BB', 'BTN/SB'].includes(hero.position)) return null;

  const FORCED = new Set(['post_ante', 'post_sb', 'post_bb']);
  const preflopActions = actions.filter(
    (a) => a.street === 'preflop' && !FORCED.has(a.actionType),
  );

  // Find opener
  const heroIdx = preflopActions.findIndex((a) => a.playerName === hero.playerName);
  if (heroIdx <= 0) return null;

  const actionsBefore = preflopActions.slice(0, heroIdx);
  const opener = actionsBefore.find((a) => a.actionType === 'raise');
  if (!opener) return null;

  // Classify opener's stack
  const ftProfiles = classifyFTStacks(players, hand.bigBlind);
  const openerProfile = ftProfiles.find((p) => p.playerName === opener.playerName);
  const heroProfile = ftProfiles.find((p) => p.isHero);

  if (!openerProfile || !heroProfile) return null;

  // Determine hero's action
  const heroAction = preflopActions[heroIdx]!;
  let restealAction: RestealSpot['heroAction'];
  if (heroAction.actionType === 'raise' && heroAction.isAllIn) {
    restealAction = 'resteal';
  } else if (heroAction.actionType === 'raise') {
    restealAction = 'resteal';
  } else if (heroAction.actionType === 'call') {
    restealAction = 'call';
  } else {
    restealAction = 'fold';
  }

  // Estimate RP: higher if opener is CL, lower if opener is short
  const rpEstimate = openerProfile.stackType === 'chip_leader'
    ? heroProfile.riskPremiumEstimate + 3 // Extra RP vs CL
    : heroProfile.riskPremiumEstimate;

  let note: string;
  if (restealAction === 'resteal') {
    if (rpEstimate > 15) {
      note = `Resteal with high RP (${rpEstimate}%) — requires a premium hand.`;
    } else {
      note = `Resteal vs ${opener.playerName} (${openerProfile.stackType}). RP ~${rpEstimate}%.`;
    }
  } else if (restealAction === 'fold') {
    if (rpEstimate > 15) {
      note = `Correct fold — RP too high (${rpEstimate}%) vs ${openerProfile.stackType}.`;
    } else {
      note = `Fold in resteal spot. RP ~${rpEstimate}%. Evaluate whether the hand warranted a shove.`;
    }
  } else {
    note = `Call (flat) in resteal spot — consider shoving instead of flatting with ${stackBb.toFixed(0)}bb.`;
  }

  return {
    handId: hand.id,
    heroPosition: hero.position,
    heroStackBb: stackBb,
    villainPosition: opener.playerName,
    villainStackType: openerProfile.stackType,
    heroAction: restealAction,
    riskPremiumEstimate: rpEstimate,
    note,
  };
}

/**
 * FT decision matrix — quick reference for action bias.
 * Source: docs/knowledge/strategy/07-final-table-play.md §9
 */
export const FT_DECISION_MATRIX: Array<{
  heroStack: FTStackType;
  opponentStack: FTStackType;
  bias: string;
  description: string;
}> = [
  { heroStack: 'chip_leader', opponentStack: 'short', bias: 'Attack', description: 'Low RP, hunt bounty in PKO' },
  { heroStack: 'chip_leader', opponentStack: 'medium', bias: 'Attack', description: 'They cannot fight back' },
  { heroStack: 'medium', opponentStack: 'chip_leader', bias: 'Extreme caution', description: 'Highest RP — fold marginal' },
  { heroStack: 'medium', opponentStack: 'medium', bias: 'Selective', description: 'Moderate RP on both sides' },
  { heroStack: 'medium', opponentStack: 'short', bias: 'Let them bust', description: 'Benefit from pay jump without risk' },
  { heroStack: 'short', opponentStack: 'chip_leader', bias: 'Shove wide', description: 'Low RP, nothing to lose' },
  { heroStack: 'short', opponentStack: 'medium', bias: 'Shove wide', description: 'Low RP, apply pressure' },
  { heroStack: 'short', opponentStack: 'short', bias: 'Selective shove', description: 'Mutual elimination risk' },
];
