/**
 * Rank hands by their pedagogical value as "proof" for a given leak.
 *
 * Today the study queue picks proof-hands by sorting on bb-delta ascending
 * (`sortedLossHandIds` in `studyPlan.ts`). That surfaces big losses but biases
 * toward one-off coolers and ignores recurrence. For Coach Mode we want the
 * five hands most worth reviewing — large impact, repeated mistake, recent,
 * and cleanly explainable.
 *
 * Ranking is deterministic. Weights are named constants so they can be tuned
 * against real study sessions without reading the code path.
 */

import type { HeroDecision } from '../types/analysis';
import type { Hand } from '../types/hand';
import type { EvidenceKind } from '../types/evidence';

export type ProofHandReason = 'severity' | 'recency' | 'representativeness' | 'clarity';

export interface ProofHandRankingInput {
  decisions: HeroDecision[];
  hands: Hand[];
  leakId: string;
  /** Provenance of the parent leak. Used to credit `clarity` to hands that match the rule cleanly. */
  evidenceKind?: EvidenceKind;
  limit?: number;
  /** Override the "now" timestamp for deterministic tests. */
  now?: Date;
}

export interface ProofHandPick {
  handId: string;
  rankingScore: number;
  reasons: ProofHandReason[];
}

/** Weights are exported for tests and to make the composite explicit. */
export const PROOF_HAND_WEIGHTS = {
  severity: 0.45,
  representativeness: 0.30,
  recency: 0.10,
  clarity: 0.15,
} as const;

/** Hands older than this fall off the recency curve entirely. */
export const RECENCY_FULL_WEIGHT_DAYS = 14;
export const RECENCY_ZERO_WEIGHT_DAYS = 60;

/** A reason is "credited" to the selected hand only if its raw axis crosses this. */
const REASON_CREDIT_THRESHOLD = 0.4;

export function selectProofHands(input: ProofHandRankingInput): ProofHandPick[] {
  const { decisions, hands, leakId, evidenceKind, limit = 5, now = new Date() } = input;
  if (decisions.length === 0) return [];

  const handMap = new Map(hands.map((hand) => [hand.id, hand]));

  const bbLosses = new Map<string, number>();
  for (const decision of decisions) {
    const hand = handMap.get(decision.handId);
    const bigBlind = hand?.bigBlind ?? 0;
    if (!Number.isFinite(bigBlind) || bigBlind <= 0) continue;
    const bbDelta = decision.netProfit / bigBlind;
    if (bbDelta >= 0) continue;
    bbLosses.set(decision.handId, Math.abs(bbDelta));
  }

  const maxBbLoss = Math.max(0, ...bbLosses.values());

  const frequency = new Map<string, number>();
  for (const decision of decisions) {
    const key = `${decision.position}|${decision.scenario}|${decision.handKey}`;
    frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }
  const maxFrequency = Math.max(1, ...frequency.values());

  const clarityEligible = evidenceKind === 'rule_based' || evidenceKind === 'local_reference';

  const ranked: ProofHandPick[] = decisions
    .map((decision) => {
      const severityRaw = severityScore(decision.handId, bbLosses, maxBbLoss);
      const repKey = `${decision.position}|${decision.scenario}|${decision.handKey}`;
      const representativenessRaw = (frequency.get(repKey) ?? 1) / maxFrequency;
      const recencyRaw = recencyScore(handMap.get(decision.handId)?.date, now);
      const clarityRaw = clarityEligible ? clarityScore(decision, leakId) : 0;

      const rankingScore =
        severityRaw * PROOF_HAND_WEIGHTS.severity +
        representativenessRaw * PROOF_HAND_WEIGHTS.representativeness +
        recencyRaw * PROOF_HAND_WEIGHTS.recency +
        clarityRaw * PROOF_HAND_WEIGHTS.clarity;

      const reasons: ProofHandReason[] = [];
      if (severityRaw >= REASON_CREDIT_THRESHOLD) reasons.push('severity');
      if (representativenessRaw >= REASON_CREDIT_THRESHOLD) reasons.push('representativeness');
      if (recencyRaw >= REASON_CREDIT_THRESHOLD) reasons.push('recency');
      if (clarityRaw >= REASON_CREDIT_THRESHOLD) reasons.push('clarity');

      const qualifies = severityRaw > 0 || clarityRaw > 0;

      return { handId: decision.handId, rankingScore, reasons, qualifies };
    })
    .filter((pick) => pick.qualifies)
    .map(({ qualifies: _qualifies, ...rest }) => rest);

  ranked.sort((a, b) => {
    if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
    return a.handId.localeCompare(b.handId);
  });

  const seen = new Set<string>();
  const unique: ProofHandPick[] = [];
  for (const pick of ranked) {
    if (seen.has(pick.handId)) continue;
    seen.add(pick.handId);
    unique.push(pick);
    if (unique.length >= limit) break;
  }
  return unique;
}

function severityScore(handId: string, bbLosses: Map<string, number>, maxBbLoss: number): number {
  if (maxBbLoss <= 0) return 0;
  const loss = bbLosses.get(handId);
  if (loss === undefined) return 0;
  return loss / maxBbLoss;
}

function recencyScore(date: Date | undefined, now: Date): number {
  if (!date) return 0;
  const days = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(days) || days < 0) return 1;
  if (days <= RECENCY_FULL_WEIGHT_DAYS) return 1;
  if (days >= RECENCY_ZERO_WEIGHT_DAYS) return 0;
  const span = RECENCY_ZERO_WEIGHT_DAYS - RECENCY_FULL_WEIGHT_DAYS;
  return 1 - (days - RECENCY_FULL_WEIGHT_DAYS) / span;
}

/**
 * Credit `clarity` when the hand cleanly satisfies the leak's typical
 * precondition. Conservative: returns 1 only when the match is obvious from
 * `HeroDecision` alone, 0 otherwise. We never invent context the parser did
 * not supply.
 */
function clarityScore(decision: HeroDecision, leakId: string): number {
  switch (leakId) {
    case 'limps':
      return decision.deviationType === 'LIMPED' || decision.deviationType === 'LIMP_BEHIND' || decision.deviationType === 'SB_LIMPED' ? 1 : 0;
    case 'compliance':
      return decision.deviationType !== null && !decision.isCompliant ? 1 : 0;
    case 'cbet_hu':
      return decision.cbetHU && decision.cbetOpportunity && !decision.cbetMade ? 1 : 0;
    case 'cbet_total':
      return decision.cbetOpportunity && !decision.cbetMade ? 1 : 0;
    case 'wtsd':
      return decision.wentToShowdown ? 1 : 0;
    case 'won_sd':
      return decision.wentToShowdown && !decision.wonAtShowdown ? 1 : 0;
    case 'three_bet':
      return decision.scenario === 'FACING_RAISE' ? 1 : 0;
    case 'vpip':
    case 'pfr':
    case 'vpip_pfr_gap':
    case 'af':
      return 0;
    default:
      if (leakId.startsWith('postflop_')) {
        return decision.sawFlop ? 1 : 0;
      }
      return 0;
  }
}
