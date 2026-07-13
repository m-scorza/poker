/**
 * Property-based PokerStars hand-history generator.
 *
 * Generates synthetic-but-legal tournament hands from a seeded PRNG: random
 * seats/stacks/blinds, a betting engine that enforces no-limit rules (min
 * raises, all-ins, uncalled-bet returns, street order), boards dealt from a
 * real 52-card deck, and a SUMMARY consistent with the action. Because the
 * engine does exact chip accounting, every generated hand carries its ground
 * truth (final stacks, pot, action list) — the fuzz suite asserts the parser
 * reproduces reality, not merely that it doesn't crash.
 *
 * Determinism: same seed → byte-identical text, so CI failures are
 * reproducible from the seed printed by the test.
 *
 * Simplifications (documented, deliberate):
 * - One winner collects the whole pot (no split pots / side-pot lines). The
 *   parser only sums `collected ... from` lines, so conservation still holds.
 * - Blinds/antes are never all-in (stacks start at 25bb+).
 * - Chat noise is benign (no colons). A chat line containing ": folds" is a
 *   known parser ambiguity — a future lane, not fuzzed here.
 */

interface ExpectedAction {
  playerName: string;
  actionType: 'post_ante' | 'post_sb' | 'post_bb' | 'fold' | 'check' | 'call' | 'bet' | 'raise';
  street: 'preflop' | 'flop' | 'turn' | 'river';
  amount: number | null;
  isAllIn: boolean;
}

interface ExpectedSeat {
  seatNumber: number;
  playerName: string;
  chipsBefore: number;
  chipsAfter: number;
}

export interface GeneratedHand {
  text: string;
  expected: {
    handId: string;
    heroName: string;
    activePlayers: number;
    smallBlind: number;
    bigBlind: number;
    ante: number;
    pot: number;
    seats: ExpectedSeat[];
    actions: ExpectedAction[];
    boardFlop: string[] | null;
    boardTurn: string | null;
    boardRiver: string | null;
    hasShowdown: boolean;
  };
}

export const FUZZ_HERO = 'fuzz_hero';

const VILLAIN_POOL = [
  'villain one',
  'a:b',
  'Kc 5h',
  'raises 10 to 20',
  'BigBlind',
  'the button',
  'nit_9000',
  'Olga-88',
  'player (1)',
  'check',
  'river.rat',
  'x',
];

const LEVELS: Array<{ roman: string; sb: number; bb: number; ante: number }> = [
  { roman: 'I', sb: 10, bb: 20, ante: 0 },
  { roman: 'II', sb: 15, bb: 30, ante: 0 },
  { roman: 'III', sb: 25, bb: 50, ante: 5 },
  { roman: 'IV', sb: 50, bb: 100, ante: 10 },
  { roman: 'V', sb: 75, bb: 150, ante: 15 },
  { roman: 'VI', sb: 100, bb: 200, ante: 25 },
];

const RANKS = '23456789TJQKA';
const SUITS = 'shdc';

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

interface EnginePlayer {
  seatNumber: number;
  name: string;
  start: number;
  stack: number;
  folded: boolean;
  foldedStreet: Street | null;
  allIn: boolean;
  streetCommitted: number;
  invested: number;
  holeCards: [string, string];
}

type Street = 'preflop' | 'flop' | 'turn' | 'river';

export function generateHand(seed: number): GeneratedHand {
  const rng = mulberry32(seed);
  const level = pick(rng, LEVELS);
  const { sb, bb, ante } = level;

  const playerCount = int(rng, 2, 9);
  const tableMax = playerCount <= 6 && rng() < 0.5 ? 6 : 9;
  const seatNumbers = shuffled(rng, Array.from({ length: tableMax }, (_, i) => i + 1)).slice(0, playerCount).sort((a, b) => a - b);
  const names = [FUZZ_HERO, ...shuffled(rng, VILLAIN_POOL)].slice(0, playerCount);
  const assignedNames = shuffled(rng, names);

  const deck = shuffled(
    rng,
    RANKS.split('').flatMap((r) => SUITS.split('').map((s) => `${r}${s}`)),
  );
  let dealt = 0;
  const draw = (): string => deck[dealt++]!;

  const players: EnginePlayer[] = seatNumbers.map((seatNumber, i) => ({
    seatNumber,
    name: assignedNames[i]!,
    start: int(rng, 25, 150) * bb,
    stack: 0,
    folded: false,
    foldedStreet: null,
    allIn: false,
    streetCommitted: 0,
    invested: 0,
    holeCards: [draw(), draw()],
  }));
  for (const p of players) p.stack = p.start;

  const buttonSeat = pick(rng, seatNumbers);
  const btnIdx = players.findIndex((p) => p.seatNumber === buttonSeat);
  // Clockwise order from the button — mirrors position.ts (sort + rotate).
  const order = [...players.slice(btnIdx), ...players.slice(0, btnIdx)];
  const isHU = playerCount === 2;
  const sbPlayer = isHU ? order[0]! : order[1]!;
  const bbPlayer = isHU ? order[1]! : order[2]!;

  const handId = `26${seed}${int(rng, 100, 999)}`;
  const tournamentId = `39${(seed % 97) + 1}${int(rng, 100, 999)}`;
  const minutes = int(rng, 0, 59);
  const dateStr = `2026/04/05 18:${String(minutes).padStart(2, '0')}:${String(int(rng, 0, 59)).padStart(2, '0')} UTC`;

  const lines: string[] = [];
  const actions: ExpectedAction[] = [];

  lines.push(
    `PokerStars Hand #${handId}: Tournament #${tournamentId}, $0.85+$0.15 USD Hold'em No Limit - Level ${level.roman} (${sb}/${bb}) - ${dateStr}`,
  );
  lines.push(`Table '${tournamentId} 1' ${tableMax}-max Seat #${buttonSeat} is the button`);
  for (const p of players) {
    lines.push(`Seat ${p.seatNumber}: ${p.name} (${p.start} in chips)`);
  }
  const freeSeats = Array.from({ length: tableMax }, (_, i) => i + 1).filter((s) => !seatNumbers.includes(s));
  if (freeSeats.length > 0 && rng() < 0.25) {
    lines.push(`Seat ${pick(rng, freeSeats)}: lurker_${seed % 100} (${int(rng, 10, 100) * bb} in chips) is sitting out`);
  }

  const commit = (p: EnginePlayer, amount: number, toStreet: boolean) => {
    p.stack -= amount;
    p.invested += amount;
    if (toStreet) p.streetCommitted += amount;
    if (p.stack === 0) p.allIn = true;
  };

  if (ante > 0) {
    for (const p of order) {
      commit(p, ante, false);
      lines.push(`${p.name}: posts the ante ${ante}`);
      actions.push({ playerName: p.name, actionType: 'post_ante', street: 'preflop', amount: ante, isAllIn: false });
    }
  }
  commit(sbPlayer, sb, true);
  lines.push(`${sbPlayer.name}: posts small blind ${sb}`);
  actions.push({ playerName: sbPlayer.name, actionType: 'post_sb', street: 'preflop', amount: sb, isAllIn: false });
  commit(bbPlayer, bb, true);
  lines.push(`${bbPlayer.name}: posts big blind ${bb}`);
  actions.push({ playerName: bbPlayer.name, actionType: 'post_bb', street: 'preflop', amount: bb, isAllIn: false });

  lines.push('*** HOLE CARDS ***');
  const hero = players.find((p) => p.name === FUZZ_HERO)!;
  lines.push(`Dealt to ${FUZZ_HERO} [${hero.holeCards[0]} ${hero.holeCards[1]}]`);
  if (rng() < 0.2) lines.push(`nit_9000 said, "gg"`);

  const unfolded = () => order.filter((p) => !p.folded);
  const canAct = () => order.filter((p) => !p.folded && !p.allIn);

  const potSize = () => order.reduce((sum, p) => sum + p.invested, 0);

  const resolveUncalled = () => {
    const inHand = order.filter((p) => p.streetCommitted > 0);
    if (inHand.length === 0) return;
    const top = inHand.reduce((a, b) => (b.streetCommitted > a.streetCommitted ? b : a));
    const maxOther = Math.max(0, ...order.filter((p) => p !== top).map((p) => p.streetCommitted));
    const refund = top.streetCommitted - maxOther;
    if (refund > 0) {
      top.stack += refund;
      top.invested -= refund;
      top.streetCommitted = maxOther;
      if (top.allIn && top.stack > 0) top.allIn = false;
      lines.push(`Uncalled bet (${refund}) returned to ${top.name}`);
    }
  };

  const chooseBetSize = (p: EnginePlayer): number => {
    const frac = pick(rng, [0.33, 0.5, 0.75, 1]);
    const target = Math.max(bb, Math.floor(potSize() * frac));
    return Math.min(p.stack, target);
  };

  const runBettingRound = (street: Street, startIdx: number, initialLevel: number): void => {
    let levelNow = initialLevel;
    let lastRaiseSize = bb;
    let raisesThisStreet = 0;

    const cyclicFrom = (idx: number): EnginePlayer[] => {
      const result: EnginePlayer[] = [];
      for (let i = 0; i < order.length; i++) {
        result.push(order[(idx + i) % order.length]!);
      }
      return result;
    };

    let queue = cyclicFrom(startIdx).filter((p) => !p.folded && !p.allIn);

    while (queue.length > 0) {
      const p = queue.shift()!;
      if (p.folded || p.allIn) continue;
      if (unfolded().length === 1) return;

      const toCall = levelNow - p.streetCommitted;
      const allInSuffix = ' and is all-in';

      if (toCall <= 0) {
        const wantsAggression = raisesThisStreet < 4 && p.stack > 0 && rng() < 0.35;
        if (!wantsAggression) {
          lines.push(`${p.name}: checks`);
          actions.push({ playerName: p.name, actionType: 'check', street, amount: null, isAllIn: false });
          continue;
        }
        if (levelNow === 0) {
          const amount = chooseBetSize(p);
          commit(p, amount, true);
          levelNow = amount;
          lastRaiseSize = Math.max(bb, amount);
          raisesThisStreet++;
          lines.push(`${p.name}: bets ${amount}${p.allIn ? allInSuffix : ''}`);
          actions.push({ playerName: p.name, actionType: 'bet', street, amount, isAllIn: p.allIn });
          queue = cyclicFrom((order.indexOf(p) + 1) % order.length).filter((q) => q !== p && !q.folded && !q.allIn);
          continue;
        }
        // Big-blind option (or matched level): raise.
        const minTo = levelNow + lastRaiseSize;
        const maxTo = p.streetCommitted + p.stack;
        const to = maxTo <= minTo ? maxTo : Math.min(maxTo, minTo + Math.floor(rng() * rng() * (maxTo - minTo)));
        const added = to - p.streetCommitted;
        const by = to - levelNow;
        commit(p, added, false);
        p.streetCommitted = to;
        lastRaiseSize = Math.max(lastRaiseSize, by);
        levelNow = to;
        raisesThisStreet++;
        lines.push(`${p.name}: raises ${by} to ${to}${p.allIn ? allInSuffix : ''}`);
        actions.push({ playerName: p.name, actionType: 'raise', street, amount: to, isAllIn: p.allIn });
        queue = cyclicFrom((order.indexOf(p) + 1) % order.length).filter((q) => q !== p && !q.folded && !q.allIn);
        continue;
      }

      const roll = rng();
      const canRaise = p.stack > toCall && raisesThisStreet < 4;
      if (roll < 0.38) {
        p.folded = true;
        p.foldedStreet = street;
        lines.push(`${p.name}: folds`);
        actions.push({ playerName: p.name, actionType: 'fold', street, amount: null, isAllIn: false });
        continue;
      }
      if (roll < 0.8 || !canRaise) {
        const amount = Math.min(toCall, p.stack);
        commit(p, amount, true);
        lines.push(`${p.name}: calls ${amount}${p.allIn ? allInSuffix : ''}`);
        actions.push({ playerName: p.name, actionType: 'call', street, amount, isAllIn: p.allIn });
        continue;
      }
      const minTo = levelNow + lastRaiseSize;
      const maxTo = p.streetCommitted + p.stack;
      const to = maxTo <= minTo ? maxTo : Math.min(maxTo, minTo + Math.floor(rng() * rng() * (maxTo - minTo)));
      const added = to - p.streetCommitted;
      const by = to - levelNow;
      commit(p, added, false);
      p.streetCommitted = to;
      lastRaiseSize = Math.max(lastRaiseSize, by);
      levelNow = to;
      raisesThisStreet++;
      lines.push(`${p.name}: raises ${by} to ${to}${p.allIn ? allInSuffix : ''}`);
      actions.push({ playerName: p.name, actionType: 'raise', street, amount: to, isAllIn: p.allIn });
      queue = cyclicFrom((order.indexOf(p) + 1) % order.length).filter((q) => q !== p && !q.folded && !q.allIn);
    }
  };

  const resetStreet = () => {
    for (const p of order) p.streetCommitted = 0;
  };

  // Preflop: first actor is after the BB (HU: the button/SB).
  runBettingRound('preflop', isHU ? 0 : 3 % order.length, bb);
  resolveUncalled();

  let boardFlop: string[] | null = null;
  let boardTurn: string | null = null;
  let boardRiver: string | null = null;

  const streets: Array<{ street: Street; deal: () => void }> = [
    {
      street: 'flop',
      deal: () => {
        boardFlop = [draw(), draw(), draw()];
        lines.push(`*** FLOP *** [${boardFlop.join(' ')}]`);
      },
    },
    {
      street: 'turn',
      deal: () => {
        boardTurn = draw();
        lines.push(`*** TURN *** [${boardFlop!.join(' ')}] [${boardTurn}]`);
      },
    },
    {
      street: 'river',
      deal: () => {
        boardRiver = draw();
        lines.push(`*** RIVER *** [${boardFlop!.join(' ')} ${boardTurn}] [${boardRiver}]`);
      },
    },
  ];

  for (const { street, deal } of streets) {
    if (unfolded().length < 2) break;
    resetStreet();
    deal();
    if (canAct().length >= 2) {
      runBettingRound(street, 1 % order.length, 0);
      resolveUncalled();
    }
  }

  const survivors = unfolded();
  const pot = potSize();
  const winner = pick(rng, survivors);
  winner.stack += pot;
  const hasShowdown = survivors.length >= 2;

  if (hasShowdown) {
    lines.push('*** SHOW DOWN ***');
    for (const p of survivors) {
      lines.push(`${p.name}: shows [${p.holeCards[0]} ${p.holeCards[1]}]`);
    }
    lines.push(`${winner.name} collected ${pot} from pot`);
  } else {
    lines.push(`${winner.name} collected ${pot} from pot`);
  }

  lines.push('*** SUMMARY ***');
  lines.push(`Total pot ${pot} | Rake 0`);
  const boardCards = [...(boardFlop ?? []), ...(boardTurn ? [boardTurn] : []), ...(boardRiver ? [boardRiver] : [])];
  if (boardCards.length > 0) lines.push(`Board [${boardCards.join(' ')}]`);

  const seatTag = (p: EnginePlayer): string => {
    if (p.seatNumber === buttonSeat) return ' (button)';
    if (p === sbPlayer && !isHU) return ' (small blind)';
    if (p === bbPlayer) return ' (big blind)';
    return '';
  };
  const FOLD_LABEL: Record<Street, string> = {
    preflop: 'before Flop',
    flop: 'on the Flop',
    turn: 'on the Turn',
    river: 'on the River',
  };
  for (const p of players) {
    if (p.folded) {
      lines.push(`Seat ${p.seatNumber}: ${p.name}${seatTag(p)} folded ${FOLD_LABEL[p.foldedStreet!]}`);
    } else if (hasShowdown) {
      const cards = `[${p.holeCards[0]} ${p.holeCards[1]}]`;
      lines.push(
        p === winner
          ? `Seat ${p.seatNumber}: ${p.name}${seatTag(p)} showed ${cards} and won (${pot})`
          : `Seat ${p.seatNumber}: ${p.name}${seatTag(p)} showed ${cards} and lost with high card Ace`,
      );
    } else {
      lines.push(`Seat ${p.seatNumber}: ${p.name}${seatTag(p)} collected (${pot})`);
    }
  }

  return {
    text: lines.join('\n'),
    expected: {
      handId,
      heroName: FUZZ_HERO,
      activePlayers: playerCount,
      smallBlind: sb,
      bigBlind: bb,
      ante,
      pot,
      seats: players.map((p) => ({
        seatNumber: p.seatNumber,
        playerName: p.name,
        chipsBefore: p.start,
        chipsAfter: p.stack,
      })),
      actions,
      boardFlop,
      boardTurn,
      boardRiver,
      hasShowdown,
    },
  };
}

export function generateFile(seed: number, handCount: number): { text: string; hands: GeneratedHand[] } {
  const rng = mulberry32(seed * 7919 + 17);
  const hands: GeneratedHand[] = [];
  for (let i = 0; i < handCount; i++) {
    hands.push(generateHand(seed * 1000 + i));
  }
  const separator = () => '\n'.repeat(int(rng, 2, 4));
  const body = hands.map((h) => h.text).join(separator());
  const text = (rng() < 0.5 ? '\uFEFF' : '') + body + '\n';
  return { text, hands };
}
