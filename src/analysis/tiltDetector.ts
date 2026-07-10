/**
 * Tilt Detector — the mental-game half of the coach loop.
 *
 * Asks one question the leak engine cannot: does the quality of your decisions
 * change *after something bad happens*? It finds trigger moments (a 20bb+ pot
 * lost, half the stack gone in one hand, a bust-out), then compares the
 * decisions made in the hands immediately after each trigger against the same
 * player's baseline decisions from calm stretches of the same sessions.
 *
 * Honesty rules, same discipline as `buildCoachsNote`:
 * - The result is a discriminated union; too little data says so explicitly.
 * - The compliance metric only counts decisions the engine actually grades
 *   (`complianceExclusionReasonForDecision` returns null) — refused scenarios
 *   cannot fake a tilt signal.
 * - Signals need both a large delta AND a minimum sample, and confidence is
 *   keyed to sample size, mirroring the leak detector's rate-over-opportunity
 *   posture. A single bad hand after a bad beat is variance, not a signature.
 */

import type { HeroDecision } from '../types/analysis';
import type { Hand } from '../types/hand';
import { SESSION_GAP_MS } from '../data/sessions';
import { complianceExclusionReasonForDecision } from './rangeChecker';

export type TiltTriggerKind = 'bust_out' | 'half_stack_loss' | 'big_loss';

export interface TiltTrigger {
  handId: string;
  kind: TiltTriggerKind;
  /** Hero's net for the trigger hand, in big blinds (negative = loss). */
  netBb: number;
  date: Date;
}

export type TiltMetric = 'compliance' | 'vpip' | 'raise_share';

export interface TiltMetricComparison {
  metric: TiltMetric;
  /** Percentage (0-100) over the post-trigger windows. */
  windowPct: number;
  /** Percentage (0-100) over the calm baseline. */
  baselinePct: number;
  /** Window minus baseline, in percentage points. */
  deltaPp: number;
  windowSample: number;
  baselineSample: number;
}

export type TiltReport =
  | {
      kind: 'insufficient_data';
      triggersFound: number;
      windowDecisions: number;
      baselineDecisions: number;
      message: string;
    }
  | {
      kind: 'steady';
      triggersFound: number;
      comparisons: TiltMetricComparison[];
      message: string;
    }
  | {
      kind: 'tilt_signature';
      triggersFound: number;
      comparisons: TiltMetricComparison[];
      /** The comparisons that crossed a signal threshold with enough sample. */
      signals: TiltMetricComparison[];
      /** The worst trigger hands (by bb lost) — the receipts. */
      receiptHandIds: string[];
      confidence: 'medium' | 'high';
      message: string;
    };

export interface TiltDetectorInput {
  hands: Hand[];
  decisions: HeroDecision[];
  /** Hands after each trigger that count as the "shaken" window. */
  windowHands?: number;
  /** Session split gap; defaults to the app-wide 4h session rule. */
  sessionGapMs?: number;
}

export const TILT_WINDOW_HANDS = 20;
const TILT_BIG_LOSS_BB = 20;
const TILT_HALF_STACK_FRACTION = 0.5;
export const TILT_MIN_TRIGGERS = 3;
export const TILT_MIN_WINDOW_DECISIONS = 25;
const TILT_MIN_BASELINE_DECISIONS = 50;
const TILT_COMPLIANCE_DROP_PP = 10;
const TILT_VPIP_RISE_PP = 12;
const TILT_RAISE_SHARE_RISE_PP = 12;
const TILT_COMPLIANCE_MIN_WINDOW_SAMPLE = 15;
const TILT_FREQUENCY_MIN_WINDOW_SAMPLE = 20;
const HIGH_CONFIDENCE_DELTA_FACTOR = 1.5;
const HIGH_CONFIDENCE_SAMPLE_FACTOR = 2;
const MAX_RECEIPTS = 3;

export function detectTilt(input: TiltDetectorInput): TiltReport {
  const {
    hands,
    decisions,
    windowHands = TILT_WINDOW_HANDS,
    sessionGapMs = SESSION_GAP_MS,
  } = input;

  const sorted = [...hands].sort((a, b) => a.date.getTime() - b.date.getTime());
  const sessions = splitSessions(sorted, sessionGapMs);

  const decisionsByHand = new Map<string, HeroDecision[]>();
  for (const decision of decisions) {
    if (decision.scenario === 'WALK') continue;
    const list = decisionsByHand.get(decision.handId);
    if (list) list.push(decision);
    else decisionsByHand.set(decision.handId, [decision]);
  }

  const triggers: TiltTrigger[] = [];
  const windowHandIds = new Set<string>();

  for (const session of sessions) {
    for (let i = 0; i < session.length; i++) {
      const hand = session[i]!;
      const trigger = classifyTrigger(hand);
      if (!trigger) continue;
      triggers.push(trigger);
      const end = Math.min(session.length, i + 1 + windowHands);
      for (let j = i + 1; j < end; j++) {
        windowHandIds.add(session[j]!.id);
      }
    }
  }

  const windowDecisions: HeroDecision[] = [];
  const baselineDecisions: HeroDecision[] = [];
  for (const session of sessions) {
    for (const hand of session) {
      const handDecisions = decisionsByHand.get(hand.id);
      if (!handDecisions) continue;
      const bucket = windowHandIds.has(hand.id) ? windowDecisions : baselineDecisions;
      bucket.push(...handDecisions);
    }
  }

  if (
    triggers.length < TILT_MIN_TRIGGERS ||
    windowDecisions.length < TILT_MIN_WINDOW_DECISIONS ||
    baselineDecisions.length < TILT_MIN_BASELINE_DECISIONS
  ) {
    return {
      kind: 'insufficient_data',
      triggersFound: triggers.length,
      windowDecisions: windowDecisions.length,
      baselineDecisions: baselineDecisions.length,
      message: insufficientMessage(triggers.length, windowDecisions.length, baselineDecisions.length),
    };
  }

  const comparisons = buildComparisons(windowDecisions, baselineDecisions);
  const signals = comparisons.filter(isSignal);

  if (signals.length === 0) {
    return {
      kind: 'steady',
      triggersFound: triggers.length,
      comparisons,
      message: `${triggers.length} rough moments found — and your decisions after them look like your decisions everywhere else. No tilt signature in this sample.`,
    };
  }

  const receiptHandIds = [...triggers]
    .sort((a, b) => a.netBb - b.netBb)
    .slice(0, MAX_RECEIPTS)
    .map((t) => t.handId);

  return {
    kind: 'tilt_signature',
    triggersFound: triggers.length,
    comparisons,
    signals,
    receiptHandIds,
    confidence: signals.every(isHighConfidenceSignal) ? 'high' : 'medium',
    message: signalMessage(signals, triggers.length),
  };
}

function splitSessions(sortedHands: Hand[], gapMs: number): Hand[][] {
  if (sortedHands.length === 0) return [];
  const sessions: Hand[][] = [];
  let current: Hand[] = [sortedHands[0]!];
  for (let i = 1; i < sortedHands.length; i++) {
    const gap = sortedHands[i]!.date.getTime() - sortedHands[i - 1]!.date.getTime();
    if (gap > gapMs) {
      sessions.push(current);
      current = [];
    }
    current.push(sortedHands[i]!);
  }
  sessions.push(current);
  return sessions;
}

function classifyTrigger(hand: Hand): TiltTrigger | null {
  if (hand.heroChipsBefore <= 0) return null;
  const net = hand.heroChipsAfter - hand.heroChipsBefore;
  if (net >= 0) return null;
  const netBb = hand.bigBlind > 0 ? net / hand.bigBlind : 0;

  let kind: TiltTriggerKind | null = null;
  if (hand.heroChipsAfter === 0) kind = 'bust_out';
  else if (net <= -TILT_HALF_STACK_FRACTION * hand.heroChipsBefore) kind = 'half_stack_loss';
  else if (hand.bigBlind > 0 && netBb <= -TILT_BIG_LOSS_BB) kind = 'big_loss';

  if (!kind) return null;
  return { handId: hand.id, kind, netBb, date: hand.date };
}

function buildComparisons(
  windowDecisions: HeroDecision[],
  baselineDecisions: HeroDecision[],
): TiltMetricComparison[] {
  const comparisons: TiltMetricComparison[] = [];

  const gradedWindow = windowDecisions.filter(isGraded);
  const gradedBaseline = baselineDecisions.filter(isGraded);
  if (gradedWindow.length > 0 && gradedBaseline.length > 0) {
    comparisons.push(
      compare('compliance', gradedWindow, gradedBaseline, (d) => d.isCompliant),
    );
  }

  comparisons.push(
    compare('vpip', windowDecisions, baselineDecisions, (d) => d.action === 'call' || d.action === 'raise'),
    compare('raise_share', windowDecisions, baselineDecisions, (d) => d.action === 'raise'),
  );

  return comparisons;
}

function compare(
  metric: TiltMetric,
  windowDecisions: HeroDecision[],
  baselineDecisions: HeroDecision[],
  predicate: (d: HeroDecision) => boolean,
): TiltMetricComparison {
  const windowPct = pct(windowDecisions, predicate);
  const baselinePct = pct(baselineDecisions, predicate);
  return {
    metric,
    windowPct,
    baselinePct,
    deltaPp: windowPct - baselinePct,
    windowSample: windowDecisions.length,
    baselineSample: baselineDecisions.length,
  };
}

function pct(decisions: HeroDecision[], predicate: (d: HeroDecision) => boolean): number {
  const hits = decisions.filter(predicate).length;
  return (hits / decisions.length) * 100;
}

function isGraded(decision: HeroDecision): boolean {
  return complianceExclusionReasonForDecision(decision) === null;
}

interface SignalRule {
  /** Signal fires when deltaPp crosses this (sign carries direction). */
  thresholdPp: number;
  minWindowSample: number;
}

const SIGNAL_RULES: Record<TiltMetric, SignalRule> = {
  compliance: { thresholdPp: -TILT_COMPLIANCE_DROP_PP, minWindowSample: TILT_COMPLIANCE_MIN_WINDOW_SAMPLE },
  vpip: { thresholdPp: TILT_VPIP_RISE_PP, minWindowSample: TILT_FREQUENCY_MIN_WINDOW_SAMPLE },
  raise_share: { thresholdPp: TILT_RAISE_SHARE_RISE_PP, minWindowSample: TILT_FREQUENCY_MIN_WINDOW_SAMPLE },
};

function isSignal(comparison: TiltMetricComparison): boolean {
  const rule = SIGNAL_RULES[comparison.metric];
  if (comparison.windowSample < rule.minWindowSample) return false;
  return rule.thresholdPp < 0
    ? comparison.deltaPp <= rule.thresholdPp
    : comparison.deltaPp >= rule.thresholdPp;
}

function isHighConfidenceSignal(comparison: TiltMetricComparison): boolean {
  const rule = SIGNAL_RULES[comparison.metric];
  return (
    Math.abs(comparison.deltaPp) >= Math.abs(rule.thresholdPp) * HIGH_CONFIDENCE_DELTA_FACTOR &&
    comparison.windowSample >= rule.minWindowSample * HIGH_CONFIDENCE_SAMPLE_FACTOR
  );
}

function insufficientMessage(triggers: number, windowN: number, baselineN: number): string {
  if (triggers < TILT_MIN_TRIGGERS) {
    return `Only ${triggers} rough moment${triggers === 1 ? '' : 's'} (20bb+ loss, half-stack loss, or bust-out) in this sample — at least ${TILT_MIN_TRIGGERS} are needed before post-trigger play can be compared honestly.`;
  }
  if (windowN < TILT_MIN_WINDOW_DECISIONS) {
    return `Only ${windowN} decisions were made in the hands right after rough moments — at least ${TILT_MIN_WINDOW_DECISIONS} are needed for a fair comparison.`;
  }
  return `Only ${baselineN} baseline decisions outside the post-trigger windows — at least ${TILT_MIN_BASELINE_DECISIONS} are needed for a fair comparison.`;
}

export const TILT_METRIC_LABELS: Record<TiltMetric, string> = {
  compliance: 'range compliance',
  vpip: 'VPIP',
  raise_share: 'raise frequency',
};

function signalMessage(signals: TiltMetricComparison[], triggers: number): string {
  const parts = signals.map((s) => {
    const direction = s.deltaPp < 0 ? 'drops' : 'rises';
    return `${TILT_METRIC_LABELS[s.metric]} ${direction} ${Math.abs(s.deltaPp).toFixed(0)}pp (${s.baselinePct.toFixed(0)}% → ${s.windowPct.toFixed(0)}%)`;
  });
  return `Across ${triggers} rough moments, your play changes in the ${TILT_WINDOW_HANDS} hands that follow: ${parts.join('; ')}.`;
}
