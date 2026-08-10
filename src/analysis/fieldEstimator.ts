/**
 * Estimate how much of the tournament field is left, and how close hero is to
 * the money, from data a hand history alone cannot supply.
 *
 * A hand history shows at most one table. The field size comes from the
 * tournament summary (`Tournament.entrants`) and the starting stack from the
 * tournament's own earliest-level hands, which together fix the total chips in
 * play. Because chips are distributed across balanced tables, hero's table is a
 * fair sample of that distribution, so:
 *
 *     remaining players ≈ total chips ÷ mean stack at hero's table
 *
 * This is an estimator, not a count. It is deliberately weakest during late
 * registration — when `entrants` has not finished growing — and strongest late,
 * which is when ICM pressure actually matters.
 */

import type { Hand, PlayerInHand } from '../types/hand';
import type { ICMStage } from '../data/strategyProfiles';

type FieldConfidence = 'low' | 'medium' | 'high';

export interface FieldEstimateInput {
  /** Total entries from the summary. Re-entries are already counted here. */
  entrants: number;
  startingStack: number;
  /** `chipsBefore` for every player seated in the hand. */
  tableStacks: number[];
  /** Whether the starting stack came from the tournament's own level-1 hands. */
  startingStackConfirmed?: boolean;
}

export interface FieldEstimate {
  remainingPlayers: number;
  totalChips: number;
  meanTableStack: number;
  confidence: FieldConfidence;
  notes: string[];
}

export interface MoneyProximity {
  paidPlaces: number;
  remainingPlayers: number;
  /** Places still to bust before the money. Zero or less once hero is ITM. */
  placesFromMoney: number;
  inTheMoney: boolean;
  onBubble: boolean;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * The stack every player started with, taken as the most common stack seen in
 * the tournament's earliest-level hands.
 *
 * The mode is the point: at the start of a level-1 hand most players still sit
 * on exactly the starting stack, while a few have already won or lost some. An
 * average is dragged by those, and a maximum tracks whoever is winning — on the
 * fixture corpus the max reads 1910–4018 chips for tournaments that plainly
 * started everyone at 1500.
 */
export interface StartingStackEstimate {
  stack: number;
  /** False when hero's earliest hand is past level 1, so the mode may have drifted. */
  fromLevelOne: boolean;
}

export function estimateStartingStack(
  hands: ReadonlyArray<{
    hand: Pick<Hand, 'level'>;
    players: ReadonlyArray<Pick<PlayerInHand, 'chipsBefore'>>;
  }>,
): StartingStackEstimate | null {
  if (hands.length === 0) return null;
  const minLevel = Math.min(...hands.map(({ hand }) => hand.level));

  const counts = new Map<number, number>();
  for (const { hand, players } of hands) {
    if (hand.level !== minLevel) continue;
    for (const player of players) {
      if (player.chipsBefore > 0) {
        counts.set(player.chipsBefore, (counts.get(player.chipsBefore) ?? 0) + 1);
      }
    }
  }
  if (counts.size === 0) return null;

  let best = 0;
  let bestCount = 0;
  for (const [stack, count] of counts) {
    if (count > bestCount || (count === bestCount && stack < best)) {
      best = stack;
      bestCount = count;
    }
  }
  return { stack: best, fromLevelOne: minLevel === 1 };
}

export function estimateRemainingField(input: FieldEstimateInput): FieldEstimate | null {
  const seated = input.tableStacks.filter((stack) => stack > 0);
  if (input.entrants <= 0 || input.startingStack <= 0 || seated.length === 0) return null;

  const totalChips = input.entrants * input.startingStack;
  const meanTableStack = seated.reduce((sum, stack) => sum + stack, 0) / seated.length;
  if (meanTableStack <= 0) return null;

  const raw = totalChips / meanTableStack;
  const remainingPlayers = Math.round(clamp(raw, seated.length, input.entrants));

  const notes: string[] = [];

  // One table is a fair sample of the chip distribution, but a small one. The
  // share of the remaining field actually observed is what governs the error.
  const sampleFraction = seated.length / remainingPlayers;
  let confidence: FieldConfidence =
    sampleFraction >= 0.5 ? 'high' : sampleFraction >= 0.1 ? 'medium' : 'low';

  // A short-handed table is a thin sample only while players sit elsewhere.
  // Once the last table holds the whole field, this is a census, not a sample.
  if (seated.length < 4 && remainingPlayers > seated.length) {
    notes.push(`Only ${seated.length} stacks sampled`);
    confidence = 'low';
  }
  if (input.startingStackConfirmed === false) {
    notes.push('Starting stack inferred above level 1 — the chip total is a guess');
    confidence = 'low';
  }
  if (input.entrants > seated.length && raw > input.entrants * 0.9) {
    notes.push('Field still near full — late registration may not be closed');
    confidence = 'low';
  }
  if (raw > input.entrants) {
    notes.push('Mean stack below the field average — rebuys or add-ons may be in play');
  }

  return { remainingPlayers, totalChips, meanTableStack, confidence, notes };
}

/**
 * The bubble widens with the field: one place out in a 9-man sit-and-go, ten in
 * a tournament paying a hundred.
 */
function bubbleWidth(paidPlaces: number): number {
  return Math.max(1, Math.round(paidPlaces * 0.1));
}

export function estimateMoneyProximity(
  remainingPlayers: number,
  paidPlaces: number,
): MoneyProximity | null {
  if (remainingPlayers <= 0 || paidPlaces <= 0) return null;

  const placesFromMoney = remainingPlayers - paidPlaces;
  const inTheMoney = placesFromMoney <= 0;

  return {
    paidPlaces,
    remainingPlayers,
    placesFromMoney,
    inTheMoney,
    onBubble: !inTheMoney && placesFromMoney <= bubbleWidth(paidPlaces),
  };
}

/**
 * A tournament stage derived from counted players rather than the blind level.
 *
 * Returns null when the inputs cannot support a stage, so callers fall back to
 * the heuristic in `icmDetector` instead of dressing a guess as a measurement.
 */
export function stageFromField(
  proximity: MoneyProximity,
  finalTableSize: number,
): ICMStage {
  if (proximity.inTheMoney) {
    return proximity.remainingPlayers <= finalTableSize ? 'final_table' : 'itm';
  }
  if (proximity.onBubble) return 'bubble';
  if (proximity.remainingPlayers <= finalTableSize) return 'final_table';
  return proximity.placesFromMoney <= proximity.paidPlaces * 2 ? 'mid' : 'early';
}
