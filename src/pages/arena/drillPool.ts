import { checkCompliance } from '../../analysis/rangeChecker';
import type { HeroDecision } from '../../types/analysis';
import type { StrategyProfile } from '../../data/strategyProfiles';
import { uniqueNonEmpty, type GetDrillPoolOptions } from './studyQueueRoute';
import type { DrillType } from '../../analysis/arena/drillLogic';

export type { DrillType } from '../../analysis/arena/drillLogic';
export { shouldCbet, isCbetActionCorrect } from '../../analysis/arena/drillLogic';

export function getDrillPool(
  type: DrillType,
  allDecisions: HeroDecision[],
  strategyProfile: StrategyProfile,
  options: GetDrillPoolOptions = {},
): HeroDecision[] {
  if (type === 'study_queue') {
    const requestedHandIds = options.handIds?.length
      ? uniqueNonEmpty(options.handIds)
      : options.handId
        ? [options.handId]
        : [];
    if (requestedHandIds.length === 0) return [];

    const decisionByHandId = new Map<string, HeroDecision>();
    for (const decision of allDecisions) {
      if (!decisionByHandId.has(decision.handId)) decisionByHandId.set(decision.handId, decision);
    }
    return requestedHandIds
      .map((handId) => decisionByHandId.get(handId))
      .filter((decision): decision is HeroDecision => Boolean(decision));
  }

  if (type === 'fault_fixer') {
    return allDecisions.filter(d => {
      const result = checkCompliance(d, strategyProfile);
      return result && !result.isCompliant;
    });
  }

  if (type === 'rfi_master') {
    return allDecisions.filter(d => d.scenario === 'RFI' || d.scenario === 'BLIND_WAR');
  }

  if (type === 'cbet_clinic') {
    return allDecisions.filter(d => d.cbetOpportunity);
  }

  // spaced_review draws from a persisted SRS queue, not a random pool.
  return [];
}
