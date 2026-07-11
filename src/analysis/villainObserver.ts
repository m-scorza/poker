import type { Hand, PlayerInHand, Action } from '../types/hand';
import type { VillainRawCounters, PositionStatsRawCounters } from '../types/villain';

export interface VillainHandObservation {
  vpip: boolean;
  pfr: boolean;
  limp: boolean;
  threeBetOpp: boolean;
  threeBetMade: boolean;
  foldToThreeBetOpp: boolean;
  foldToThreeBetMade: boolean;
  cbetFlopOpp: boolean;
  cbetFlopMade: boolean;
  cbetTurnOpp: boolean;
  cbetTurnMade: boolean;
  foldToCbetOpp: boolean;
  foldToCbetMade: boolean;
  wentToShowdown: boolean;
  wonAtShowdown: boolean;
  bets: number;
  raises: number;
  calls: number;
}

function voluntaryPreflopActions(actions: Action[]): Action[] {
  return actions.filter(
    (a) => a.street === 'preflop' && !['post_ante', 'post_sb', 'post_bb'].includes(a.actionType),
  );
}

function firstActionOnStreet(actions: Action[], playerName: string, street: Action['street']): Action | undefined {
  return actions
    .filter((a) => a.street === street && a.playerName === playerName)
    .sort((a, b) => a.sequence - b.sequence)[0];
}

function hasPriorAggression(actions: Action[], action: Action): boolean {
  return actions.some(
    (a) => a.street === action.street &&
      a.sequence < action.sequence &&
      a.playerName !== action.playerName &&
      (a.actionType === 'bet' || a.actionType === 'raise'),
  );
}

export function collectVillainHandObservation(
  hand: Hand,
  player: PlayerInHand,
  actions: Action[],
): VillainHandObservation {
  const playerActions = actions.filter((a) => a.playerName === player.playerName);
  const playerPreflop = voluntaryPreflopActions(playerActions);
  const allPreflop = voluntaryPreflopActions(actions).sort((a, b) => a.sequence - b.sequence);
  const playerFirstPreflop = playerPreflop[0];
  const actionsBeforeFirst = playerFirstPreflop
    ? allPreflop.filter((a) => a.sequence < playerFirstPreflop.sequence)
    : [];
  const hasRaiseBefore = actionsBeforeFirst.some((a) => a.actionType === 'raise');

  const preflopRaises = allPreflop.filter((a) => a.actionType === 'raise');
  const lastPreflopRaise = preflopRaises[preflopRaises.length - 1];
  const firstPlayerRaise = playerPreflop.find((a) => a.actionType === 'raise');
  const firstRaiseAfterPlayerOpen = firstPlayerRaise && !hasRaiseBefore
    ? allPreflop.find((a) => a.sequence > firstPlayerRaise.sequence && a.playerName !== player.playerName && a.actionType === 'raise')
    : undefined;
  const foldAfterFacingThreeBet = firstRaiseAfterPlayerOpen
    ? playerPreflop.some((a) => a.sequence > firstRaiseAfterPlayerOpen.sequence && a.actionType === 'fold')
    : false;

  const flopAction = firstActionOnStreet(actions, player.playerName, 'flop');
  const hasFlopCbetOpp = lastPreflopRaise?.playerName === player.playerName &&
    !!flopAction &&
    !hasPriorAggression(actions, flopAction);
  const hasFlopCbet = hasFlopCbetOpp && flopAction?.actionType === 'bet';

  const turnAction = firstActionOnStreet(actions, player.playerName, 'turn');
  const hasTurnCbetOpp = hasFlopCbet &&
    !!turnAction &&
    !hasPriorAggression(actions, turnAction);
  const hasTurnCbet = hasTurnCbetOpp && turnAction?.actionType === 'bet';

  const opposingFlopCbet = actions.find((a) => {
    if (a.street !== 'flop' || a.actionType !== 'bet' || a.playerName === player.playerName) return false;
    if (lastPreflopRaise?.playerName !== a.playerName) return false;
    return !hasPriorAggression(actions, a);
  });
  const actionFacingCbet = opposingFlopCbet
    ? playerActions.find((a) => a.street === 'flop' && a.sequence > opposingFlopCbet.sequence)
    : undefined;

  return {
    vpip: playerPreflop.some((a) => a.actionType === 'call' || a.actionType === 'raise'),
    pfr: playerPreflop.some((a) => a.actionType === 'raise'),
    limp: playerFirstPreflop?.actionType === 'call' && !hasRaiseBefore,
    threeBetOpp: hasRaiseBefore,
    threeBetMade: hasRaiseBefore && playerPreflop.some((a) => a.actionType === 'raise'),
    foldToThreeBetOpp: !!firstRaiseAfterPlayerOpen,
    foldToThreeBetMade: foldAfterFacingThreeBet,
    cbetFlopOpp: hasFlopCbetOpp,
    cbetFlopMade: hasFlopCbet,
    cbetTurnOpp: hasTurnCbetOpp,
    cbetTurnMade: hasTurnCbet,
    foldToCbetOpp: !!actionFacingCbet,
    foldToCbetMade: actionFacingCbet?.actionType === 'fold',
    wentToShowdown: hand.hasShowdown && player.holeCards !== null,
    wonAtShowdown: hand.hasShowdown &&
      player.holeCards !== null &&
      (hand.villainDeltas.find((d) => d.name === player.playerName)?.net ?? 0) > 0,
    bets: playerActions.filter((a) => a.actionType === 'bet').length,
    raises: playerActions.filter((a) => a.actionType === 'raise').length,
    calls: playerActions.filter((a) => a.actionType === 'call').length,
  };
}

export function applyObservationToCounters(counters: VillainRawCounters, observation: VillainHandObservation): void {
  counters.totalHands += 1;
  if (observation.vpip) counters.vpipHands += 1;
  if (observation.pfr) counters.pfrHands += 1;
  if (observation.limp) counters.limpHands += 1;
  if (observation.threeBetOpp) counters.threeBetOpps += 1;
  if (observation.threeBetMade) counters.threeBetMade += 1;
  if (observation.foldToThreeBetOpp) counters.foldToThreeBetOpps += 1;
  if (observation.foldToThreeBetMade) counters.foldToThreeBetMade += 1;
  if (observation.cbetFlopOpp) counters.cbetFlopOpps += 1;
  if (observation.cbetFlopMade) counters.cbetFlopMade += 1;
  if (observation.cbetTurnOpp) counters.cbetTurnOpps += 1;
  if (observation.cbetTurnMade) counters.cbetTurnMade += 1;
  if (observation.foldToCbetOpp) counters.foldToCbetOpps += 1;
  if (observation.foldToCbetMade) counters.foldToCbetMade += 1;
  if (observation.wentToShowdown) counters.wtsdHands += 1;
  if (observation.wonAtShowdown) counters.wsdHands += 1;
  counters.totalBets += observation.bets;
  counters.totalRaises += observation.raises;
  counters.totalCalls += observation.calls;
}

export function applyObservationToPositionCounters(
  counters: PositionStatsRawCounters,
  observation: VillainHandObservation,
): void {
  counters.totalHands += 1;
  if (observation.vpip) counters.vpipHands += 1;
  if (observation.pfr) counters.pfrHands += 1;
  if (observation.threeBetOpp) counters.threeBetOpps += 1;
  if (observation.threeBetMade) counters.threeBetMade += 1;
}
