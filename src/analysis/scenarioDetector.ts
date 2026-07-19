import type { Action, PlayerInHand } from '../types/hand';
import type { Position, Scenario, HeroDecision } from '../types/analysis';
import type { ParsedHand } from '../parser/pokerstars';
import type { StrategyProfile } from '../data/strategyProfiles';
import { DEFAULT_HERO_NAME } from '../data/localStorage';
import { toCanonicalHandKey } from '../parser/handKey';
import { estimateICMStage } from './icmDetector';
import { detectBountyTournament, estimateBountyContext } from './bountyAnalyzer';
import { detectFakeShove, detectRestealSpot } from './finalTableAnalyzer';
import { detectSqueezeOpportunity } from './squeezeDetector';
import { analyzePostflop, actedAfterVillainCheck } from './postflopAnalyzer';

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

export function computePotBeforeStreet(actions: Action[], street: Action['street']): number {
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
  if (heroPosition === 'BB') {
    const allFolded =
      actionsBefore.length > 0 &&
      actionsBefore.every((a) => a.actionType === 'fold');
    if (allFolded && heroIdx === -1) {
      return { scenario: 'WALK', openerPosition: null };
    }
  }

  // Classify what happened before hero
  const hasRaise = !!firstRaiser;
  const hasAllInRaise = actionsBefore.some(
    (a) => a.actionType === 'raise' && a.isAllIn,
  );
  // ≥2 non-all-in raises before hero = an open + a 3-bet (or more). We have no
  // 3-bet-defense / 4-bet ranges, so this is its own scenario (excluded from
  // compliance) rather than graded against a single-open range. (B4)
  const raiseCount = actionsBefore.filter((a) => a.actionType === 'raise').length;
  const hasLimp = actionsBefore.some((a) => a.actionType === 'call');
  const allFoldedBefore =
    actionsBefore.length === 0 ||
    actionsBefore.every((a) => a.actionType === 'fold');

  // BB-specific scenarios
  if (heroPosition === 'BB') {
    if (hasAllInRaise) {
      return { scenario: 'BB_VS_LARGE_RAISE', openerPosition };
    }
    if (raiseCount >= 2) {
      return { scenario: 'FACING_3BET', openerPosition };
    }
    if (hasRaise) {
      // Check raise size relative to BB
      const lastRaise = [...actionsBefore]
        .reverse()
        .find((a) => a.actionType === 'raise');
      if (lastRaise?.amount && lastRaise.amount / bigBlind >= 5) {
        return { scenario: 'BB_VS_LARGE_RAISE', openerPosition };
      }
      // A normal open plus any caller/limper before the BB is not the same
      // heads-up BB defense family. Keep it separate so the suited-fold rule is
      // not reused for multiway equity-realization / squeeze-review spots.
      if (hasLimp) {
        return { scenario: 'BB_VS_RAISE_MULTIWAY', openerPosition };
      }
      return { scenario: 'BB_VS_RAISE', openerPosition };
    }
    if (hasLimp && !hasRaise) {
      const firstLimper = actionsBefore.find(a => a.actionType === 'call');
      return { scenario: 'BB_VS_LIMP', openerPosition: firstLimper ? (playerPosMap.get(firstLimper.playerName) || null) : null };
    }
    return { scenario: 'WALK', openerPosition: null };
  }

  // SB: Blind war check
  if (heroPosition === 'SB' && allFoldedBefore && activePlayers > 2) {
    return { scenario: 'BLIND_WAR', openerPosition: null };
  }

  // Non-blind positions
  if (hasAllInRaise) {
    return { scenario: 'FACING_ALL_IN', openerPosition };
  }
  if (raiseCount >= 2) {
    return { scenario: 'FACING_3BET', openerPosition };
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

interface HeroOpenFacing3Bet {
  threeBettorName: string;
  threeBetAllIn: boolean;
  response: 'fold' | 'raise' | 'call';
}

/**
 * Detect the vault-anchored vs-3-bet spot: hero opened (first voluntary
 * preflop action is a non-all-in raise), exactly one villain raised behind
 * with no callers in between, and hero acted again. Returns null for every
 * other shape (open-shove, squeeze with a caller, 3-bet + cold 4-bet, no
 * hero response) — those stay classified by hero's first action.
 */
function detectHeroOpenFacing3Bet(
  actions: Action[],
  heroName: string,
): HeroOpenFacing3Bet | null {
  const preflopVoluntary = actions.filter(
    (a) => a.street === 'preflop' && !FORCED_ACTIONS.has(a.actionType),
  );
  const heroFirstIdx = preflopVoluntary.findIndex((a) => a.playerName === heroName);
  if (heroFirstIdx === -1) return null;

  const open = preflopVoluntary[heroFirstIdx]!;
  if (open.actionType !== 'raise' || open.isAllIn) return null;

  const afterOpen = preflopVoluntary.slice(heroFirstIdx + 1);
  const heroResponseIdx = afterOpen.findIndex((a) => a.playerName === heroName);
  if (heroResponseIdx === -1) return null;

  const between = afterOpen.slice(0, heroResponseIdx);
  const raises = between.filter((a) => a.actionType === 'raise');
  const calls = between.filter((a) => a.actionType === 'call');
  if (raises.length !== 1 || calls.length > 0) return null;

  const response = afterOpen[heroResponseIdx]!;
  if (response.actionType === 'check') return null;

  const threeBet = raises[0]!;
  return {
    threeBettorName: threeBet.playerName,
    threeBetAllIn: threeBet.isAllIn,
    response:
      response.actionType === 'raise'
        ? 'raise'
        : response.actionType === 'call'
          ? 'call'
          : 'fold',
  };
}

interface FacingAllInInputs {
  shoverPosition: Position | null;
  openShove: boolean;
  potBb: number;
  callCostBb: number;
  effectiveBb: number;
}

/**
 * Compute the pot-odds inputs for a cold FACING_ALL_IN spot. `openShove` is true
 * only for a clean first-in shove hero cold-faces (a single all-in raise, no
 * limpers/callers, hero not previously invested); everything else stays
 * ungraded. The pot is side-pot corrected — the uncallable excess of a shove
 * that covers hero is removed, since hero cannot win it.
 */
function computeFacingAllInInputs(
  actions: Action[],
  players: PlayerInHand[],
  heroName: string,
  hero: PlayerInHand,
  bigBlind: number,
): FacingAllInInputs | null {
  if (bigBlind <= 0) return null;
  const preflop = actions.filter((a) => a.street === 'preflop');
  const heroVolIdx = preflop.findIndex(
    (a) => a.playerName === heroName && !FORCED_ACTIONS.has(a.actionType),
  );
  const beforeHero = heroVolIdx === -1 ? preflop : preflop.slice(0, heroVolIdx);

  const voluntaryBefore = beforeHero.filter((a) => !FORCED_ACTIONS.has(a.actionType));
  const raisesBefore = voluntaryBefore.filter((a) => a.actionType === 'raise');
  const callsBefore = voluntaryBefore.filter((a) => a.actionType === 'call');
  const heroActedBefore = voluntaryBefore.some((a) => a.playerName === heroName);
  const shove = raisesBefore.find((a) => a.isAllIn);
  if (!shove) return null;

  const shoverPosition = players.find((p) => p.playerName === shove.playerName)?.position ?? null;
  const openShove =
    raisesBefore.length === 1 &&
    shove.isAllIn &&
    callsBefore.length === 0 &&
    !heroActedBefore;

  // Pot before hero: antes accumulate directly; blinds/calls/bets/raises track a
  // per-player street investment so raise "to" amounts contribute only the delta.
  let pot = 0;
  const streetInvested = new Map<string, number>();
  let heroCommitted = 0;
  for (const a of beforeHero) {
    if (a.amount === null || a.actionType === 'fold' || a.actionType === 'check') continue;
    if (a.playerName === heroName) heroCommitted += a.amount;
    if (a.actionType === 'post_ante') {
      pot += a.amount;
      continue;
    }
    if (a.actionType === 'raise') {
      const prev = streetInvested.get(a.playerName) ?? 0;
      pot += a.amount - prev;
      streetInvested.set(a.playerName, a.amount);
      continue;
    }
    pot += a.amount;
    streetInvested.set(a.playerName, (streetInvested.get(a.playerName) ?? 0) + a.amount);
  }

  const shoverTo = streetInvested.get(shove.playerName) ?? 0;
  const heroStreetInvested = streetInvested.get(heroName) ?? 0;
  const amountToCall = shoverTo - heroStreetInvested;
  const heroAvailable = Math.max(0, hero.chipsBefore - heroCommitted);
  const callCost = Math.min(amountToCall, heroAvailable);
  const uncallableExcess = Math.max(0, amountToCall - heroAvailable);
  const shover = players.find((p) => p.playerName === shove.playerName);
  const effective = Math.min(shover?.chipsBefore ?? hero.chipsBefore, hero.chipsBefore);

  return {
    shoverPosition,
    openShove,
    potBb: (pot - uncallableExcess) / bigBlind,
    callCostBb: callCost / bigBlind,
    effectiveBb: effective / bigBlind,
  };
}

/**
 * Build a HeroDecision from a parsed hand.
 */
export function buildHeroDecision(
  parsedHand: ParsedHand,
  heroName: string = DEFAULT_HERO_NAME,
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

  // Hero opened and a single villain 3-bet behind (the vault-anchored spot):
  // the hand's defining decision becomes hero's RESPONSE to the 3-bet, graded
  // by checkFacing3Bet. Only flips clean RFI opens from non-blind seats —
  // BLIND_WAR keeps grading the SB open (plan §7 Q3) and squeeze/4-bet shapes
  // stay on the first action. Tradeoff: the open itself is no longer graded
  // for RFI compliance on flipped hands.
  let finalScenario = scenario;
  let finalOpenerPosition = openerPosition;
  let finalAction = heroAction;
  let heroOpenedBefore3Bet: boolean | undefined;
  let threeBetAllIn: boolean | undefined;
  if (
    scenario === 'RFI' &&
    hero.position !== 'SB' &&
    hero.position !== 'BB' &&
    hero.position !== 'BTN/SB'
  ) {
    const vs3betSpot = detectHeroOpenFacing3Bet(actions, heroName);
    if (vs3betSpot) {
      finalScenario = 'FACING_3BET';
      finalAction = vs3betSpot.response;
      heroOpenedBefore3Bet = true;
      threeBetAllIn = vs3betSpot.threeBetAllIn;
      finalOpenerPosition =
        players.find((p) => p.playerName === vs3betSpot.threeBettorName)?.position ?? null;
    }
  }

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
  // The "c-bet 100% HU" rule applies only when hero is IN POSITION on the flop
  // (the spot-level MISSED_CBET fix requires it too). Gating the HU c-bet
  // counter on the same position logic stops a justified OOP check from being
  // flagged as a missed HU c-bet (B1).
  const heroInPositionOnFlop = actedAfterVillainCheck(flopActions, heroName);
  const cbetHU = flopPlayerCount === 2 && heroInPositionOnFlop;
  const heroAllInPreflop = heroVoluntaryActions.some((a) => a.isAllIn);
  const hasFlopActions = flopActions.length > 0;
  const facedFlopDonk = hasAggressionBeforePlayer(flopActions, heroName);
  const cbetOpportunity = wasPreFlopRaiser && sawFlop && !heroAllInPreflop && hasFlopActions && !facedFlopDonk;
  const cbetMade = cbetOpportunity && flopActions.some((a) => a.playerName === heroName && a.actionType === 'bet');

  const turnActions = actions.filter((a) => a.street === 'turn');
  // A double barrel is only an opportunity if hero's flop c-bet was CALLED
  // (a check-raise is not a barrel spot — hero is defending, not continuing),
  // the turn was dealt, and hero is not facing a donk bet into them on the
  // turn. Previously any c-bet + turn counted, so a c-bet that got
  // check-raised and called was flagged as a missed double barrel (B3).
  const flopCbetCalled = (() => {
    if (!cbetMade) return false;
    const heroBetIdx = flopActions.findIndex(
      (a) => a.playerName === heroName && a.actionType === 'bet',
    );
    if (heroBetIdx === -1) return false;
    const afterHeroBet = flopActions.slice(heroBetIdx + 1);
    return afterHeroBet.some((a) => a.actionType === 'call')
      && !afterHeroBet.some((a) => a.actionType === 'raise');
  })();
  const facedTurnDonk = hasAggressionBeforePlayer(turnActions, heroName);
  const doubleBarrelOpportunity =
    flopCbetCalled && hand.boardTurn !== null && !heroAllInPreflop
    && turnActions.length > 0 && !facedTurnDonk;
  const doubleBarrelMade = doubleBarrelOpportunity && turnActions.some((a) => a.playerName === heroName && a.actionType === 'bet');

  // Postflop spots analysis
  const postflopActions = analyzePostflop(
    actions,
    heroName,
    wasPreFlopRaiser,
    sawFlop ? hand.boardFlop : null,
    flopPlayerCount,
    computePotBeforeStreet(actions, 'flop'),
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
    scenario: finalScenario,
    openerPosition: finalOpenerPosition,
    action: finalAction,
    heroOpenedBefore3Bet,
    threeBetAllIn,
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
    wentAllInPreflop: heroAllInPreflop,
    postflopActions,
  };
}
