/**
 * Vs-3-bet defense grids (Act III-3).
 *
 * Grades hero's response after HERO OPENED and a single villain 3-bet behind
 * (no callers in between) — the spot the private vault's quiz answer keys
 * anchor. The six grids are constructed around 25 point-sample anchors; every
 * cell carries provenance so audits can distinguish gospel from inference:
 *   'anchor'       — fixed by a vault quiz answer key (CI-pinned, see
 *                    vs3betAnchors.test.ts)
 *   'kb'           — derived from docs/knowledge/strategy/03-preflop-strategy.md §5
 *   'interpolated' — near-50/50 classes; per owner ruling (plan §7 Q4) these
 *                    grade as MIXED: both the placed action and its stated
 *                    alternative are compliant.
 *
 * Approved plan: docs/plans/2026-07-12-facing-3bet-grading-proposal.md
 * Owner rulings (§7): Q1 ≤15bb premium-only, Q2 40bb boundary, Q3 blinds
 * excluded in v1, Q4 all ⚠ classes graded as mixed.
 *
 * "raise" covers both a non-all-in 4-bet and an all-in jam — sizing is not
 * graded in v1. "4-bet (bluff mix)" classes accept fold as the alternative
 * (a mixed-frequency bluff is definitionally not a pure action).
 */

import type { Position } from '../types/analysis';
import { expandPairs, expandSuitedRange } from './rangeExpansion';

type Vs3BetAction = 'fold' | 'call' | 'raise';
type Vs3BetProvenance = 'anchor' | 'kb' | 'interpolated';

export interface Vs3BetCell {
  allowed: ReadonlySet<Vs3BetAction>;
  provenance: Vs3BetProvenance;
}

export type Vs3BetGrid = ReadonlyMap<string, Vs3BetCell>;

/** Q1 (≤15bb): only folding these classes is flagged; any continue is compliant. */
export const VS3BET_PREMIUM_HANDS: ReadonlySet<string> = new Set([
  'AA', 'KK', 'QQ', 'AKs', 'AKo',
]);

/** At or below this depth hero is committed at the 3-bet stage (KB §6). */
export const VS3BET_STACK_FLOOR_BB = 15;

/** Q2: 15–40bb uses the 25bb grids, above 40bb the 50bb grids. */
const VS3BET_STACK_BOUNDARY_BB = 40;

interface Vs3BetEntry {
  hands: string[];
  actions: Vs3BetAction[];
  provenance: Vs3BetProvenance;
}

/** Later entries override earlier ones — anchors are listed last so they win. */
function buildGrid(entries: Vs3BetEntry[]): Vs3BetGrid {
  const grid = new Map<string, Vs3BetCell>();
  for (const entry of entries) {
    const cell: Vs3BetCell = {
      allowed: new Set(entry.actions),
      provenance: entry.provenance,
    };
    for (const hand of entry.hands) grid.set(hand, cell);
  }
  return grid;
}

const FOLD_ONLY_CELL: Vs3BetCell = {
  allowed: new Set<Vs3BetAction>(['fold']),
  provenance: 'kb',
};

/** Unlisted hands are pure folds ("Fold: everything else" in every grid). */
export function vs3betCell(grid: Vs3BetGrid, handKey: string): Vs3BetCell {
  return grid.get(handKey) ?? FOLD_ONLY_CELL;
}

// --- C1: EP opened, 3-bet behind, 50bb ---
const C1_EP_50BB = buildGrid([
  { hands: ['AA', 'KK', 'QQ', 'AKs', 'AKo'], actions: ['raise'], provenance: 'kb' },
  { hands: ['A5s', 'A4s'], actions: ['raise', 'fold'], provenance: 'kb' },
  {
    hands: [
      ...expandPairs('J', '2'),
      'AQs', 'AJs', 'KQs', 'QJs', 'JTs', 'T9s', '98s', '87s', '76s', '54s',
    ],
    actions: ['call'],
    provenance: 'kb',
  },
  { hands: ['AQo', 'ATs'], actions: ['fold', 'call'], provenance: 'interpolated' },
  { hands: ['55', '65s'], actions: ['call'], provenance: 'anchor' },
  { hands: ['AJo'], actions: ['fold'], provenance: 'anchor' },
]);

// --- C2: EP opened, 3-bet behind, 25bb ---
const C2_EP_25BB = buildGrid([
  { hands: ['AA', 'KK', 'QQ', 'AKs', 'AKo'], actions: ['raise'], provenance: 'kb' },
  { hands: ['JJ'], actions: ['raise', 'call'], provenance: 'interpolated' },
  {
    hands: [
      ...expandPairs('T', '2'),
      'AQs', 'AJs', 'ATs', 'A5s', 'A3s', 'A2s',
      'KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s', '65s',
    ],
    actions: ['call'],
    provenance: 'kb',
  },
  { hands: ['AQo'], actions: ['fold', 'call'], provenance: 'interpolated' },
  { hands: ['K9s'], actions: ['call'], provenance: 'anchor' },
  { hands: ['A4s'], actions: ['call', 'raise'], provenance: 'anchor' },
  { hands: ['KJo'], actions: ['fold'], provenance: 'anchor' },
]);

// --- C3: HJ/CO opened, 3-bet behind, 25bb ---
const C3_CO_25BB = buildGrid([
  { hands: [...expandPairs('A', '9'), 'AKs', 'AKo'], actions: ['raise'], provenance: 'kb' },
  { hands: ['AQs', 'AQo'], actions: ['raise', 'call'], provenance: 'interpolated' },
  {
    // AJs is not spelled out in the plan's C3 lists (AQs jams, calls start at
    // ATs); it calls here per KB §5 — the alternative (fold AJs while ATs
    // calls) is not defensible.
    hands: [
      ...expandPairs('7', '2'),
      'AJs',
      ...expandSuitedRange('A', 'T', '2', 's'),
      ...expandSuitedRange('K', 'Q', '7', 's'),
      'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s', '65s',
    ],
    actions: ['call'],
    provenance: 'kb',
  },
  { hands: ['KQo', 'KJo', 'KTo'], actions: ['fold', 'call'], provenance: 'interpolated' },
  { hands: ['88'], actions: ['raise'], provenance: 'anchor' },
  { hands: ['AJo'], actions: ['call', 'raise'], provenance: 'anchor' },
  { hands: ['K7s'], actions: ['call'], provenance: 'anchor' },
  { hands: ['A8o'], actions: ['fold'], provenance: 'anchor' },
]);

// --- C4: HJ/CO opened, 3-bet behind, 50bb ---
const C4_CO_50BB = buildGrid([
  { hands: [...expandPairs('A', 'J'), 'AKs', 'AKo'], actions: ['raise'], provenance: 'kb' },
  { hands: [...expandSuitedRange('A', '5', '2', 's')], actions: ['raise', 'fold'], provenance: 'kb' },
  {
    hands: [
      ...expandPairs('9', '2'),
      'AQs', 'ATs', 'KQs', 'KJs', 'QJs', 'JTs', 'T9s', '98s', '65s',
    ],
    actions: ['call'],
    provenance: 'kb',
  },
  { hands: ['KJo', 'AJo'], actions: ['fold', 'call'], provenance: 'interpolated' },
  { hands: ['TT'], actions: ['raise'], provenance: 'anchor' },
  { hands: ['A9o'], actions: ['raise', 'fold'], provenance: 'anchor' },
  { hands: ['AJs', '76s'], actions: ['call'], provenance: 'anchor' },
  { hands: ['KTo'], actions: ['fold'], provenance: 'anchor' },
]);

// --- C5: BTN opened, SB 3-bet, 25bb ---
const C5_BTN_25BB = buildGrid([
  { hands: ['AKs', 'AKo', 'AQo'], actions: ['raise'], provenance: 'kb' },
  // 99+ and AQs are ⚠ per plan §7 Q4 — jam or call are both compliant.
  { hands: [...expandPairs('A', '9'), 'AQs'], actions: ['raise', 'call'], provenance: 'interpolated' },
  {
    // AJs mirrors the C3 note: unlisted in the plan between AQs (jam ⚠) and
    // ATs (anchor call); it calls per KB §5.
    hands: [
      ...expandPairs('8', '2'),
      'AJs',
      ...expandSuitedRange('A', '9', '2', 's'),
      ...expandSuitedRange('K', 'Q', '6', 's'),
      'Q9s', 'QTs', 'QJs', 'J9s', 'JTs', 'T8s', 'T9s', '97s', '98s', '87s', '76s', '65s',
    ],
    actions: ['call'],
    provenance: 'kb',
  },
  { hands: ['KQo'], actions: ['call', 'fold'], provenance: 'interpolated' },
  { hands: ['JTo', 'ATo'], actions: ['fold', 'call'], provenance: 'interpolated' },
  { hands: ['ATs', 'K6s'], actions: ['call'], provenance: 'anchor' },
  { hands: ['AJo'], actions: ['raise'], provenance: 'anchor' },
  { hands: ['QTo'], actions: ['fold'], provenance: 'anchor' },
]);

// --- C6: BTN opened, SB 3-bet, 50bb ---
const C6_BTN_50BB = buildGrid([
  { hands: [...expandPairs('A', 'T'), 'AKs', 'AKo'], actions: ['raise'], provenance: 'kb' },
  { hands: ['A5s', 'A4s', 'A3s'], actions: ['raise', 'fold'], provenance: 'kb' },
  {
    // AJo mirrors the C3/C5 note: unlisted in the plan, but the KJo anchor
    // calls here and AJo dominates it.
    hands: [
      ...expandPairs('8', '2'),
      ...expandSuitedRange('A', 'Q', '6', 's'),
      'AJo', 'KQo',
      'QTs', 'QJs', 'J9s', 'JTs', 'T8s', 'T9s', '97s', '98s', '87s', '76s', '65s', '54s',
    ],
    actions: ['call'],
    provenance: 'kb',
  },
  { hands: ['AQo'], actions: ['call', 'fold'], provenance: 'interpolated' },
  { hands: ['KTs', 'KJs', 'KQs'], actions: ['call', 'fold'], provenance: 'interpolated' },
  { hands: ['A9o', 'ATo', 'QJo'], actions: ['fold', 'call'], provenance: 'interpolated' },
  { hands: ['99'], actions: ['raise'], provenance: 'anchor' },
  { hands: ['A2s'], actions: ['call', 'raise'], provenance: 'anchor' },
  { hands: ['KJo', 'J8s'], actions: ['call'], provenance: 'anchor' },
  { hands: ['A7o', 'K9o'], actions: ['fold'], provenance: 'anchor' },
]);

export type Vs3BetHeroBucket = 'EP' | 'CO' | 'BTN';

const GRIDS: Record<Vs3BetHeroBucket, { shallow: Vs3BetGrid; deep: Vs3BetGrid }> = {
  EP: { shallow: C2_EP_25BB, deep: C1_EP_50BB },
  CO: { shallow: C3_CO_25BB, deep: C4_CO_50BB },
  BTN: { shallow: C5_BTN_25BB, deep: C6_BTN_50BB },
};

/**
 * The 3-bettor's position is folded into the hero bucket (plan §2) — the quiz
 * only varies it in lockstep with hero position. Blinds return null (Q3).
 */
export function vs3betHeroBucket(position: Position): Vs3BetHeroBucket | null {
  switch (position) {
    case 'UTG':
    case 'UTG+1':
    case 'MP':
    case 'MP1':
    case 'MP2':
      return 'EP';
    case 'HJ':
    case 'CO':
      return 'CO';
    case 'BTN':
      return 'BTN';
    default:
      return null;
  }
}

/** Grid for a hero position and stack, or null when the pocket is ungraded. */
export function getVs3BetGrid(position: Position, stackBb: number): Vs3BetGrid | null {
  const bucket = vs3betHeroBucket(position);
  if (!bucket) return null;
  const grids = GRIDS[bucket];
  return stackBb <= VS3BET_STACK_BOUNDARY_BB ? grids.shallow : grids.deep;
}
