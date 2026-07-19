import type { HeroDecision, DeviationType, Scenario } from '../types/analysis';
import { KB_PATHS, UNSUPPORTED_EVIDENCE, createEvidence, type Evidence } from '../types/evidence';
import type { Hand } from '../types/hand';
import type { Leak, LeakSeverity } from './leakDetector';
import { batchCheckPushFold, type PushFoldCheckOptions } from './pushFoldChecker';
import { BB_DEFENSE_COVERAGE_NOTE } from '../data/ranges';

type StudyQueueConfidence = 'high' | 'medium' | 'low';

type StudyQueueEvidenceKind =
  | 'aggregate_leak'
  | 'tagged_decisions'
  | 'postflop_flags'
  | 'bb_loss_review'
  | 'reference_misses'
  | 'source_context';

export interface StudyQueueEvidence {
  kind: StudyQueueEvidenceKind;
  label: string;
  details: string[];
  trust: Evidence;
}

export interface StudyQueueItem {
  id: string;
  title: string;
  source: 'leak' | 'deviation' | 'postflop' | 'loss' | 'reference' | 'data_health';
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
  VS3BET_OVERFOLD: 'Folded a continue hand versus a 3-bet',
  VS3BET_LOOSE_CONTINUE: 'Continued a fold hand versus a 3-bet',
  VS3BET_WRONG_CONTINUE: 'Wrong continue action versus a 3-bet',
  ALLIN_OVERFOLD: 'Folded a call versus an all-in shove',
  ALLIN_LOOSE_CALL: 'Called an all-in shove too light',
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

const DATA_HEALTH_CONTEXT_EVIDENCE = createEvidence(
  'unsupported',
  [],
  'Import/source context review only. This queues hands for re-import, summary, payout, or parser-confidence review before external study; it is not strategy advice, solver EV, or trainer scoring.',
);

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

function isIcmOrBountySensitive(decision: HeroDecision): boolean {
  return decision.icmStage === 'bubble'
    || decision.icmStage === 'itm'
    || decision.icmStage === 'final_table'
    || Boolean(decision.bountyContext);
}

function isPkoContext(decision: HeroDecision): boolean {
  return decision.bountyContext?.tournamentType === 'knockout'
    || decision.bountyContext?.tournamentType === 'progressive_ko';
}

function isPayJumpSensitive(decision: HeroDecision): boolean {
  return decision.icmStage === 'bubble'
    || decision.icmStage === 'itm'
    || decision.icmStage === 'final_table';
}

function mayNeedMultiBountyContext(decision: HeroDecision): boolean {
  return decision.scenario === 'FACING_ALL_IN'
    || decision.scenario === 'FACING_3BET'
    || decision.scenario === 'BB_VS_RAISE_MULTIWAY'
    || (decision.squeezeSpot?.callerCount ?? 0) > 0;
}

function sourceContextReasons(decision: HeroDecision, hand: Hand): string[] {
  const reasons: string[] = [];
  const source = hand.importSource;

  if (!source) {
    reasons.push('legacy/unknown import source');
  } else {
    if (source.parserConfidence === 'medium') reasons.push('directional parser confidence');
    if (source.parserConfidence === 'low' || source.parserConfidence === 'unknown') reasons.push('low/unknown parser confidence');
    if (source.site === 'unknown') reasons.push('unknown poker site');
    if (source.site === 'known_unsupported') reasons.push('unsupported native room parser');
    if (source.fileType === 'unknown') reasons.push('unknown file type');
  }

  if (isPkoContext(decision) && hand.tournamentId) {
    reasons.push('opponent bounty values unknown');
    reasons.push('PKO coverage context partial');
    if (mayNeedMultiBountyContext(decision)) reasons.push('multi-bounty context missing');
    if (isPayJumpSensitive(decision)) reasons.push('PKO pay-jump context missing');
  } else if (isIcmOrBountySensitive(decision) && hand.tournamentId) {
    reasons.push('ICM/bounty spot needs tournament summary or payout review');
  }

  return Array.from(new Set(reasons));
}

function sourceReasonSummary(reasonCounts: Map<string, number>, limit = 4): string {
  return Array.from(reasonCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([reason, count]) => `${reason}: ${count}`)
    .join('; ');
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

  const sourceReviewEntries = decisions
    .map((decision) => {
      const hand = handMap.get(decision.handId);
      if (!hand) return null;
      const reasons = sourceContextReasons(decision, hand);
      if (reasons.length === 0) return null;
      return { decision, hand, reasons, bb: handBbDelta(decision, handMap) };
    })
    .filter((entry): entry is { decision: HeroDecision; hand: Hand; reasons: string[]; bb: number | null } => entry !== null);

  if (sourceReviewEntries.length > 0) {
    const reasonCounts = new Map<string, number>();
    for (const entry of sourceReviewEntries) {
      entry.reasons.forEach((reason) => reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1));
    }

    const topReviewEntries = [...sourceReviewEntries]
      .sort((left, right) => {
        const leftLoss = left.bb !== null && left.bb < 0 ? left.bb : Number.POSITIVE_INFINITY;
        const rightLoss = right.bb !== null && right.bb < 0 ? right.bb : Number.POSITIVE_INFINITY;
        return leftLoss - rightLoss || left.hand.id.localeCompare(right.hand.id);
      })
      .slice(0, 5);
    const estimatedBbLoss = topReviewEntries
      .map((entry) => entry.bb)
      .filter((bb): bb is number => bb !== null && bb < 0)
      .reduce((sum, bb) => sum + Math.abs(bb), 0);
    const score = priorityScore(
      severityFromScore(sourceReviewEntries.length * 14 + estimatedBbLoss * 2),
      sourceReviewEntries.length,
      estimatedBbLoss > 0 ? estimatedBbLoss : null,
    );
    const reasonSummary = sourceReasonSummary(reasonCounts);

    items.push({
      id: 'data-health-source-context',
      title: 'Data Health source/context review',
      source: 'data_health',
      severity: severityFromScore(score),
      priorityScore: score,
      sampleSize: sourceReviewEntries.length,
      estimatedBbLoss: estimatedBbLoss > 0 ? estimatedBbLoss : null,
      confidence: 'low',
      evidence: {
        kind: 'source_context',
        label: 'Import/source context',
        trust: DATA_HEALTH_CONTEXT_EVIDENCE,
        details: [
          pluralize(sourceReviewEntries.length, 'hand with source/context caveats', 'hands with source/context caveats'),
          reasonSummary || 'Parser and tournament-context caveats need review',
        ],
      },
      handIds: topReviewEntries.map((entry) => entry.decision.handId),
      cta: 'Review source caveats',
      explanation: `${sourceReviewEntries.length} queued hand${sourceReviewEntries.length === 1 ? '' : 's'} need import-source, parser-confidence, tournament-summary, or payout context review before external solver/trainer study. SpotPacket exports keep these as study prompts and do not attach EV or scoring answers.`,
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
