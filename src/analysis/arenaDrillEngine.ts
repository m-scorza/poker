/**
 * Arena drill state-machine engine.
 *
 * Pure grading + advancement logic for the six Arena drill types, extracted
 * from ArenaPage's handleAction/nextHand so the fault_fixer and rfi_master
 * fallthrough paths (which have no dedicated branch in the component) are
 * directly unit-testable without rendering React.
 *
 * These functions hold NO React state and cause NO side effects: the component
 * applies the returned result via setDrill / recorders / timers.
 *
 * The moved-out helpers (shouldCbet, isCbetActionCorrect, labelSeedAction,
 * pickRandomDecision) live in ./arena/drillLogic and are imported here so
 * each has a single definition in the tree.
 */

import type { HeroDecision } from '../types/analysis';
import type { StrategyProfile } from '../data/strategyProfiles';
import type { CurriculumSpotSeed } from '../data/curriculumSeedPacks.generated';
import type { SpotPacket } from './spotPacket';
import type { DrillType, TrainerAction } from './arena/drillLogic';
import { shouldCbet, isCbetActionCorrect, labelSeedAction, pickRandomDecision } from './arena/drillLogic';
import { checkCompliance } from './rangeChecker';

type PreflopAction = 'fold' | 'raise' | 'call' | 'check';
type FeedbackStatus = 'correct' | 'deviation' | 'review';

/** The slice of drill state the grader reads; DrillState satisfies this structurally. */
export interface DrillActionContext {
  type: DrillType | null;
  currentDecision: HeroDecision | null;
  currentPacket: SpotPacket | null;
  currentCurriculumSpot?: CurriculumSpotSeed | null;
}

export interface DrillActionEvaluation {
  userIsCorrect: boolean;
  note: string;
  feedbackStatus: FeedbackStatus;
  shouldRecordScore: boolean;
}

/**
 * Grade a trainer action against the active drill. Returns null when the action
 * is not a legal choice for this drill (the component ignores it — no score, no
 * feedback), matching the original handleAction early-return guards.
 */
export function evaluateDrillAction(
  ctx: DrillActionContext,
  action: TrainerAction,
  strategyProfile: StrategyProfile,
): DrillActionEvaluation | null {
  const { type, currentDecision, currentCurriculumSpot } = ctx;
  if (!currentDecision) return null;

  if (type === 'curriculum') {
    const accepted = currentCurriculumSpot?.acceptedActions ?? [];
    const userIsCorrect = accepted.includes(action);
    return {
      userIsCorrect,
      feedbackStatus: userIsCorrect ? 'correct' : 'deviation',
      shouldRecordScore: true,
      note: userIsCorrect
        ? `Curriculum answer: ${labelSeedAction(action)} is accepted for this practice-only seed. This is not imported-hand evidence or solver EV.`
        : `Curriculum answer: this seed accepts ${accepted.map(labelSeedAction).join(' or ')}. This is not imported-hand evidence or solver EV.`,
    };
  }

  if (type === 'cbet_clinic') {
    if (action !== 'bet' && action !== 'check') return null;
    const userIsCorrect = isCbetActionCorrect(currentDecision, action);
    const correctActionStr = shouldCbet(currentDecision) ? 'C-BET' : 'CHECK';
    return {
      userIsCorrect,
      feedbackStatus: userIsCorrect ? 'correct' : 'deviation',
      shouldRecordScore: true,
      note: userIsCorrect
        ? action === 'bet'
          ? 'Correct. This spot wants a continuation bet.'
          : 'Correct. Checking is acceptable in this spot.'
        : `Error! The postflop model prefers ${correctActionStr}.`,
    };
  }

  // Default path shared by fault_fixer, rfi_master, study_queue and spaced_review.
  if (action === 'bet' && type !== 'study_queue') return null;

  if (action === 'all_in' || action === 'bet') {
    // Review-only actions from the packet's legal menu: the Arena does not
    // grade them, so they never touch the score (honesty boundary).
    return {
      userIsCorrect: true,
      shouldRecordScore: false,
      feedbackStatus: 'review',
      note: action === 'all_in'
        ? 'Review-only all-in option: the SpotPacket legal menu captures this action, but Arena does not grade all-in ranges, solver EV, or trainer answer buckets. Use the study packet/export boundary for external review.'
        : 'Review-only bet option: the SpotPacket legal menu captures this action, but this Arena route does not grade postflop bet sizes, solver EV, or trainer answer buckets. Use the study packet/export boundary for external review.',
    };
  }

  const testDecision = { ...currentDecision, action: action as HeroDecision['action'] };
  const result = checkCompliance(testDecision, strategyProfile);

  if (type === 'study_queue' && result === null) {
    return {
      userIsCorrect: true,
      shouldRecordScore: false,
      feedbackStatus: 'review',
      note: 'Review-only Study Queue spot: no local range rule grades this exact action. Use Hand Replay or an external study packet; no score, solver EV, or trainer answer is stored.',
    };
  }

  const userIsCorrect = result?.isCompliant ?? true;

  let correctActionStr = 'the standard move';
  if (!userIsCorrect) {
    const actions: PreflopAction[] = ['fold', 'raise', 'call', 'check'];
    const found = actions.find(a => checkCompliance({ ...currentDecision, action: a }, strategyProfile)?.isCompliant);
    if (found) correctActionStr = found.toUpperCase();
  }

  const note = type === 'study_queue'
    ? (userIsCorrect
      ? 'Matches the local rule/proxy check for this imported Study Queue spot. No solver EV or trainer answer is attached.'
      : `The local rule/proxy check prefers ${correctActionStr}. Treat this as a review prompt, not solver-backed EV or trainer scoring.`)
    : (userIsCorrect
      ? 'Good. This matches the local baseline check.'
      : `The local reference check prefers ${correctActionStr}.`);

  return {
    userIsCorrect,
    feedbackStatus: userIsCorrect ? 'correct' : 'deviation',
    shouldRecordScore: true,
    note,
  };
}

/** What nextHand should do for the random drills (fault_fixer / rfi_master / cbet_clinic). */
export type NextDrillStep =
  | { kind: 'advance'; decision: HeroDecision }
  | { kind: 'exhausted' };

/**
 * Decide the next random-drill card. Returns 'exhausted' when the type-specific
 * pool is empty (the component routes that to setEmptyDrillType). Note that the
 * random drills re-draw from a fixed pool, so a non-empty pool never exhausts
 * mid-session — it re-draws (possibly repeating) instead.
 */
export function computeNextDrillStep(pool: HeroDecision[]): NextDrillStep {
  const next = pickRandomDecision(pool);
  return next ? { kind: 'advance', decision: next } : { kind: 'exhausted' };
}
