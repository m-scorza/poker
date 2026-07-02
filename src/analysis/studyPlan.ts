import type { HeroDecision, DeviationType, Scenario } from '../types/analysis';
import { KB_PATHS, UNSUPPORTED_EVIDENCE, createEvidence, type Evidence } from '../types/evidence';
import type { Hand } from '../types/hand';
import type { Leak, LeakSeverity } from './leakDetector';
import { batchCheckPushFold, type PushFoldCheckOptions } from './pushFoldChecker';
import { BB_DEFENSE_COVERAGE_NOTE } from '../data/ranges';

export type StudyQueueConfidence = 'high' | 'medium' | 'low';

export type StudyQueueEvidenceKind =
  | 'aggregate_leak'
  | 'tagged_decisions'
  | 'postflop_flags'
  | 'bb_loss_review'
  | 'reference_misses';

export interface StudyQueueEvidence {
  kind: StudyQueueEvidenceKind;
  label: string;
  details: string[];
  trust: Evidence;
}

export interface StudyQueueItem {
  id: string;
  title: string;
  source: 'leak' | 'deviation' | 'postflop' | 'loss' | 'reference';
  severity: LeakSeverity;
  priorityScore: number;
  sampleSize: number;
  estimatedBbLoss: number | null;
  confidence: StudyQueueConfidence;
  evidence: StudyQueueEvidence;
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
  FACING_3BET: 'Facing 3-bet',
  FACING_ALL_IN: 'Facing all-in',
  FACING_LIMP: 'Facing limp',
  BB_VS_RAISE: 'BB vs raise',
  BB_VS_RAISE_MULTIWAY: 'BB vs multiway raise',
  BB_VS_LARGE_RAISE: 'BB vs large raise',
  BB_VS_LIMP: 'BB vs limp',
  WALK: 'Walk',
};

const AGGREGATE_LEAK_EVIDENCE = createEvidence('rule_based', [
  {
    docPath: KB_PATHS.studyMethods,
    section: '4. Leak Finder Framework',
    quote: 'Create a study plan targeting the biggest leaks first',
  },
]);

const PREFLOP_RANGE_EVIDENCE = createEvidence('rule_based', [
  {
    docPath: KB_PATHS.rangesAndPosition,
    section: '3. RFI Ranges by Stack Depth',
    quote: 'Reference chipEV range percentages from study tables.',
  },
]);

const BB_DEFENSE_EVIDENCE = createEvidence('rule_based', [
  {
    docPath: KB_PATHS.preflopStrategy,
    section: '2. Big Blind Defense',
    quote: 'Any hand that loses less than 1.12bb/hand is worth playing.',
  },
], BB_DEFENSE_COVERAGE_NOTE);

const CBET_PROXY_EVIDENCE = createEvidence('proxy_model', [
  {
    docPath: KB_PATHS.postflopStrategy,
    section: '2. C-Bet Strategy',
    quote: 'even weak hands benefit from denying equity',
  },
], 'Frequency heuristic only. No solver EV is attached; use this as a study prompt until the spot is manually reviewed.');

const HU_REFERENCE_EVIDENCE = createEvidence('local_reference', [
  {
    docPath: KB_PATHS.rangesAndPosition,
    section: '4. Open Shove Ranges',
    quote: 'At 10bb, the strategy is simplified to all-in or fold.',
  },
], 'Uses your local heads-up push/fold reference table. Treat as a practical drill prompt; EV loss is unknown.');

function evidenceForDeviation(deviationType: DeviationType): Evidence {
  if (deviationType === 'BB_FOLD_SUITED') return BB_DEFENSE_EVIDENCE;
  return PREFLOP_RANGE_EVIDENCE;
}

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

function confidenceFromSampleSize(sampleSize: number): StudyQueueConfidence {
  if (sampleSize >= 30) return 'high';
  if (sampleSize >= 10) return 'medium';
  return 'low';
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
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
  options: PushFoldCheckOptions = {},
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
      confidence: confidenceFromSampleSize(leak.sampleSize),
      evidence: {
        kind: 'aggregate_leak',
        label: 'Aggregate leak sample',
        trust: AGGREGATE_LEAK_EVIDENCE,
        details: [
          pluralize(leak.sampleSize, 'tracked spot'),
          `Current ${leak.value}%, target ${leak.target[0]}–${leak.target[1]}%`,
        ],
      },
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
      confidence: confidenceFromSampleSize(group.length),
      evidence: {
        kind: 'tagged_decisions',
        label: 'Tagged decision cluster',
        trust: evidenceForDeviation(deviationType),
        details: [
          pluralize(group.length, 'tagged decision'),
          `${SCENARIO_LABELS[topScenario]} is the most common scenario`,
        ],
      },
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
      confidence: confidenceFromSampleSize(missedCbetHands.length),
      evidence: {
        kind: 'postflop_flags',
        label: 'Postflop opportunity tags',
        trust: CBET_PROXY_EVIDENCE,
        details: [pluralize(missedCbetHands.length, 'missed continuation-bet opportunity', 'missed continuation-bet opportunities')],
      },
      handIds: sortedLossHandIds(missedCbetHands, handMap),
      cta: 'Drill 33% flop c-bets',
      explanation: 'Practice loop: isolate missed continuation bets and rehearse the default pressure line. This is a frequency heuristic, not solver EV.',
    });
  }

  if (options.headsUpReferences) {
    const referenceMisses = batchCheckPushFold(decisions, options).filter(
      (analysis) =>
        analysis.sourceType === 'local_hu_push_fold_csv' &&
        (analysis.result === 'missed_push' ||
          analysis.result === 'bad_push' ||
          analysis.result === 'missed_call' ||
          analysis.result === 'loose_call'),
    );

    if (referenceMisses.length > 0) {
      const missedHandIds = new Set(referenceMisses.map((analysis) => analysis.handId));
      const missedReferenceDecisions = decisions.filter((decision) => missedHandIds.has(decision.handId));
      const bbLosses = missedReferenceDecisions
        .map((decision) => handBbDelta(decision, handMap))
        .filter((bb): bb is number => bb !== null && bb < 0)
        .map((bb) => Math.abs(bb));
      const estimatedBbLoss = bbLosses.length > 0 ? bbLosses.reduce((sum, bb) => sum + bb, 0) : null;
      const score = priorityScore(
        severityFromScore(referenceMisses.length * 16 + (estimatedBbLoss ?? 0) * 3),
        referenceMisses.length,
        estimatedBbLoss,
      );

      items.push({
        id: 'reference-hu-push-fold',
        title: 'Heads-up push/fold reference misses',
        source: 'reference',
        severity: severityFromScore(score),
        priorityScore: score,
        sampleSize: referenceMisses.length,
        estimatedBbLoss,
        confidence: confidenceFromSampleSize(referenceMisses.length),
        evidence: {
          kind: 'reference_misses',
          label: 'Local heads-up reference misses',
          trust: HU_REFERENCE_EVIDENCE,
          details: [
            pluralize(referenceMisses.length, 'reference miss', 'reference misses'),
            'Compared against your locally loaded HU push/fold CSV/table',
          ],
        },
        handIds: sortedLossHandIds(missedReferenceDecisions, handMap),
        cta: 'Review local reference table spots',
        explanation: `${referenceMisses.length} heads-up push/fold decision${referenceMisses.length === 1 ? '' : 's'} diverged from the local CSV/table reference. Review these as practical reference-table drills; EV loss is unknown until richer reference data is attached.`,
      });
    }
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
      confidence: 'low',
      evidence: {
        kind: 'bb_loss_review',
        label: 'Normalized BB loss review',
        trust: UNSUPPORTED_EVIDENCE,
        details: [
          pluralize(biggestLosses.length, 'loss hand'),
          'Sorted by bb delta, not raw chips',
        ],
      },
      handIds: biggestLosses.map((entry) => entry.decision.handId),
      cta: 'Replay top losses',
      explanation: 'Review queue: sort by biggest normalized BB damage so one large pot cannot hide inside aggregate charts. This is not a strategy verdict.',
    });
  }

  return items
    .sort((a, b) => b.priorityScore - a.priorityScore || (b.estimatedBbLoss ?? -1) - (a.estimatedBbLoss ?? -1))
    .slice(0, limit);
}
