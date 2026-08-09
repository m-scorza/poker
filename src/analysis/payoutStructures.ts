/**
 * Learn tournament payout curves from the hero's own summary files.
 *
 * PokerStars states each cashed finish as a share of the prize pool
 * ("3: hero (Brasil), $0.75 (19.841%)"). A single summary only reveals the
 * hero's own place, but recurring structures repeat daily, so observations
 * accumulate into a curve across runnings — no external table required.
 *
 * What this module deliberately does NOT do: infer unobserved places, guess
 * how many places pay, or present a sparse curve as a complete structure.
 * Callers get the observation count and must refuse accordingly.
 */

import type { Tournament } from '../types/hand';

type PayoutConfidence = 'none' | 'low' | 'medium' | 'high';

interface PayoutCurvePoint {
  finishPosition: number;
  /** Mean observed payout share of the prize pool, in percent. */
  payoutPct: number;
  /** max − min across observations; rounding drift between runnings is normal. */
  spreadPct: number;
  observations: number;
}

export interface LearnedPayoutStructure {
  key: string;
  buyInTotal: number;
  fieldBucket: string;
  /** Tournaments contributing at least one observation to this structure. */
  tournaments: number;
  /** Observed places only, ascending. Never interpolated. */
  curve: PayoutCurvePoint[];
  confidence: PayoutConfidence;
}

type PayoutGapReason = 'no_entrants' | 'no_cash_buy_in' | 'no_payout_pct';

export interface PayoutGap {
  tournamentId: string;
  reason: PayoutGapReason;
}

/**
 * SNG payout tables are keyed to an exact seat count, so small fields stay
 * exact. Larger fields scale in tiers, so they bucket.
 */
const MAX_EXACT_FIELD = 45;

export function fieldBucket(entrants: number): string {
  if (entrants <= MAX_EXACT_FIELD) return String(entrants);
  if (entrants < 100) return '46-99';
  if (entrants < 250) return '100-249';
  if (entrants < 500) return '250-499';
  if (entrants < 1000) return '500-999';
  return '1000+';
}

export function structureKey(tournament: Tournament): string | null {
  if (tournament.entrants === undefined || tournament.entrants <= 0) return null;
  const buyInTotal = roundMoney(tournament.buyIn + tournament.fee);
  if (buyInTotal <= 0) return null;
  if (tournament.currency !== undefined && tournament.currency !== 'USD') return null;
  return `${buyInTotal.toFixed(2)}|${fieldBucket(tournament.entrants)}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function confidenceFor(tournaments: number, placesObserved: number): PayoutConfidence {
  if (tournaments === 0 || placesObserved === 0) return 'none';
  if (tournaments >= 10 && placesObserved >= 3) return 'high';
  if (tournaments >= 4 && placesObserved >= 2) return 'medium';
  return 'low';
}

/**
 * Group cashed tournaments into learned structures.
 *
 * Only tournaments that reported a payout percentage contribute; a finish
 * without one carries no information about the curve.
 */
export function learnPayoutStructures(tournaments: Tournament[]): LearnedPayoutStructure[] {
  const groups = new Map<
    string,
    { buyInTotal: number; fieldBucket: string; ids: Set<string>; byPlace: Map<number, number[]> }
  >();

  for (const tournament of tournaments) {
    const key = structureKey(tournament);
    if (key === null) continue;
    if (tournament.finishPosition === null || tournament.payoutPct === undefined) continue;

    let group = groups.get(key);
    if (!group) {
      group = {
        buyInTotal: roundMoney(tournament.buyIn + tournament.fee),
        fieldBucket: fieldBucket(tournament.entrants!),
        ids: new Set(),
        byPlace: new Map(),
      };
      groups.set(key, group);
    }

    group.ids.add(tournament.id);
    const samples = group.byPlace.get(tournament.finishPosition) ?? [];
    samples.push(tournament.payoutPct);
    group.byPlace.set(tournament.finishPosition, samples);
  }

  const structures: LearnedPayoutStructure[] = [];
  for (const [key, group] of groups) {
    const curve: PayoutCurvePoint[] = [...group.byPlace.entries()]
      .map(([finishPosition, samples]) => ({
        finishPosition,
        payoutPct: samples.reduce((sum, s) => sum + s, 0) / samples.length,
        spreadPct: Math.max(...samples) - Math.min(...samples),
        observations: samples.length,
      }))
      .sort((a, b) => a.finishPosition - b.finishPosition);

    structures.push({
      key,
      buyInTotal: group.buyInTotal,
      fieldBucket: group.fieldBucket,
      tournaments: group.ids.size,
      curve,
      confidence: confidenceFor(group.ids.size, curve.length),
    });
  }

  return structures.sort((a, b) => b.tournaments - a.tournaments);
}

/** Observed places only — returns null for anything the corpus hasn't shown yet. */
export function lookupPayoutPct(
  structure: LearnedPayoutStructure,
  finishPosition: number,
): number | null {
  const point = structure.curve.find((p) => p.finishPosition === finishPosition);
  return point ? point.payoutPct : null;
}

/**
 * The flag-it queue: tournaments we could have learned from but didn't, with
 * the reason. Busting out is not a gap — it carries no payout information by
 * definition — so only missing or unparsed data is reported here.
 */
export function findPayoutKnowledgeGaps(tournaments: Tournament[]): PayoutGap[] {
  const gaps: PayoutGap[] = [];

  for (const tournament of tournaments) {
    if (tournament.currency !== undefined && tournament.currency !== 'USD') continue;

    if (tournament.entrants === undefined || tournament.entrants <= 0) {
      gaps.push({ tournamentId: tournament.id, reason: 'no_entrants' });
      continue;
    }
    if (roundMoney(tournament.buyIn + tournament.fee) <= 0) {
      gaps.push({ tournamentId: tournament.id, reason: 'no_cash_buy_in' });
      continue;
    }
    if (tournament.finishPosition === null) continue;
    if ((tournament.prize ?? 0) <= 0) continue;
    if (tournament.payoutPct === undefined) {
      gaps.push({ tournamentId: tournament.id, reason: 'no_payout_pct' });
    }
  }

  return gaps;
}
