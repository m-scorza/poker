import { aggregateVillainStats, importHands, importTournamentSummaries, db } from './store';
import type { Action, Hand, PlayerInHand, Tournament } from '../types/hand';
import type { HeroDecision, Position, Scenario, DeviationType } from '../types/analysis';
import type { ParsedTournamentSummary } from '../parser/tournamentSummary';

export interface DemoDataset {
  handsData: Array<{
    hand: Hand;
    players: PlayerInHand[];
    actions: Action[];
    tournament: Partial<Tournament>;
    heroDecision: HeroDecision;
  }>;
  summaries: ParsedTournamentSummary[];
}

export interface DemoSeedResult {
  importedHands: number;
  summariesCreated: number;
  summariesUpdated: number;
  alreadyLoaded: boolean;
}

export type DemoSeedPhase = 'checking' | 'generating' | 'importing_hands' | 'importing_summaries' | 'done';

export interface DemoSeedProgress {
  phase: DemoSeedPhase;
  message: string;
  progress?: number;
}

const DEMO_PREFIX = 'DEMO';
export const DEMO_TOURNAMENT_COUNT = 250;
export const DEMO_TARGET_HAND_COUNT = 10_000;
const HERO = 'scorza23';
const BUY_IN = 1;
const FEE = 0.1;
const SEAT_POSITIONS: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];

function demoTournamentId(index: number): string {
  return `${DEMO_PREFIX}-T-${String(index + 1).padStart(3, '0')}`;
}

function demoHandId(tournamentIndex: number, handIndex: number): string {
  return `${DEMO_PREFIX}-H-${String(tournamentIndex + 1).padStart(3, '0')}-${handIndex + 1}`;
}

function makeDecision(
  handId: string,
  handIndex: number,
  tournamentIndex: number,
  netProfitBb: number,
  bigBlind: number,
): HeroDecision {
  const positions: Position[] = ['BTN', 'CO', 'HJ', 'BB', 'SB'];
  const scenarios: Scenario[] = ['RFI', 'RFI', 'RFI', 'RFI', 'RFI'];
  const compliant = (tournamentIndex + handIndex) % 8 !== 0;
  const action: HeroDecision['action'] = compliant
    ? (handIndex === 1 ? 'call' : 'raise')
    : (handIndex === 2 ? 'fold' : 'call');
  const sawFlop = action !== 'fold' && handIndex !== 2;
  const wasPreFlopRaiser = action === 'raise';
  const cbetOpportunity = wasPreFlopRaiser && sawFlop;
  const cbetMade = cbetOpportunity && tournamentIndex % 6 !== 0;
  const deviationType: DeviationType | null = compliant
    ? null
    : handIndex % 3 === 0
      ? 'OPENED_OUT_OF_RANGE'
      : handIndex % 3 === 1
        ? 'COLD_CALL'
        : 'BB_FOLD_SUITED';

  return {
    handId,
    position: positions[(tournamentIndex + handIndex) % positions.length]!,
    handKey: ['AKs', 'QJs', '76s', 'A5s', 'TT'][(tournamentIndex + handIndex) % 5]!,
    stackBb: 18 + ((tournamentIndex + handIndex) % 38),
    scenario: scenarios[(tournamentIndex + handIndex) % scenarios.length]!,
    action,
    isCompliant: compliant,
    deviationType,
    sawFlop,
    wasPreFlopRaiser,
    cbetOpportunity,
    cbetMade,
    cbetHU: cbetOpportunity,
    doubleBarrelOpportunity: cbetMade && handIndex === 0,
    doubleBarrelMade: cbetMade && handIndex === 0 && tournamentIndex % 5 !== 0,
    wentToShowdown: sawFlop && handIndex === 1,
    wonAtShowdown: sawFlop && handIndex === 1 && netProfitBb > 0,
    wonAmount: Math.max(0, Math.round(140 + netProfitBb * 40)),
    netProfit: Math.round(netProfitBb * bigBlind),
  };
}

function makePlayers(
  handId: string,
  heroPosition: Position,
  villain: string,
  tournamentIndex: number,
  handIndex: number,
  heroChipsBefore: number,
  heroChipsAfter: number,
  bigBlind: number,
  netProfit: number,
): PlayerInHand[] {
  return SEAT_POSITIONS.map((position, index) => {
    const seatNumber = index + 1;
    const isHero = position === heroPosition;
    const isMainVillain = position === 'BB' && !isHero;
    const playerName = isHero
      ? HERO
      : isMainVillain
        ? villain
        : `demo_${position.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${tournamentIndex % 7}`;

    return {
      handId,
      seatNumber,
      playerName,
      chipsBefore: isHero ? heroChipsBefore : 2800 + seatNumber * 120,
      chipsAfter: isHero
        ? heroChipsAfter
        : isMainVillain
          ? 3200 - Math.round(netProfit * bigBlind)
          : 2800 + seatNumber * 120,
      position,
      isHero,
      holeCards: isHero ? ['Ah', 'Kh'] : handIndex === 1 && isMainVillain ? ['Qs', 'Qd'] : null,
    };
  });
}

function makeHandBundle(tournament: Tournament, tournamentIndex: number, handIndex: number, tournamentHandCount: number, netProfit: number) {
  const id = demoHandId(tournamentIndex, handIndex);
  const date = new Date((tournament.startDate ?? new Date()).getTime() + handIndex * 8 * 60 * 1000);
  const bigBlind = 50 + ((tournamentIndex + handIndex) % 6) * 25;
  const smallBlind = bigBlind / 2;
  const villain = `demo_villain_${(tournamentIndex + handIndex) % 9}`;
  const heroChipsBefore = 3000 + ((tournamentIndex + handIndex) % 12) * 160;
  const isEarlyBustoutFinale = tournamentHandCount <= 12 && handIndex === tournamentHandCount - 1;
  const effectiveNetProfit = isEarlyBustoutFinale ? -Math.ceil(heroChipsBefore / bigBlind) : netProfit;
  const heroDecision = makeDecision(id, handIndex, tournamentIndex, effectiveNetProfit, bigBlind);
  const heroChipsAfter = Math.max(0, heroChipsBefore + Math.round(effectiveNetProfit * bigBlind));
  const sawFlop = heroDecision.sawFlop;

  const hand: Hand = {
    id,
    tournamentId: tournament.id,
    date,
    level: 1 + ((tournamentIndex + handIndex) % 12),
    smallBlind,
    bigBlind,
    ante: Math.round(bigBlind * 0.1),
    maxSeats: 9,
    activePlayers: SEAT_POSITIONS.length,
    buttonSeat: SEAT_POSITIONS.indexOf('BTN') + 1,
    boardFlop: sawFlop ? ['Qc', '7d', '2c'] : null,
    boardTurn: sawFlop && handIndex === 0 ? 'Ks' : null,
    boardRiver: sawFlop && handIndex === 1 ? '9h' : null,
    totalPot: Math.max(bigBlind * 3, Math.round(bigBlind * (6 + Math.abs(effectiveNetProfit)))) ,
    rake: 0,
    hasShowdown: heroDecision.wentToShowdown,
    isStarred: tournamentIndex % 11 === 0 && handIndex === 1,
    heroChipsBefore,
    heroChipsAfter,
    villainDeltas: [{ name: villain, net: -Math.round(effectiveNetProfit * bigBlind) }],
  };

  const players = makePlayers(
    id,
    heroDecision.position,
    villain,
    tournamentIndex,
    handIndex,
    heroChipsBefore,
    heroChipsAfter,
    bigBlind,
    effectiveNetProfit,
  );
  const sbPlayer = players.find((player) => player.position === 'SB')!;
  const bbPlayer = players.find((player) => player.position === 'BB')!;

  const actionAmount = heroDecision.action === 'raise'
    ? bigBlind * 2
    : heroDecision.action === 'call'
      ? bigBlind
      : null;

  const actions: Action[] = [
    { handId: id, street: 'preflop', playerName: sbPlayer.playerName, actionType: 'post_sb', amount: smallBlind, isAllIn: false, sequence: 1 },
    { handId: id, street: 'preflop', playerName: bbPlayer.playerName, actionType: 'post_bb', amount: bigBlind, isAllIn: false, sequence: 2 },
    { handId: id, street: 'preflop', playerName: HERO, actionType: heroDecision.action, amount: isEarlyBustoutFinale ? heroChipsBefore : actionAmount, isAllIn: isEarlyBustoutFinale, sequence: 3 },
  ];

  if (heroDecision.action === 'raise') {
    actions.push({ handId: id, street: 'preflop', playerName: villain, actionType: sawFlop ? 'call' : 'fold', amount: sawFlop ? bigBlind : null, isAllIn: false, sequence: 4 });
  }

  if (sawFlop) {
    actions.push(
      { handId: id, street: 'flop', playerName: villain, actionType: 'check', amount: null, isAllIn: false, sequence: 5 },
      { handId: id, street: 'flop', playerName: HERO, actionType: heroDecision.cbetMade ? 'bet' : 'check', amount: heroDecision.cbetMade ? bigBlind * 2 : null, isAllIn: false, sequence: 6 },
    );
  }

  return {
    hand,
    players,
    actions,
    tournament,
    heroDecision,
  };
}

function tournamentReturn(index: number): number {
  if (index % 19 === 0) return 18.5;
  if (index % 11 === 0) return 9.25;
  if (index % 4 === 0) return 3.4;
  return 0;
}

function demoHandCountForTournament(index: number): number {
  if (index % 17 === 0) return 96 + (index % 7) * 4;
  if (index % 5 === 0) return 8 + (index % 4);
  return 24 + ((index * 13) % 45);
}

function handProfitShare(tournamentProfit: number, tournamentIndex: number, handIndex: number, tournamentHandCount: number): number {
  const profile = [1.8, -1.1, 0.7, -0.5, 0.35, -0.25, 0.18, -0.12];
  const base = profile[(tournamentIndex + handIndex) % profile.length]!;
  const tournamentSignal = tournamentProfit / tournamentHandCount;
  const stagePressure = handIndex > tournamentHandCount * 0.75 ? 1.35 : 1;

  return Number((base * stagePressure + tournamentSignal).toFixed(2));
}

export function buildDemoDataset(): DemoDataset {
  const tournaments: Tournament[] = Array.from({ length: DEMO_TOURNAMENT_COUNT }, (_, index) => {
    const prize = tournamentReturn(index);
    return {
      id: demoTournamentId(index),
      name: `Demo Local MTT Session #${index + 1}`,
      category: index % 5 === 0 ? 'Bounty Builder' : 'Regular MTT',
      startDate: new Date(2026, 3, 1 + index, 20, 0, 0),
      buyIn: BUY_IN,
      fee: FEE,
      format: index % 5 === 0 ? 'PKO' : 'MTT',
      finishPosition: prize > 0 ? (index % 19 === 0 ? 2 : index % 11 === 0 ? 5 : 18) : null,
      prize,
      bounty: index % 5 === 0 && prize > 0 ? 1.5 : 0,
      currency: 'USD',
      handsPlayed: 0,
    };
  });

  const handsData = tournaments.flatMap((tournament, tournamentIndex) => {
    const profit = (tournament.prize || 0) + (tournament.bounty || 0) - BUY_IN - FEE;
    const handCount = demoHandCountForTournament(tournamentIndex);
    return Array.from({ length: handCount }, (_, handIndex) => (
      makeHandBundle(tournament, tournamentIndex, handIndex, handCount, handProfitShare(profit, tournamentIndex, handIndex, handCount))
    ));
  });

  const summaries: ParsedTournamentSummary[] = tournaments.map((tournament) => ({
    tournamentId: tournament.id,
    name: tournament.name,
    buyIn: tournament.buyIn,
    fee: tournament.fee,
    currency: tournament.currency,
    finishPosition: tournament.finishPosition,
    prize: tournament.prize,
    bounty: tournament.bounty,
    heroName: HERO,
  }));

  return { handsData, summaries };
}

export async function seedDemoDataset(onProgress?: (p: DemoSeedProgress) => void): Promise<DemoSeedResult> {
  onProgress?.({ phase: 'checking', message: 'Checking existing dataset...' });

  const [existingDemoHands, existingDemoTournaments] = await Promise.all([
    db.hands.where('id').startsWith(`${DEMO_PREFIX}-H-`).count(),
    db.tournaments.where('id').startsWith(`${DEMO_PREFIX}-T-`).count(),
  ]);

  if (existingDemoHands > 0 && existingDemoTournaments >= DEMO_TOURNAMENT_COUNT) {
    return { importedHands: 0, summariesCreated: 0, summariesUpdated: 0, alreadyLoaded: true };
  }

  // Yield to allow UI to update
  await new Promise(r => setTimeout(r, 10));

  onProgress?.({ phase: 'generating', message: 'Generating synthetic tournaments...' });
  const dataset = buildDemoDataset();

  await new Promise(r => setTimeout(r, 10));

  let importedHands = 0;
  const chunkSize = 200;

  for (let i = 0; i < dataset.handsData.length; i += chunkSize) {
    const chunk = dataset.handsData.slice(i, i + chunkSize);
    const currentCount = Math.min(dataset.handsData.length, i + chunk.length);
    const percent = Math.min(100, Math.round((currentCount / dataset.handsData.length) * 100));

    onProgress?.({
      phase: 'importing_hands',
      message: `Writing hands locally... ${currentCount.toLocaleString()} / ${dataset.handsData.length.toLocaleString()}`,
      progress: percent
    });

    // Yield before each chunk
    await new Promise(r => setTimeout(r, 25));

    importedHands += await importHands(chunk, { aggregateVillains: false });
  }

  await aggregateVillainStats(dataset.handsData);

  onProgress?.({ phase: 'importing_summaries', message: 'Finalizing tournament summaries...' });
  await new Promise(r => setTimeout(r, 10));

  const summaryResult = await importTournamentSummaries(dataset.summaries);

  onProgress?.({ phase: 'done', message: 'Demo dataset loaded successfully', progress: 100 });

  return {
    importedHands,
    summariesCreated: summaryResult.created,
    summariesUpdated: summaryResult.updated,
    alreadyLoaded: false,
  };
}
