/**
 * Generates src/data/allInEquity.generated.ts — the hot-and-cold equity of each
 * of the 169 canonical starting hands versus each PUSH_RANGES open-shove range,
 * used by the FACING_ALL_IN grading engine (rangeChecker.checkFacingAllIn).
 *
 *   npx tsx scripts/generate-allin-equity.ts            # (re)generate the table
 *   npx tsx scripts/generate-allin-equity.ts --validate # cross-check the
 *                                                         # evaluator vs
 *                                                         # poker-odds-calculator
 *
 * The estimate is a seeded Monte-Carlo over hero's representative combo (suits
 * are symmetric because the shove ranges are hand-class based) versus the
 * card-removal-filtered combos of the assumed range. The PRNG seed is fixed, so
 * two runs produce byte-identical output. Precision target: ±0.5pp.
 *
 * This evaluator is script-only; it is never imported by the app (the generated
 * file is pure data). `--validate` uses poker-odds-calculator's exact mode as
 * ground truth for the hand ranker on sampled matchups.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUSH_RANGES } from '../src/data/pushFoldRanges';
import type { Position } from '../src/types/analysis';

const RANKS = '23456789TJQKA';
const OUT_PATH = join(process.cwd(), 'src', 'data', 'allInEquity.generated.ts');
const SEED = 0x5f_ac_e17a;
const SAMPLES = 150_000;

type Combo = readonly [number, number];

/** Card int in [0,52): rank * 4 + suit, rank 0..12 (2..A), suit 0..3. */
function cardRank(card: number): number {
  return card >> 2;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** All 169 canonical hand keys, higher rank first (AA, AKs, AKo, ...). */
function allHandKeys(): string[] {
  const keys: string[] = [];
  for (let hi = 12; hi >= 0; hi--) {
    for (let lo = hi; lo >= 0; lo--) {
      if (hi === lo) {
        keys.push(RANKS[hi]! + RANKS[hi]!);
      } else {
        keys.push(`${RANKS[hi]}${RANKS[lo]}s`);
        keys.push(`${RANKS[hi]}${RANKS[lo]}o`);
      }
    }
  }
  return keys;
}

/** Every concrete two-card combo for a hand key. */
function comboCards(handKey: string): Combo[] {
  const combos: Combo[] = [];
  if (handKey.length === 2) {
    const r = RANKS.indexOf(handKey[0]!);
    for (let s1 = 0; s1 < 4; s1++) {
      for (let s2 = s1 + 1; s2 < 4; s2++) {
        combos.push([r * 4 + s1, r * 4 + s2]);
      }
    }
    return combos;
  }
  const hi = RANKS.indexOf(handKey[0]!);
  const lo = RANKS.indexOf(handKey[1]!);
  const suited = handKey[2] === 's';
  for (let s1 = 0; s1 < 4; s1++) {
    for (let s2 = 0; s2 < 4; s2++) {
      if (suited && s1 !== s2) continue;
      if (!suited && s1 === s2) continue;
      combos.push([hi * 4 + s1, lo * 4 + s2]);
    }
  }
  return combos;
}

/** One representative combo for hero (suit-symmetric). */
function representativeCombo(handKey: string): Combo {
  return comboCards(handKey)[0]!;
}

/** Highest rank of a made straight in a 13-bit rank mask, or -1 (handles wheel). */
function straightHigh(mask: number): number {
  for (let hi = 12; hi >= 4; hi--) {
    let ok = true;
    for (let k = 0; k < 5; k++) {
      if (!(mask & (1 << (hi - k)))) {
        ok = false;
        break;
      }
    }
    if (ok) return hi;
  }
  if ((mask & (1 << 12)) && (mask & 1) && (mask & 2) && (mask & 4) && (mask & 8)) return 3;
  return -1;
}

function pack(cat: number, t1: number, t2: number, t3: number, t4: number, t5: number): number {
  return ((((cat * 16 + t1) * 16 + t2) * 16 + t3) * 16 + t4) * 16 + t5;
}

const RANK_COUNT = new Array(13).fill(0);

/** Rank a 7-card hand as a comparable integer (higher is stronger). */
function evaluate7(cards: number[]): number {
  const rankCount = RANK_COUNT;
  rankCount.fill(0);
  const suitCount = [0, 0, 0, 0];
  const maskBySuit = [0, 0, 0, 0];
  let rankMask = 0;
  for (let i = 0; i < 7; i++) {
    const c = cards[i]!;
    const r = c >> 2;
    const s = c & 3;
    rankCount[r]++;
    suitCount[s]++;
    maskBySuit[s] |= 1 << r;
    rankMask |= 1 << r;
  }

  let flushSuit = -1;
  for (let s = 0; s < 4; s++) if (suitCount[s] >= 5) flushSuit = s;

  if (flushSuit >= 0) {
    const sf = straightHigh(maskBySuit[flushSuit]!);
    if (sf >= 0) return pack(8, sf, 0, 0, 0, 0);
  }

  let quad = -1;
  const trips: number[] = [];
  const pairs: number[] = [];
  for (let r = 12; r >= 0; r--) {
    if (rankCount[r] === 4) quad = r;
    else if (rankCount[r] === 3) trips.push(r);
    else if (rankCount[r] === 2) pairs.push(r);
  }

  const topRanks = (exclude: number[], count: number): number[] => {
    const out: number[] = [];
    for (let r = 12; r >= 0 && out.length < count; r--) {
      if (rankCount[r]! > 0 && !exclude.includes(r)) out.push(r);
    }
    return out;
  };

  if (quad >= 0) {
    const [k = 0] = topRanks([quad], 1);
    return pack(7, quad, k, 0, 0, 0);
  }

  if (trips.length >= 1 && (trips.length >= 2 || pairs.length >= 1)) {
    const t = trips[0]!;
    const p = trips.length >= 2 ? trips[1]! : pairs[0]!;
    return pack(6, t, p, 0, 0, 0);
  }

  if (flushSuit >= 0) {
    const fr: number[] = [];
    for (let r = 12; r >= 0 && fr.length < 5; r--) {
      if (maskBySuit[flushSuit]! & (1 << r)) fr.push(r);
    }
    return pack(5, fr[0]!, fr[1]!, fr[2]!, fr[3]!, fr[4]!);
  }

  const straight = straightHigh(rankMask);
  if (straight >= 0) return pack(4, straight, 0, 0, 0, 0);

  if (trips.length >= 1) {
    const t = trips[0]!;
    const [k1 = 0, k2 = 0] = topRanks([t], 2);
    return pack(3, t, k1, k2, 0, 0);
  }

  if (pairs.length >= 2) {
    const [p1, p2] = pairs;
    const [k = 0] = topRanks([p1!, p2!], 1);
    return pack(2, p1!, p2!, k, 0, 0);
  }

  if (pairs.length === 1) {
    const p = pairs[0]!;
    const [k1 = 0, k2 = 0, k3 = 0] = topRanks([p], 3);
    return pack(1, p, k1, k2, k3, 0);
  }

  const hc = topRanks([], 5);
  return pack(0, hc[0]!, hc[1]!, hc[2]!, hc[3]!, hc[4]!);
}

/** Monte-Carlo equity of hero's combo versus a list of villain combos. */
function equityVsRange(hero: Combo, villainCombos: Combo[], rng: () => number, samples: number): number {
  const valid = villainCombos.filter((c) => c[0] !== hero[0] && c[1] !== hero[0] && c[0] !== hero[1] && c[1] !== hero[1]);
  if (valid.length === 0) return 0;

  const used = new Uint8Array(52);
  const heroHand = [hero[0], hero[1], 0, 0, 0, 0, 0];
  const villHand = [0, 0, 0, 0, 0, 0, 0];
  let score = 0;
  for (let n = 0; n < samples; n++) {
    const villain = valid[(rng() * valid.length) | 0]!;
    used[hero[0]] = 1;
    used[hero[1]] = 1;
    used[villain[0]] = 1;
    used[villain[1]] = 1;
    villHand[0] = villain[0];
    villHand[1] = villain[1];
    let dealt = 0;
    while (dealt < 5) {
      const c = (rng() * 52) | 0;
      if (used[c]) continue;
      used[c] = 1;
      heroHand[2 + dealt] = c;
      villHand[2 + dealt] = c;
      dealt++;
    }
    const heroScore = evaluate7(heroHand);
    const villScore = evaluate7(villHand);
    if (heroScore > villScore) score += 2;
    else if (heroScore === villScore) score += 1;
    for (let i = 2; i < 7; i++) used[heroHand[i]!] = 0;
    used[hero[0]] = 0;
    used[hero[1]] = 0;
    used[villain[0]] = 0;
    used[villain[1]] = 0;
  }
  return (score / (samples * 2)) * 100;
}

/** Distinct assumed shove ranges, sharing computation across aliased positions. */
function distinctRanges(): { positions: Position[]; combos: Combo[] }[] {
  const groups = new Map<string, { positions: Position[]; combos: Combo[] }>();
  for (const position of Object.keys(PUSH_RANGES) as Position[]) {
    const range = PUSH_RANGES[position];
    if (!range) continue;
    const signature = [...range].sort().join(',');
    const existing = groups.get(signature);
    if (existing) {
      existing.positions.push(position);
      continue;
    }
    const combos = [...range].flatMap((handKey) => comboCards(handKey));
    groups.set(signature, { positions: [position], combos });
  }
  return [...groups.values()];
}

function generate(): void {
  const rng = mulberry32(SEED);
  const keys = allHandKeys();
  const groups = distinctRanges();
  const table: Record<string, Partial<Record<Position, number>>> = {};

  for (const handKey of keys) {
    const hero = representativeCombo(handKey);
    const row: Partial<Record<Position, number>> = {};
    for (const group of groups) {
      const equity = equityVsRange(hero, group.combos, rng, SAMPLES);
      const rounded = Math.round(equity * 10) / 10;
      for (const position of group.positions) row[position] = rounded;
    }
    table[handKey] = row;
  }

  const positionsOrder = Object.keys(PUSH_RANGES) as Position[];
  const lines: string[] = [];
  lines.push('// Generated by scripts/generate-allin-equity.ts. Do not edit by hand.');
  lines.push('//');
  lines.push('// Hot-and-cold equity (%) of each canonical starting hand versus the');
  lines.push('// assumed open-shove range for the shover position (PUSH_RANGES, 10bb).');
  lines.push(`// Seeded Monte-Carlo, ${SAMPLES.toLocaleString('en-US')} samples/cell, seed 0x${SEED.toString(16)}.`);
  lines.push('');
  lines.push("import type { Position } from '../types/analysis';");
  lines.push('');
  lines.push('export const ALL_IN_EQUITY: Record<string, Partial<Record<Position, number>>> = {');
  for (const handKey of keys) {
    const row = table[handKey]!;
    const cells = positionsOrder
      .filter((p) => row[p] !== undefined)
      .map((p) => `'${p}': ${row[p]!.toFixed(1)}`)
      .join(', ');
    lines.push(`  '${handKey}': { ${cells} },`);
  }
  lines.push('};');
  lines.push('');

  writeFileSync(OUT_PATH, lines.join('\n'), 'utf-8');
  process.stdout.write(`Wrote ${keys.length} hands x ${groups.length} distinct ranges to ${OUT_PATH}\n`);
}

async function validate(): Promise<void> {
  const { CardGroup, OddsCalculator } = await import('poker-odds-calculator');
  const suitChar = ['c', 'd', 'h', 's'];
  const cardStr = (card: number): string => `${RANKS[cardRank(card)]}${suitChar[card & 3]}`;

  const rng = mulberry32(0x1234);
  const keys = allHandKeys();
  let maxDiff = 0;
  let checks = 0;
  for (let i = 0; i < 30; i++) {
    const heroKey = keys[(rng() * keys.length) | 0]!;
    const villKey = keys[(rng() * keys.length) | 0]!;
    const heroCombos = comboCards(heroKey);
    const villCombos = comboCards(villKey);
    const hero = heroCombos[(rng() * heroCombos.length) | 0]!;
    const villain = villCombos.find((c) => !hero.includes(c[0]) && !hero.includes(c[1]));
    if (!villain) continue;

    let heroWins = 0;
    let ties = 0;
    let total = 0;
    const dead = new Set([hero[0], hero[1], villain[0], villain[1]]);
    const deck = Array.from({ length: 52 }, (_, k) => k).filter((k) => !dead.has(k));
    for (let a = 0; a < deck.length; a++)
      for (let b = a + 1; b < deck.length; b++)
        for (let c = b + 1; c < deck.length; c++)
          for (let d = c + 1; d < deck.length; d++)
            for (let e = d + 1; e < deck.length; e++) {
              const board = [deck[a]!, deck[b]!, deck[c]!, deck[d]!, deck[e]!];
              const hs = evaluate7([hero[0], hero[1], ...board]);
              const vs = evaluate7([villain[0], villain[1], ...board]);
              if (hs > vs) heroWins++;
              else if (hs === vs) ties++;
              total++;
            }
    const mine = ((heroWins + ties / 2) / total) * 100;

    const heroGroup = CardGroup.fromString(`${cardStr(hero[0])}${cardStr(hero[1])}`);
    const villGroup = CardGroup.fromString(`${cardStr(villain[0])}${cardStr(villain[1])}`);
    const board = CardGroup.fromString('');
    const result = OddsCalculator.calculate([heroGroup, villGroup], board);
    // getEquity() is wins only; add half the split-pot share to match our
    // tie-as-half equity convention (chops are common in shared-rank spots).
    const ref = result.equities[0]!.getEquity() + result.equities[0]!.getTiePercentage() / 2;
    const diff = Math.abs(mine - ref);
    maxDiff = Math.max(maxDiff, diff);
    checks++;
    process.stdout.write(
      `${heroKey} vs ${villKey}: mine=${mine.toFixed(2)} ref=${ref.toFixed(2)} diff=${diff.toFixed(2)}\n`,
    );
  }
  process.stdout.write(`\n${checks} checks, max diff ${maxDiff.toFixed(2)}pp\n`);
  if (maxDiff > 1) {
    process.stderr.write('Evaluator disagrees with poker-odds-calculator by >1pp — aborting.\n');
    process.exit(1);
  }
}

if (process.argv.includes('--validate')) {
  void validate();
} else {
  generate();
}
