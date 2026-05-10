import type { HeroDecision, DeviationType, Scenario } from '../types/analysis';
import type { Hand } from '../types/hand';
import type { Leak, LeakSeverity } from './leakDetector';

export interface StudyQueueItem {
  id: string;
  title: string;
  source: 'leak' | 'deviation' | 'postflop' | 'loss';
  severity: LeakSeverity;
  priorityScore: number;
  sampleSize: number;
  estimatedBbLoss: number | null;
  handIds: string[];
  cta: string;
  explanation: string;
}

const SEVERITY_WEIGHT: Record<LeakSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const DEVIATION_LABELS: Record<DeviationType, string> = {
  OVERFOLD: 'Overfolded playable range',
  OPENED_OUT_OF_RANGE: 'Opened out of range',
  LIMPED: 'Limped instead of raise/fold',
  SB_OVERFOLD: 'Small blind overfold',
  SB_LIMPED: 'Small blind limp',
  SB_OUT_OF_RANGE: 'Small blind out-of-range open',
  COLD_CALL: 'Cold-called where raise/fold is cleaner',
  BB_FOLD_SUITED: 'Folded suited BB defense',
  SB_COLD_CALL: 'Small blind cold-call',
  FOLD_VS_LIMP: 'Folded versus limp opportunity',
  LIMP_BEHIND: 'Limped behind',
  HU_BTN_FOLD: 'Folded heads-up button',
};

const SCENARIO_LABELS: Record<Scenario, string> = {
  RFI: 'RFI',
  BLIND_WAR: 'Blind war',
  HU_BTN: 'Heads-up BTN/SB',
  FACING_RAISE: 'Facing raise',
  FACING_ALL_IN: 'Facing all-in',
  FACING_LIMP: 'Facing limp',
  BB_VS_RAISE: 'BB vs raise',
  BB_VS_LARGE_RAISE: 'BB vs large raise',
  BB_VS_LIMP: 'BB vs limp',
  WALK: 'Walk',
};

function handBbDelta(decision: HeroDecision, handMap: Map<string, Hand>): number | null {
  const hand = handMap.get(decision.handId);
  const bigBlind = hand?.bigBlind ?? 0;
  if (!Number.isFinite(bigBlind) || bigBlind <= 0) return null;
  return decision.netProfit / bigBlind;
}

function severityFromScore(score: number): LeakSeverity {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function priorityScore(severity: LeakSeverity, sampleSize: number, estimatedBbLoss: number | null): number {
  const lossBoost = estimatedBbLoss === null ? 0 : Math.min(35, Math.max(0, estimatedBbLoss));
  const sampleBoost = Math.min(20, sampleSize * 2);
  return Math.round(SEVERITY_WEIGHT[severity] * 18 + sampleBoost + lossBoost);
}

function sortedLossHandIds(decisions: HeroDecision[], handMap: Map<string, Hand>, limit = 5): string[] {
  return [...decisions]
    .map((decision) => ({ decision, bb: handBbDelta(decision, handMap) }))
    .filter((entry): entry is { decision: HeroDecision; bb: number } => entry.bb !== null)
    .sort((a, b) => a.bb - b.bb)
    .slice(0, limit)
    .map((entry) => entry.decision.handId);
}

export function buildStudyQueue(
  leaks: Leak[],
  decisions: HeroDecision[],
  hands: Hand[],
  limit = 5,
): StudyQueueItem[] {
  const handMap = new Map(hands.map((hand) => [hand.id, hand]));
  const items: StudyQueueItem[] = [];

  for (const leak of leaks) {
    const estimatedBbLoss = Math.abs(leak.deviation) * Math.max(1, leak.sampleSize) / 100;
    items.push({
      id: `leak-${leak.id}`,
      title: leak.name,
      source: 'leak',
      severity: leak.severity,
      priorityScore: priorityScore(leak.severity, leak.sampleSize, estimatedBbLoss),
      sampleSize: leak.sampleSize,
      estimatedBbLoss,
      handIds: [],
      cta: leak.id === 'compliance' ? 'Open Range Matrix' : 'Review filtered hands',
      explanation: `${leak.description} Current ${leak.value}%, target ${leak.target[0]}–${leak.target[1]}%.`,
    });
  }

  const deviationGroups = new Map<DeviationType, HeroDecision[]>();
  for (const decision of decisions) {
    if (!decision.deviationType) continue;
    const group = deviationGroups.get(decision.deviationType) ?? [];
    group.push(decision);
    deviationGroups.set(decision.deviationType, group);
  }

  for (const [deviationType, group] of deviationGroups.entries()) {
    const bbLosses = group
      .map((decision) => handBbDelta(decision, handMap))
      .filter((bb): bb is number => bb !== null && bb < 0)
      .map((bb) => Math.abs(bb));
    const estimatedBbLoss = bbLosses.length > 0 ? bbLosses.reduce((sum, bb) => sum + bb, 0) : null;
    const scenarioCounts = new Map<Scenario, number>();
    for (const decision of group) {
      scenarioCounts.set(decision.scenario, (scenarioCounts.get(decision.scenario) ?? 0) + 1);
    }
    const topScenario = [...scenarioCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? group[0]!.scenario;
    const score = priorityScore(severityFromScore(group.length * 14 + (estimatedBbLoss ?? 0) * 3), group.length, estimatedBbLoss);

    items.push({
      id: `deviation-${deviationType}`,
      title: DEVIATION_LABELS[deviationType],
      source: 'deviation',
      severity: severityFromScore(score),
      priorityScore: score,
      sampleSize: group.length,
      estimatedBbLoss,
      handIds: sortedLossHandIds(group, handMap),
      cta: deviationType === 'OPENED_OUT_OF_RANGE' || deviationType === 'OVERFOLD' ? 'Drill range cell' : 'Review hand queue',
      explanation: `${group.length} tagged ${SCENARIO_LABELS[topScenario]} spot${group.length === 1 ? '' : 's'} need a repeatable rule before the next session.`,
    });
  }

  const missedCbetHands = decisions.filter((decision) => decision.cbetOpportunity && !decision.cbetMade);
  if (missedCbetHands.length > 0) {
    const bbLosses = missedCbetHands
      .map((decision) => handBbDelta(decision, handMap))
      .filter((bb): bb is number => bb !== null && bb < 0)
      .map((bb) => Math.abs(bb));
    const estimatedBbLoss = bbLosses.length > 0 ? bbLosses.reduce((sum, bb) => sum + bb, 0) : null;
    const score = priorityScore(severityFromScore(missedCbetHands.length * 12 + (estimatedBbLoss ?? 0) * 2), missedCbetHands.length, estimatedBbLoss);
    items.push({
      id: 'postflop-missed-cbet',
      title: 'Missed c-bet drill queue',
      source: 'postflop',
      severity: severityFromScore(score),
      priorityScore: score,
      sampleSize: missedCbetHands.length,
      estimatedBbLoss,
      handIds: sortedLossHandIds(missedCbetHands, handMap),
      cta: 'Drill 33% flop c-bets',
      explanation: 'GTO Wizard/DTO-style practice loop: isolate missed continuation bets and rehearse the default pressure line.',
    });
  }

  const biggestLosses = decisions
    .map((decision) => ({ decision, bb: handBbDelta(decision, handMap) }))
    .filter((entry): entry is { decision: HeroDecision; bb: number } => entry.bb !== null && entry.bb < 0)
    .sort((a, b) => a.bb - b.bb)
    .slice(0, 5);

  if (biggestLosses.length > 0) {
    const estimatedBbLoss = biggestLosses.reduce((sum, entry) => sum + Math.abs(entry.bb), 0);
    const score = priorityScore(severityFromScore(estimatedBbLoss * 2), biggestLosses.length, estimatedBbLoss);
    items.push({
      id: 'loss-biggest-bb-swings',
      title: 'Biggest BB loss hands',
      source: 'loss',
      severity: severityFromScore(score),
      priorityScore: score,
      sampleSize: biggestLosses.length,
      estimatedBbLoss,
      handIds: biggestLosses.map((entry) => entry.decision.handId),
      cta: 'Replay top losses',
      explanation: 'GTO Wizard-style review: sort by biggest normalized BB damage so one large pot cannot hide inside aggregate charts.',
    });
  }

  return items
    .sort((a, b) => b.priorityScore - a.priorityScore || (b.estimatedBbLoss ?? -1) - (a.estimatedBbLoss ?? -1))
    .slice(0, limit);
}
