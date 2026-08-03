import { aggregateVillainStats, importHands, importTournamentSummaries, db } from './store';
import { batchCheckCompliance } from '../analysis/rangeChecker';
import type { Action, Hand, PlayerInHand, Tournament } from '../types/hand';
import type { HeroDecision, Position, Scenario } from '../types/analysis';
import type { ParsedTournamentSummary } from '../parser/tournamentSummary';
import { DEMO_VILLAINS } from './demoVillains';
import { DEFAULT_HERO_NAME } from './localStorage';

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

type DemoSeedPhase = 'checking' | 'generating' | 'importing_hands' | 'importing_summaries' | 'done';

export interface DemoSeedProgress {
  phase: DemoSeedPhase;
  message: string;
  progress?: number;
}

const DEMO_PREFIX = 'DEMO';
export const DEMO_TOURNAMENT_COUNT = 250;
const HERO = DEFAULT_HERO_NAME;
const BUY_IN = 1;
const FEE = 0.1;
const SEAT_POSITIONS: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
/** Preflop action order for the 6-handed demo table. An opener has to act before hero. */
const PREFLOP_ORDER: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

// --- Deterministic RNG ---
class RNG {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]!; }
  randomInRange(min: number, max: number): number { return min + this.next() * (max - min); }
}

// --- Demo Manifest ---
export const DEMO_MANIFEST = {
  version: '2.0.0',
  description: 'Realistic synthetic poker world with archetypes and leaks',
  archetypesIncluded: DEMO_VILLAINS.map(v => v.archetype),
  intendedHeroLeaks: ['LOW_3BET', 'PASSIVE_STEALING', 'BB_OVERFOLD', 'OPEN_LIMPING'],
  intendedVillainLeaks: ['FISH_OVERCALLS', 'NIT_OVERFOLDS', 'MANIAC_OVERBLUFFS'],
  villainCount: DEMO_VILLAINS.length,
};

// --- Hero Profile (Intentional Leaks) ---
const HERO_PROFILE = {
  threeBetFreq: 0.04,        // Too low (Target 7-10%)
  btnStealFreq: 0.35,        // Too passive (Target 45%+)
  bbFoldVsRaise: 0.75,       // Too tight (Target 60%)
  openLimpFreq: 0.05,        // Bad habit (Target 0%)
  missedCbetFreq: 0.20,      // Missed HU c-bets (Target 0% in Game Plan)
};

function demoTournamentId(index: number): string {
  return `${DEMO_PREFIX}-T-${String(index + 1).padStart(3, '0')}`;
}

function demoHandId(tournamentIndex: number, handIndex: number): string {
  return `${DEMO_PREFIX}-H-${String(tournamentIndex + 1).padStart(3, '0')}-${handIndex + 1}`;
}

function selectHandKey(rng: RNG): string {
  const hands = [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'AKo', 'AQo', 'AJo', 'ATo', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s', '65s', '54s',
    'KQo', 'KJo', 'KTo', 'QJo', 'QTo', 'JTo', '72o', 'T2o', 'J5o', 'Q6o'
  ];
  return rng.pick(hands);
}

function makeDecision(
  handId: string,
  _handIndex: number,
  _tournamentIndex: number,
  netProfitBb: number,
  bigBlind: number,
  scenario: Scenario,
  position: Position,
  handKey: string,
  openerPosition: Position | null,
  rng: RNG
): HeroDecision {
  const h = HERO_PROFILE;
  let action: HeroDecision['action'] = 'fold';

  // Which action hero takes is simulated from HERO_PROFILE's deliberate leak
  // frequencies. Whether that action is a deviation is never decided here — the
  // grading engine rules on it below, exactly as it does for imported hands.
  if (scenario === 'RFI' || scenario === 'BLIND_WAR') {
    const isStrong = ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AKo'].includes(handKey);
    const isMedium = ['99', '88', 'AJs', 'ATs', 'KQs', 'AQo', '77', '66'].includes(handKey);
    const isStealSpot = ['BTN', 'CO', 'SB'].includes(position);

    if (isStrong || isMedium) {
      action = 'raise';
    } else if (isStealSpot && rng.next() < h.btnStealFreq) {
      action = 'raise';
    } else if (isStealSpot && rng.next() < 0.1) {
      // Intentional Leak: Passive stealing
      action = 'fold';
    } else if (rng.next() < h.openLimpFreq) {
      // Intentional Leak: Open limping
      action = 'call';
    }
  } else if (scenario === 'FACING_RAISE') {
    const isStrong = ['AA', 'KK', 'QQ', 'AKs'].includes(handKey);
    if (isStrong) {
      if (rng.next() < h.threeBetFreq) {
        action = 'raise';
      } else {
        action = 'call'; // Passive 3-betting leak
      }
    } else if (rng.next() < 0.15) {
      action = 'call'; // Cold call leak
    }
  } else if (scenario === 'BB_VS_RAISE') {
    if (rng.next() < h.bbFoldVsRaise) {
      action = 'fold';
    } else {
      action = 'call';
    }
  }

  const sawFlop = action !== 'fold'; // In these scenarios, check is not possible yet
  const wasPreFlopRaiser = action === 'raise';
  const cbetOpportunity = wasPreFlopRaiser && sawFlop;

  // Intentional Leak: Missed HU c-bets
  const cbetMade = cbetOpportunity && rng.next() > h.missedCbetFreq;

  return {
    handId,
    position,
    handKey,
    stackBb: Number((18 + rng.next() * 40).toFixed(1)),
    scenario,
    action,
    openerPosition,
    // Seeded exactly as the parser seeds an imported decision
    // (scenarioDetector.ts): the engine overwrites these when it can grade the
    // spot, and leaves them untouched when it refuses.
    isCompliant: false,
    deviationType: null,
    sawFlop,
    wasPreFlopRaiser,
    cbetOpportunity,
    cbetMade,
    cbetHU: cbetOpportunity,
    doubleBarrelOpportunity: cbetMade && rng.next() < 0.3,
    doubleBarrelMade: cbetMade && rng.next() < 0.15,
    wentToShowdown: sawFlop && rng.next() < 0.3,
    wonAtShowdown: sawFlop && netProfitBb > 0,
    wonAmount: Math.max(0, Math.round(140 + netProfitBb * 40)),
    netProfit: Math.round(netProfitBb * bigBlind),
  };
}

function makePlayers(
  handId: string,
  heroPosition: Position,
  heroChipsBefore: number,
  heroChipsAfter: number,
  bigBlind: number,
  netProfit: number,
  rng: RNG
): PlayerInHand[] {
  // Select a subset of demo villains for this hand
  const currentVillains = [...DEMO_VILLAINS];
  const shuffled = currentVillains.sort(() => rng.next() - 0.5);

  return SEAT_POSITIONS.map((position, index) => {
    const seatNumber = index + 1;
    const isHero = position === heroPosition;
    const villain = shuffled[index]!;
    const playerName = isHero ? HERO : villain.name;

    return {
      handId,
      seatNumber,
      playerName,
      chipsBefore: isHero ? heroChipsBefore : 2800 + seatNumber * 120 + Math.floor(rng.next() * 500),
      chipsAfter: isHero
        ? heroChipsAfter
        : 2800 + seatNumber * 120 + Math.floor(rng.next() * 500) - (isHero ? 0 : Math.round(netProfit * bigBlind / 5)), // Approximate
      position,
      isHero,
      holeCards: isHero ? ['Ah', 'Kh'] : (rng.next() < 0.1 ? ['Qs', 'Qd'] : null),
    };
  });
}

function makeHandBundle(tournament: Tournament, tournamentIndex: number, handIndex: number, tournamentHandCount: number, netProfit: number, rng: RNG) {
  const id = demoHandId(tournamentIndex, handIndex);
  const date = new Date((tournament.startDate ?? new Date()).getTime() + handIndex * 8 * 60 * 1000);
  const bigBlind = 50 + ((tournamentIndex + handIndex) % 12) * 25;
  const smallBlind = bigBlind / 2;

  const heroPosition = rng.pick(SEAT_POSITIONS);
  const handKey = selectHandKey(rng);

  // Only seats that act before hero can have opened. Without this the generator
  // invents impossible spots (an SB open with CO still to act) that the engine
  // then refuses for a reason that reads like a coverage gap.
  const earlierSeats: Position[] = PREFLOP_ORDER.slice(
    0,
    PREFLOP_ORDER.indexOf(heroPosition),
  ).filter(p => p !== 'BB');

  // Scenarios. Folded to the small blind is a blind war, not an RFI — the same
  // call detectScenario makes for an imported hand.
  let scenario: Scenario = 'RFI';
  if (heroPosition === 'BB') scenario = 'BB_VS_RAISE';
  else if (earlierSeats.length > 0 && rng.next() < 0.3) scenario = 'FACING_RAISE';
  else if (heroPosition === 'SB') scenario = 'BLIND_WAR';

  const heroChipsBefore = Math.round(3000 + rng.next() * 5000);
  const isEarlyBustoutFinale = tournamentHandCount <= 12 && handIndex === tournamentHandCount - 1;
  const effectiveNetProfit = isEarlyBustoutFinale ? -Math.ceil(heroChipsBefore / bigBlind) : netProfit;
  const heroChipsAfter = Math.max(0, heroChipsBefore + Math.round(effectiveNetProfit * bigBlind));

  // Players and the opener are resolved before the decision so the decision can
  // carry a real openerPosition — without it every facing-raise spot is refused
  // for "unknown opener", blaming a parser that was never involved.
  const players = makePlayers(
    id,
    heroPosition,
    heroChipsBefore,
    heroChipsAfter,
    bigBlind,
    effectiveNetProfit,
    rng
  );

  const opener =
    scenario === 'FACING_RAISE' || scenario === 'BB_VS_RAISE'
      ? rng.pick(players.filter(p => earlierSeats.includes(p.position)))
      : null;

  const heroDecision = makeDecision(id, handIndex, tournamentIndex, effectiveNetProfit, bigBlind, scenario, heroPosition, handKey, opener?.position ?? null, rng);
  const sawFlop = heroDecision.sawFlop;

  const hand: Hand = {
    id,
    tournamentId: tournament.id,
    date,
    level: 1 + Math.floor(handIndex / 10),
    smallBlind,
    bigBlind,
    ante: Math.round(bigBlind * 0.1),
    maxSeats: 9,
    activePlayers: SEAT_POSITIONS.length,
    buttonSeat: SEAT_POSITIONS.indexOf('BTN') + 1,
    boardFlop: sawFlop ? ['Qc', '7d', '2c'] : null,
    boardTurn: sawFlop && rng.next() < 0.5 ? 'Ks' : null,
    boardRiver: sawFlop && rng.next() < 0.3 ? '9h' : null,
    totalPot: Math.max(bigBlind * 3, Math.round(bigBlind * (6 + Math.abs(effectiveNetProfit)))) ,
    rake: 0,
    hasShowdown: heroDecision.wentToShowdown,
    isStarred: rng.next() < 0.05,
    heroChipsBefore,
    heroChipsAfter,
    villainDeltas: [],
  };

  // Update villain deltas and identify main villain
  const actionAmount = heroDecision.action === 'raise'
    ? bigBlind * 2.5
    : heroDecision.action === 'call'
      ? bigBlind
      : 0;

  const actions: Action[] = [
    { handId: id, street: 'preflop', playerName: players.find(p => p.position === 'SB')!.playerName, actionType: 'post_sb', amount: smallBlind, isAllIn: false, sequence: 1 },
    { handId: id, street: 'preflop', playerName: players.find(p => p.position === 'BB')!.playerName, actionType: 'post_bb', amount: bigBlind, isAllIn: false, sequence: 2 },
  ];

  let currentSeq = 3;

  // Add scenario-based actions
  if (opener) {
    actions.push({ handId: id, street: 'preflop', playerName: opener.playerName, actionType: 'raise', amount: bigBlind * 2.2, isAllIn: false, sequence: currentSeq++ });
  }

  actions.push({ handId: id, street: 'preflop', playerName: HERO, actionType: heroDecision.action, amount: isEarlyBustoutFinale ? heroChipsBefore : actionAmount, isAllIn: isEarlyBustoutFinale, sequence: currentSeq++ });

  if (heroDecision.action === 'raise' && (scenario === 'RFI' || scenario === 'BLIND_WAR')) {
    const callerOptions = players.filter(p => !p.isHero);
    if (callerOptions.length > 0) {
      const caller = rng.pick(callerOptions);
      actions.push({ handId: id, street: 'preflop', playerName: caller.playerName, actionType: sawFlop ? 'call' : 'fold', amount: sawFlop ? bigBlind * 2.5 : null, isAllIn: false, sequence: currentSeq++ });
      hand.villainDeltas.push({ name: caller.playerName, net: -Math.round(effectiveNetProfit * bigBlind) });
    }
  }

  if (sawFlop) {
    actions.push(
      { handId: id, street: 'flop', playerName: HERO, actionType: heroDecision.cbetMade ? 'bet' : 'check', amount: heroDecision.cbetMade ? bigBlind * 3 : null, isAllIn: false, sequence: currentSeq++ },
    );
  }

  // Grade through the production path (workerProcessor.ts does exactly this for
  // imported hands), so a demo verdict is never one the engine wouldn't reach.
  const [gradedDecision] = batchCheckCompliance([heroDecision]);

  return {
    hand,
    players,
    actions,
    tournament,
    heroDecision: gradedDecision!,
  };
}

function tournamentReturn(_index: number, rng: RNG): number {
  const r = rng.next();
  if (r < 0.05) return 25 + rng.next() * 50; // Big win
  if (r < 0.15) return 10 + rng.next() * 10; // Medium win
  if (r < 0.3) return 3 + rng.next() * 5;    // Min cash
  return 0;
}

function demoHandCountForTournament(_index: number, rng: RNG): number {
  const r = rng.next();
  if (r < 0.2) return 8 + Math.floor(rng.next() * 10);  // Early bust
  if (r < 0.7) return 25 + Math.floor(rng.next() * 30); // Mid run
  return 80 + Math.floor(rng.next() * 100);            // Deep run
}

function handProfitShare(tournamentProfit: number, tournamentIndex: number, handIndex: number, tournamentHandCount: number): number {
  const profile = [1.8, -1.1, 0.7, -0.5, 0.35, -0.25, 0.18, -0.12];
  const base = profile[(tournamentIndex + handIndex) % profile.length]!;
  const tournamentSignal = tournamentProfit / tournamentHandCount;
  const stagePressure = handIndex > tournamentHandCount * 0.75 ? 1.5 : 1;

  return Number((base * stagePressure + tournamentSignal).toFixed(2));
}

export function buildDemoDataset(): DemoDataset {
  const internalRng = new RNG(1337); // Dedicated RNG for generation

  const tournaments: Tournament[] = Array.from({ length: DEMO_TOURNAMENT_COUNT }, (_, index) => {
    const prize = tournamentReturn(index, internalRng);
    return {
      id: demoTournamentId(index),
      name: `Demo Local MTT Session #${index + 1}`,
      category: index % 5 === 0 ? 'Bounty Builder' : 'Regular MTT',
      startDate: new Date(2026, 3, 1 + index, 20, 0, 0),
      buyIn: BUY_IN,
      fee: FEE,
      format: index % 5 === 0 ? 'PKO' : 'MTT',
      finishPosition: prize > 0 ? Math.max(1, 20 - Math.floor(prize)) : null,
      prize,
      bounty: index % 5 === 0 && prize > 0 ? prize * 0.2 : 0,
      currency: 'USD',
      handsPlayed: 0,
    };
  });

  const handsData = tournaments.flatMap((tournament, tournamentIndex) => {
    const profit = (tournament.prize || 0) + (tournament.bounty || 0) - BUY_IN - FEE;
    const handCount = demoHandCountForTournament(tournamentIndex, internalRng);
    return Array.from({ length: handCount }, (_, handIndex) => (
      makeHandBundle(tournament, tournamentIndex, handIndex, handCount, handProfitShare(profit, tournamentIndex, handIndex, handCount), internalRng)
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

async function clearExistingDemoDataset(dataset: DemoDataset): Promise<void> {
  const demoVillainNames = [...new Set(dataset.handsData.flatMap((entry) => (
    entry.players.filter((player) => !player.isHero).map((player) => player.playerName)
  )))];

  await db.transaction(
    'rw',
    [db.hands, db.players, db.actions, db.heroDecisions, db.tournaments, db.villains],
    async () => {
      await Promise.all([
        db.hands.where('id').startsWith(`${DEMO_PREFIX}-H-`).delete(),
        db.players.where('handId').startsWith(`${DEMO_PREFIX}-H-`).delete(),
        db.actions.where('handId').startsWith(`${DEMO_PREFIX}-H-`).delete(),
        db.heroDecisions.where('handId').startsWith(`${DEMO_PREFIX}-H-`).delete(),
        db.tournaments.where('id').startsWith(`${DEMO_PREFIX}-T-`).delete(),
        db.villains.bulkDelete(demoVillainNames),
      ]);
    },
  );
}

export async function seedDemoDataset(onProgress?: (p: DemoSeedProgress) => void): Promise<DemoSeedResult> {
  onProgress?.({ phase: 'checking', message: 'Checking existing dataset...' });

  const [existingDemoHands, existingDemoTournaments] = await Promise.all([
    db.hands.where('id').startsWith(`${DEMO_PREFIX}-H-`).count(),
    db.tournaments.where('id').startsWith(`${DEMO_PREFIX}-T-`).count(),
  ]);

  // Build first so the already-loaded gate compares against the current deterministic
  // manifest, not merely "some prior demo with 250 tournaments". Without this,
  // older 10,716-hand Demo V1 installs skip Demo V2 entirely and the UI appears
  // barely changed after clicking the demo button.
  const dataset = buildDemoDataset();

  if (existingDemoHands === dataset.handsData.length && existingDemoTournaments >= DEMO_TOURNAMENT_COUNT) {
    return { importedHands: 0, summariesCreated: 0, summariesUpdated: 0, alreadyLoaded: true };
  }

  if (existingDemoHands > 0 || existingDemoTournaments > 0) {
    onProgress?.({ phase: 'checking', message: 'Replacing older demo dataset...' });
    await clearExistingDemoDataset(dataset);
  }

  // Yield to allow UI to update
  await new Promise(r => setTimeout(r, 10));

  onProgress?.({ phase: 'generating', message: 'Generating synthetic world...' });

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
