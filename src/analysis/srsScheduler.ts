import type { HeroDecision, Position, Scenario } from '../types/analysis';
import type { StrategyProfile } from '../data/strategyProfiles';
import { checkCompliance } from './rangeChecker';

/**
 * Spaced-repetition state for one *misplay pattern* (not one hand). Persisted in
 * the `srsReview` Dexie table, keyed by {@link spotKeyOf}.
 */
export interface SrsReviewRecord {
  spotKey: string;
  /** Leitner box, 1..{@link MAX_BOX}; higher = longer interval. */
  box: number;
  /** Epoch ms when this card is next due. */
  dueAt: number;
  /** Epoch ms of the most recent grade. */
  lastReviewedAt: number;
  /** Total times reviewed. */
  reps: number;
  /** Times answered wrong after having been learned. */
  lapses: number;
}

/** A recurring misplay pattern, drawn from one or more real misplayed hands. */
export interface FaultSpot {
  spotKey: string;
  scenario: Scenario;
  position: Position;
  handKey: string;
  stackBb: number;
  /** The costliest real hand that collapsed into this pattern (its face). */
  representative: HeroDecision;
  /** How many real hands share this pattern. */
  count: number;
}

const DAY_MS = 86_400_000;
/** A lapsed card returns within the same session for immediate reinforcement. */
const RELEARN_MS = 10 * 60_000;

/** Box → days until next due. Box 1 is the freshest learned state. */
export const BOX_INTERVALS_DAYS = [1, 3, 7, 16, 35];
export const MAX_BOX = BOX_INTERVALS_DAYS.length;

/** Days until next due for a (clamped) box. */
function intervalDaysForBox(box: number): number {
  const clamped = Math.min(Math.max(box, 1), MAX_BOX);
  return BOX_INTERVALS_DAYS[clamped - 1] ?? BOX_INTERVALS_DAYS[0] ?? 1;
}

/**
 * Coarse stack tier. The only stack threshold the compliance grader branches on
 * today is HU_BTN's 10bb cliff (`checkHUBtn`), so the key splits there. Bucketing
 * (rather than raw bb) keeps cards from fragmenting per-bb while still never
 * merging two decisions the grader could answer differently across the cliff.
 */
export function stackBucket(stackBb: number): 'lt10' | 'ge10' {
  return stackBb < 10 ? 'lt10' : 'ge10';
}

/**
 * Identity of a misplay *pattern*. Must include every field `checkCompliance`
 * can branch on, or a card would claim one answer for spots that actually grade
 * differently:
 *   - scenario, position, handKey: the base of every range lookup.
 *   - stackBucket: HU_BTN grades on the 10bb cliff (and future push/fold tiers).
 *   - opener: FACING_RAISE picks its reaction range by who opened
 *     (`getReactionRange`), so the same hand is a 3-bet vs one opener and a fold
 *     vs another — the one dimension that flips the *answer*.
 *
 * `icmStage` / `profile` are deliberately excluded: they only gate whether a
 * spot is a fault (pool membership), never which action is correct, so the
 * pre-filtered fault pool already accounts for them.
 */
export function spotKeyOf(d: HeroDecision): string {
  const opener = d.scenario === 'FACING_RAISE' ? (d.openerPosition ?? 'unknown') : '-';
  return `${d.scenario}|${d.position}|${d.handKey}|${stackBucket(d.stackBb)}|${opener}`;
}

/**
 * Pure Leitner transition. `correct` promotes the card one box (longer interval);
 * a miss drops it to box 1 and schedules a near-term relearn, counting a lapse
 * only if the card had already been learned.
 */
export function gradeSpot(
  spotKey: string,
  prev: SrsReviewRecord | undefined,
  correct: boolean,
  now: number,
): SrsReviewRecord {
  const reps = (prev?.reps ?? 0) + 1;
  if (correct) {
    const box = Math.min((prev?.box ?? 0) + 1, MAX_BOX);
    return {
      spotKey,
      box,
      dueAt: now + intervalDaysForBox(box) * DAY_MS,
      lastReviewedAt: now,
      reps,
      lapses: prev?.lapses ?? 0,
    };
  }
  return {
    spotKey,
    box: 1,
    dueAt: now + RELEARN_MS,
    lastReviewedAt: now,
    reps,
    lapses: (prev?.lapses ?? 0) + (prev ? 1 : 0),
  };
}

export function isDue(rec: SrsReviewRecord, now: number): boolean {
  return rec.dueAt <= now;
}

export interface SrsQueue {
  /** Cards with a record that are due, most-overdue first. */
  due: FaultSpot[];
  /** Never-reviewed cards, capped at `maxNew`. */
  fresh: FaultSpot[];
  /** `due` then `fresh` — the play order. */
  queue: FaultSpot[];
}

/** Build the review order: overdue cards first, then a capped slice of new ones. */
export function selectQueue(
  spots: FaultSpot[],
  records: Map<string, SrsReviewRecord>,
  now: number,
  maxNew: number,
): SrsQueue {
  const due: Array<{ spot: FaultSpot; dueAt: number }> = [];
  const fresh: FaultSpot[] = [];
  for (const spot of spots) {
    const rec = records.get(spot.spotKey);
    if (!rec) {
      fresh.push(spot);
    } else if (isDue(rec, now)) {
      due.push({ spot, dueAt: rec.dueAt });
    }
  }
  due.sort((a, b) => a.dueAt - b.dueAt);
  const dueSpots = due.map((d) => d.spot);
  const freshCapped = fresh.slice(0, Math.max(0, maxNew));
  return { due: dueSpots, fresh: freshCapped, queue: [...dueSpots, ...freshCapped] };
}

/**
 * Group misplayed (graded, non-compliant) decisions into recurring patterns.
 * Compliant and excluded (`checkCompliance` -> null) spots are dropped, so the
 * resulting pool already reflects the active profile and per-hand ICM stage.
 */
export function buildFaultSpots(
  decisions: HeroDecision[],
  profile: StrategyProfile,
): FaultSpot[] {
  const groups = new Map<string, FaultSpot>();
  for (const d of decisions) {
    const result = checkCompliance(d, profile);
    if (!result || result.isCompliant) continue;
    const spotKey = spotKeyOf(d);
    const existing = groups.get(spotKey);
    if (!existing) {
      groups.set(spotKey, {
        spotKey,
        scenario: d.scenario,
        position: d.position,
        handKey: d.handKey,
        stackBb: d.stackBb,
        representative: d,
        count: 1,
      });
      continue;
    }
    existing.count += 1;
    if (Math.abs(d.netProfit) > Math.abs(existing.representative.netProfit)) {
      existing.representative = d;
      existing.stackBb = d.stackBb;
    }
  }
  return [...groups.values()];
}
