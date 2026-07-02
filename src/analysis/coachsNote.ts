/**
 * Coach's Note — the atomic "what should I study right now, and why?" answer.
 *
 * Composes the (now-correct) leak/study engine into a single focused note:
 * the top leak, the hands that evidence it, and a drill. It deliberately
 * operates on the current dataset — there is no week/date windowing yet (a
 * trend arrow over a per-session series would be a fabricated signal; that's a
 * v2 once real week-bucketing exists).
 *
 * The result is a discriminated union, not a struct of maybe-null fields,
 * because the honest states are the spec: too little data to say anything, a
 * genuinely clean sample, or a focus leak (whose receipts may legitimately be
 * empty for a frequency-only leak — in which case we say so rather than invent
 * a decisive hand).
 */

import type { HeroDecision } from '../types/analysis';
import type { Hand } from '../types/hand';
import type { Leak } from './leakDetector';
import type { SpotPacket } from './spotPacket';
import { buildStudyQueue, type StudyQueueEvidence, type StudyQueueItem } from './studyPlan';
import { selectProofHands, type ProofHandReason } from './proofHandSelector';

export interface ReceiptHand {
  handId: string;
  /** Why this hand was surfaced (empty for deviation-sourced, leak-specific hands). */
  reasons: ProofHandReason[];
}

export interface CoachFocus {
  leakTitle: string;
  explanation: string;
  severity: StudyQueueItem['severity'];
  confidence: StudyQueueItem['confidence'];
  estimatedBbLoss: number | null;
  evidence: StudyQueueEvidence;
  cta: string;
}

export interface CoachStudyPacketFocus {
  packet: SpotPacket;
  srsStatus: string;
  /** Ordered hand IDs for a multi-packet local Arena drill session. */
  arenaSessionHandIds?: string[];
  /** Ordered packet IDs matching `arenaSessionHandIds`; advisory route metadata only. */
  arenaSessionPacketIds?: string[];
}

export type CoachsNote =
  | { kind: 'insufficient_data'; handsAnalyzed: number; message: string }
  | { kind: 'all_clear'; handsAnalyzed: number; message: string }
  | {
      kind: 'focus';
      handsAnalyzed: number;
      focus: CoachFocus;
      studyPacketFocus?: CoachStudyPacketFocus;
      receipts: ReceiptHand[];
      /** True when no single losing hand is decisive (a frequency-only leak). */
      noDecisiveHand: boolean;
      drillCta: string;
    };

export interface CoachsNoteInput {
  leaks: Leak[];
  decisions: HeroDecision[];
  hands: Hand[];
  /** Below this many analysed hands we refuse to name a focus. */
  minHands?: number;
  /** Injectable "now" for deterministic receipt recency. */
  now?: Date;
  /** Optional local Study Queue packet chosen by the browser-local SRS/progress router. */
  studyPacketFocus?: CoachStudyPacketFocus;
}

export const COACHS_NOTE_MIN_HANDS = 20;
const MAX_RECEIPTS = 3;

export function buildCoachsNote(input: CoachsNoteInput): CoachsNote {
  const { leaks, decisions, hands, minHands = COACHS_NOTE_MIN_HANDS, now = new Date(), studyPacketFocus } = input;
  const handsAnalyzed = decisions.length;

  if (handsAnalyzed < minHands) {
    return {
      kind: 'insufficient_data',
      handsAnalyzed,
      message: `Only ${handsAnalyzed} decision${handsAnalyzed === 1 ? '' : 's'} analysed so far — import at least ${minHands} before we name your top leak.`,
    };
  }

  const top = buildStudyQueue(leaks, decisions, hands)[0];
  if (!top) {
    return {
      kind: 'all_clear',
      handsAnalyzed,
      message: 'No single leak stands out across this sample. Keep it up — re-check after your next session.',
    };
  }

  // Receipts: a deviation/loss item already carries leak-specific losing hands;
  // an aggregate-stat leak item does not, so fall back to the proof-hand ranker.
  // That ranker only ranks *losing* hands, so a pure frequency leak yields an
  // empty list — which we surface honestly instead of fabricating a hand.
  let receipts: ReceiptHand[];
  if (top.handIds.length > 0) {
    receipts = top.handIds.slice(0, MAX_RECEIPTS).map((handId) => ({ handId, reasons: [] }));
  } else {
    const leakId = top.id.replace(/^leak-/, '');
    receipts = selectProofHands({ decisions, hands, leakId, limit: MAX_RECEIPTS, now }).map((pick) => ({
      handId: pick.handId,
      reasons: pick.reasons,
    }));
  }

  return {
    kind: 'focus',
    handsAnalyzed,
    focus: {
      leakTitle: top.title,
      explanation: top.explanation,
      severity: top.severity,
      confidence: top.confidence,
      estimatedBbLoss: top.estimatedBbLoss,
      evidence: top.evidence,
      cta: top.cta,
    },
    ...(studyPacketFocus ? { studyPacketFocus } : {}),
    receipts,
    noDecisiveHand: receipts.length === 0,
    drillCta: 'Open the Arena and drill this pattern',
  };
}
