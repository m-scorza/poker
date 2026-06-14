import type { Action, PlayerInHand } from '../types/hand';
import type { Position, Scenario, HeroDecision } from '../types/analysis';
import type { ParsedHand } from '../parser/pokerstars';
import type { StrategyProfile } from '../data/strategyProfiles';
import { toCanonicalHandKey } from '../parser/handKey';
import { estimateICMStage } from './icmDetector';
import { detectBountyTournament, estimateBountyContext } from './bountyAnalyzer';
import { detectFakeShove, detectRestealSpot } from './finalTableAnalyzer';
import { detectSqueezeOpportunity } from './squeezeDetector';
import { analyzePostflop } from './postflopAnalyzer';

const FORCED_ACTIONS = new Set(['post_ante', 'post_sb', 'post_bb']);
const AGGRESSIVE_ACTIONS = new Set(['bet', 'raise']);

interface ScenarioResult {
  scenario: Scenario;
  openerPosition: Position | null;
}

function actionsBeforePlayer(actions: Action[], playerName: string): Action[] {
  const playerIdx = actions.findIndex((a) => a.playerName === playerName);
  return playerIdx === -1 ? actions : actions.slice(0, playerIdx);
}

function hasAggressionBeforePlayer(actions: Action[], playerName: string): boolean {
  return actionsBeforePlayer(actions, playerName).some(
    (a) => a.playerName !== playerName && AGGRESSIVE_ACTIONS.has(a.actionType),
  );
}

function computePotBeforeStreet(actions: Action[], street: Action['street']): number {
  const streets: Action['street'][] = ['preflop', 'flop', 'turn', 'river'];
  const streetIdx = streets.indexOf(street);
  if (streetIdx <= 0) return 0;

  const priorStreets = new Set(streets.slice(0, streetIdx));
  const investedByPlayer = new Map<string, number>();
  let pot = 0;

  for (const action of actions) {
    if (!priorStreets.has(action.street) || action.amount === null) continue;
    if (action.actionType === 'fold' || action.actionType === 'check') continue;

    const currentInvestment = investedByPlayer.get(action.playerName) ?? 0;
    const contribution = action.actionType === 'raise'
      ? Math.max(0, action.amount - currentInvestment)
      : action.amount;
    if (contribution <= 0) continue;

    investedByPlayer.set(action.playerName, currentInvestment + contribution);
    pot += contribution;
  }

  return pot;
}

function findPrimaryVillain(
  players: PlayerInHand[],
  actions: Action[],
  heroName: string,
): PlayerInHand | null {
  const nonHeroPlayers = players.filter((p) => p.playerName !== heroName);
  if (nonHeroPlayers.length === 0) return null;

  const preflopActions = actions.filter(
    (a) => a.street === 'preflop' && !FORCED_ACTIONS.has(a.actionType),
  );
  const heroIdx = preflopActions.findIndex((a) => a.playerName === heroName);
  const actionsBeforeHero = heroIdx === -1 ? preflopActions : preflopActions.slice(0, heroIdx);

  const directAggressor = [...actionsBeforeHero]
    .reverse()
    .find((a) => a.playerName !== heroName && AGGRESSIVE_ACTIONS.has(a.actionType));
  const directCaller = actionsBeforeHero.find((a) => a.playerName !== heroName && a.actionType === 'call');
  const fallbackActor = actions.find((a) => a.playerName !== heroName && !FORCED_ACTIONS.has(a.actionType));
  const villainName = directAggressor?.playerName ?? directCaller?.playerName ?? fallbackActor?.playerName;

  return nonHeroPlayers.find((p) => p.playerName === villainName) ?? nonHeroPlayers[0]!;
}

function inferBountyTournamentType(parsedHand: ParsedHand): ReturnType<typeof detectBountyTournament> {
  const { tournament, hand } = parsedHand;
  const label = [tournament.name, tournament.category, tournament.format]
    .filter(Boolean)
    .join(' ');
  const detected = detectBountyTournament(label, tournament.buyIn ?? 0);
  if (detected !== 'regular') return detected;
  return (hand.bountyCollected ?? 0) > 0 ? 'knockout' : 'regular';
}

/**
 * Detect the preflop scenario for hero based on actions before hero's first voluntary action.
 * Enhanced to return the opener's position for "Facing Raise" analysis.
 */
export function detectScenario(
  actions: Action[],
  players: PlayerInHand[],
  heroName: string,
  heroPosition: Position,
  bigBlind: number,
  activePlayers: number,
): ScenarioResult {
  // Map player name to position for easy lookup
  const playerPosMap = new Map(players.map(p => [p.playerName, p.position]));

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
    return { scenario: 'HU_BTN', openerPosition: null };
  }

  // Find the first raiser (the opener)
  const firstRaiser = actionsBefore.find(a => a.actionType === 'raise');
  const openerPosition = firstRaiser ? (playerPosMap.get(firstRaiser.playerName) || null) : null;

  // WALK: hero is BB, everyone folded
  if (heroPosition === 'BB' || heroPosition === 'BTN/SB') {
    const allFolded =
      actionsBefore.length > 0 &&
      actionsBefore.every((a) => a.actionType === 'fold');
    if (heroPosition === 'BB' && allFolded && heroIdx === -1) {
      return { scenario: 'WALK', openerPosition: null };
    }
  }

  // Classify what happened before hero
  const hasRaise = !!firstRaiser;
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
      return { scenario: 'BB_VS_LARGE_RAISE', openerPosition };
    }
    if (hasRaise) {
      // Check raise size relative to BB
      const lastRaise = [...actionsBefore]
        .reverse()
        .find((a) => a.actionType === 'raise');
      if (lastRaise?.amount && lastRaise.amount / bigBlind >= 5) {
        return { scenario: 'BB_VS_LARGE_RAISE', openerPosition };
      }
      return { scenario: 'BB_VS_RAISE', openerPosition };
    }
    if (hasLimp && !hasRaise) {
      const firstLimper = actionsBefore.find(a => a.actionType === 'call');
      return { scenario: 'BB_VS_LIMP', openerPosition: firstLimper ? (playerPosMap.get(firstLimper.playerName) || null) : null };
    }
    if (allFoldedBefore && heroIdx !== -1) {
      return { scenario: 'WALK', openerPosition: null };
    }
    return { scenario: 'WALK', openerPosition: null };
  }

  // SB: Blind war check
  if (
    (heroPosition === 'SB' || heroPosition === 'BTN/SB') &&
    allFoldedBefore &&
    activePlayers > 2
  ) {
    return { scenario: 'BLIND_WAR', openerPosition: null };
  }

  // Non-blind positions
  if (hasAllInRaise) {
    return { scenario: 'FACING_ALL_IN', openerPosition };
  }
  if (hasRaise) {
    return { scenario: 'FACING_RAISE', openerPosition };
  }
  if (hasLimp && !hasRaise) {
    const firstLimper = actionsBefore.find(a => a.actionType === 'call');
    return { scenario: 'FACING_LIMP', openerPosition: firstLimper ? (playerPosMap.get(firstLimper.playerName) || null) : null };
  }
  if (allFoldedBefore) {
    return { scenario: 'RFI', openerPosition: null };
  }

  return { scenario: 'RFI', openerPosition: null };
}

/**
 * Build a HeroDecision from a parsed hand.
 */
export function buildHeroDecision(
  parsedHand: ParsedHand,
  heroName: string = 'scorza23',
  profile: StrategyProfile = 'game_plan',
): HeroDecision | null {
  const { hand, players, actions, collectedAmounts, showdownWinners } = parsedHand;

  // Find hero
  const hero = players.find((p) => p.playerName === heroName);
  if (!hero) return null;
  if (!hero.holeCards) return null;

  const stackBb = hand.bigBlind > 0 ? hero.chipsBefore / hand.bigBlind : 0;
  const handKey = toCanonicalHandKey(hero.holeCards[0], hero.holeCards[1]);

  // Detect scenario
  const { scenario, openerPosition } = detectScenario(
    actions,
    players,
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
  const primaryVillain = findPrimaryVillain(players, actions, heroName);
  const bountyContext = estimateBountyContext(
    hand,
    hero,
    primaryVillain,
    inferBountyTournamentType(parsedHand),
    parsedHand.tournament.buyIn ?? 0,
  );
  const isFinalTableSpot = icmEstimate.stage === 'final_table';
  const fakeShoveSpot = isFinalTableSpot ? detectFakeShove(hand, hero, actions) : null;
  const restealSpot = isFinalTableSpot ? detectRestealSpot(hand, hero, players, actions) : null;

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

  // Analysis flags
  const heroFoldedPreflop = actions.some(
    (a) => a.playerName === heroName && a.street === 'preflop' && a.actionType === 'fold'
  );
  const sawFlop = hand.boardFlop !== null && !heroFoldedPreflop;
  const wasPreFlopRaiser = heroVoluntaryActions.some((a) => a.actionType === 'raise');

  const flopActions = actions.filter((a) => a.street === 'flop');
  const preflopFolders = new Set(
    actions
      .filter((a) => a.street === 'preflop' && a.actionType === 'fold')
      .map((a) => a.playerName),
  );
  // Players who went all-in preflop reach the flop but cannot act on it.
  // For c-bet "HU on flop" semantics, only count players with chips behind.
  const preflopAllIns = new Set(
    actions
      .filter((a) => a.street === 'preflop' && a.isAllIn)
      .map((a) => a.playerName),
  );
  const flopPlayerCount = players.length - preflopFolders.size - preflopAllIns.size;
  const cbetHU = flopPlayerCount === 2;
  const heroAllInPreflop = heroVoluntaryActions.some((a) => a.isAllIn);
  const hasFlopActions = flopActions.length > 0;
  const facedFlopDonk = hasAggressionBeforePlayer(flopActions, heroName);
  const cbetOpportunity = wasPreFlopRaiser && sawFlop && !heroAllInPreflop && hasFlopActions && !facedFlopDonk;
  const cbetMade = cbetOpportunity && flopActions.some((a) => a.playerName === heroName && a.actionType === 'bet');

  const turnActions = actions.filter((a) => a.street === 'turn');
  const doubleBarrelOpportunity = cbetMade && hand.boardTurn !== null && !heroAllInPreflop;
  const doubleBarrelMade = doubleBarrelOpportunity && turnActions.some((a) => a.playerName === heroName && a.actionType === 'bet');

  // Postflop spots analysis
  const postflopActions = analyzePostflop(
    actions,
    heroName,
    wasPreFlopRaiser,
    sawFlop ? hand.boardFlop : null,
    flopPlayerCount,
    computePotBeforeStreet(actions, 'flop') || hand.totalPot,
    profile,
  );

  // Showdown detection
  const heroFolded = actions.some((a) => a.playerName === heroName && a.actionType === 'fold');
  const wentToShowdown = hand.hasShowdown && !heroFolded;
  const wonAmount = collectedAmounts?.get(heroName) ?? 0;
  const wonAtShowdown = wentToShowdown && (showdownWinners?.has(heroName) ?? false);

  return {
    handId: hand.id,
    position: hero.position,
    handKey,
    stackBb,
    scenario,
    openerPosition,
    action: heroAction,
    isCompliant: false, 
    deviationType: null,
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
    bountyContext,
    fakeShoveSpot,
    restealSpot,
    squeezeSpot: squeezeResult
      ? { callerCount: squeezeResult.callerCount, heroAction: squeezeResult.heroAction, recommendedSizing: squeezeResult.recommendedSizing }
      : null,
    netProfit: (hero.chipsAfter || 0) - hero.chipsBefore,
    postflopActions,
  };
}
