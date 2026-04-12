import type { Action } from '../types/hand';
import type { Position, Scenario, HeroDecision } from '../types/analysis';
import type { ParsedHand } from '../parser/pokerstars';
import { toCanonicalHandKey } from '../parser/handKey';
import { estimateICMStage } from './icmDetector';
import { detectSqueezeOpportunity } from './squeezeDetector';

const FORCED_ACTIONS = new Set(['post_ante', 'post_sb', 'post_bb']);

/**
 * Detect the preflop scenario for hero based on actions before hero's first voluntary action.
 *
 * Bug #1 prevention: Always checks actions before hero — never classifies FACING_RAISE as RFI.
 * Bug #2 prevention: Checks isAllIn flag AND raise size for BB_VS_LARGE_RAISE.
 */
export function detectScenario(
  actions: Action[],
  heroName: string,
  heroPosition: Position,
  bigBlind: number,
  activePlayers: number,
): Scenario {
  // Get preflop voluntary actions only
  const preflopActions = actions.filter(
    (a) => a.street === 'preflop' && !FORCED_ACTIONS.has(a.actionType),
  );

  // Find hero's first voluntary action index
  const heroIdx = preflopActions.findIndex((a) => a.playerName === heroName);

  // Actions before hero
  const actionsBefore = heroIdx === -1 ? preflopActions : preflopActions.slice(0, heroIdx);

  // HU: hero is BTN/SB
  if (activePlayers === 2 && heroPosition === 'BTN/SB') {
    return 'HU_BTN';
  }

  // WALK: hero is BB, everyone folded
  if (heroPosition === 'BB' || heroPosition === 'BTN/SB') {
    const allFolded =
      actionsBefore.length > 0 &&
      actionsBefore.every((a) => a.actionType === 'fold');
    // For BB: if all non-BB players folded and hero had no voluntary action, it's a walk
    if (heroPosition === 'BB' && allFolded && heroIdx === -1) {
      return 'WALK';
    }
  }

  // Classify what happened before hero
  const hasRaise = actionsBefore.some((a) => a.actionType === 'raise');
  const hasAllInRaise = actionsBefore.some(
    (a) => a.actionType === 'raise' && a.isAllIn,
  );
  const hasLimp = actionsBefore.some((a) => a.actionType === 'call');
  const allFoldedBefore =
    actionsBefore.length === 0 ||
    actionsBefore.every((a) => a.actionType === 'fold');

  // BB-specific scenarios
  if (heroPosition === 'BB') {
    if (hasAllInRaise) {
      return 'BB_VS_LARGE_RAISE';
    }
    if (hasRaise) {
      // Check raise size relative to BB
      const lastRaise = [...actionsBefore]
        .reverse()
        .find((a) => a.actionType === 'raise');
      if (lastRaise?.amount && lastRaise.amount / bigBlind >= 5) {
        return 'BB_VS_LARGE_RAISE';
      }
      return 'BB_VS_RAISE';
    }
    if (hasLimp && !hasRaise) {
      return 'BB_VS_LIMP';
    }
    // Everyone folded to BB (but hero did act — checked or raised)
    if (allFoldedBefore && heroIdx !== -1) {
      return 'WALK';
    }
    return 'WALK';
  }

  // SB: Blind war check (folded to SB, only BB remains)
  if (
    (heroPosition === 'SB' || heroPosition === 'BTN/SB') &&
    allFoldedBefore &&
    activePlayers > 2
  ) {
    return 'BLIND_WAR';
  }

  // Non-blind positions
  if (hasAllInRaise) {
    return 'FACING_ALL_IN';
  }
  if (hasRaise) {
    return 'FACING_RAISE';
  }
  if (hasLimp && !hasRaise) {
    return 'FACING_LIMP';
  }
  if (allFoldedBefore) {
    return 'RFI';
  }

  return 'RFI';
}

/**
 * Build a HeroDecision from a parsed hand.
 * Returns null if hero is not in the hand or it's a WALK with no decision.
 */
export function buildHeroDecision(
  parsedHand: ParsedHand,
  heroName: string = 'scorza23',
): HeroDecision | null {
  const { hand, players, actions, collectedAmounts } = parsedHand;

  // Find hero
  const hero = players.find((p) => p.playerName === heroName);
  if (!hero) return null;
  if (!hero.holeCards) return null;

  const stackBb = hand.bigBlind > 0 ? hero.chipsBefore / hand.bigBlind : 0;

  // Canonical hand key
  const handKey = toCanonicalHandKey(hero.holeCards[0], hero.holeCards[1]);

  // Detect scenario
  const scenario = detectScenario(
    actions,
    heroName,
    hero.position,
    hand.bigBlind,
    hand.activePlayers,
  );

  // ICM stage detection
  const icmEstimate = estimateICMStage(hand, players);

  // Squeeze opportunity detection
  const squeezeResult = detectSqueezeOpportunity(
    actions, heroName, hero.position, handKey, stackBb, hand.bigBlind,
  );

  // Find hero's first voluntary preflop action
  const heroVoluntaryActions = actions.filter(
    (a) =>
      a.playerName === heroName &&
      a.street === 'preflop' &&
      !FORCED_ACTIONS.has(a.actionType),
  );
  const firstAction = heroVoluntaryActions[0];
  const heroAction: 'fold' | 'raise' | 'call' | 'check' =
    firstAction?.actionType === 'raise'
      ? 'raise'
      : firstAction?.actionType === 'call'
        ? 'call'
        : firstAction?.actionType === 'check'
          ? 'check'
          : 'fold';

  // Postflop analysis
  const sawFlop = hand.boardFlop !== null && heroAction !== 'fold';
  const wasPreFlopRaiser =
    heroVoluntaryActions.some((a) => a.actionType === 'raise');

  // C-bet: hero was PFR, flop exists, and hero had opportunity to bet
  const flopActions = actions.filter((a) => a.street === 'flop');
  const heroFlopActions = flopActions.filter(
    (a) => a.playerName === heroName,
  );

  // Count how many players saw the flop
  const preflopFolders = new Set(
    actions
      .filter((a) => a.street === 'preflop' && a.actionType === 'fold')
      .map((a) => a.playerName),
  );
  const flopPlayerCount = players.length - preflopFolders.size;
  const cbetHU = flopPlayerCount === 2;

  // Guard: hero can't c-bet if already all-in preflop
  const heroAllInPreflop = heroVoluntaryActions.some((a) => a.isAllIn);

  // C-bet opportunity: hero was PFR and saw flop and is NOT already all-in
  // Bug #1: If there are ZERO voluntary flop actions from anyone, the preflop action
  // ran out all-in, so hero cannot c-bet.
  const hasFlopActions = flopActions.length > 0;
  const cbetOpportunity = wasPreFlopRaiser && sawFlop && !heroAllInPreflop && hasFlopActions;
  const cbetMade =
    cbetOpportunity &&
    heroFlopActions.some((a) => a.actionType === 'bet');

  // Double barrel: hero c-bet flop, turn exists, not all-in preflop
  const turnActions = actions.filter((a) => a.street === 'turn');
  const heroTurnActions = turnActions.filter(
    (a) => a.playerName === heroName,
  );
  const doubleBarrelOpportunity =
    cbetMade && hand.boardTurn !== null && !heroAllInPreflop && hasFlopActions;
  const doubleBarrelMade =
    doubleBarrelOpportunity &&
    heroTurnActions.some((a) => a.actionType === 'bet');

  // Showdown detection
  const wentToShowdown = actions.some(
    (a) =>
      a.playerName === heroName &&
      a.street === 'river' &&
      a.actionType !== 'fold',
  ) && hand.boardRiver !== null;

  // Won amount: from parsed "collected X from pot" lines
  const wonAmount = collectedAmounts?.get(heroName) ?? 0;

  // Won at showdown: hero went to showdown AND collected chips
  const wonAtShowdown = wentToShowdown && wonAmount > 0;

  return {
    handId: hand.id,
    position: hero.position,
    handKey,
    stackBb,
    scenario,
    action: heroAction,
    isCompliant: false, // Stub — needs range data
    deviationType: null, // Stub — needs range data
    sawFlop,
    wasPreFlopRaiser,
    cbetOpportunity,
    cbetMade,
    cbetHU,
    doubleBarrelOpportunity,
    doubleBarrelMade,
    wentToShowdown,
    wonAtShowdown,
    wonAmount,
    icmStage: icmEstimate.stage,
    squeezeSpot: squeezeResult
      ? { callerCount: squeezeResult.callerCount, heroAction: squeezeResult.heroAction, recommendedSizing: squeezeResult.recommendedSizing }
      : null,
  };
}
