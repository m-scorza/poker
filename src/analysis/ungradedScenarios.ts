import { complianceExclusionReasonForDecision } from './rangeChecker';
import type { HeroDecision, Scenario } from '../types/analysis';

const UNGRADED_SCENARIO_ORDER: Scenario[] = [
  'FACING_3BET',
  'FACING_RAISE',
  'FACING_ALL_IN',
  'BB_VS_RAISE_MULTIWAY',
  'BB_VS_LARGE_RAISE',
  'BB_VS_LIMP',
];

export interface UngradedScenarioSummary {
  id: string;
  scenario: Scenario;
  count: number;
  folded: number;
  continued: number;
  reason: string;
}

export interface UngradedScenarioImpact {
  total: number;
  gradeable: number;
  folded: number;
  continued: number;
  rate: number;
  scenarioCount: number;
  topScenarios: UngradedScenarioSummary[];
}

function scenarioOrderRank(scenario: Scenario): number {
  const index = UNGRADED_SCENARIO_ORDER.indexOf(scenario);
  return index === -1 ? UNGRADED_SCENARIO_ORDER.length : index;
}

function summaryId(scenario: Scenario, reason: string): string {
  const reasonSlug = reason
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
  return `${scenario}:${reasonSlug || 'review-only'}`;
}

export function isUngradedDecision(decision: HeroDecision): boolean {
  return complianceExclusionReasonForDecision(decision) !== null;
}

export function buildUngradedScenarioSummary(decisions: HeroDecision[]): UngradedScenarioSummary[] {
  const counts = new Map<
    string,
    Pick<UngradedScenarioSummary, 'id' | 'scenario' | 'reason' | 'count' | 'folded' | 'continued'>
  >();

  for (const decision of decisions) {
    const reason = complianceExclusionReasonForDecision(decision);
    if (!reason) continue;

    const id = summaryId(decision.scenario, reason);
    const current = counts.get(id) ?? {
      id,
      scenario: decision.scenario,
      reason,
      count: 0,
      folded: 0,
      continued: 0,
    };
    current.count += 1;
    if (decision.action === 'fold') current.folded += 1;
    else current.continued += 1;
    counts.set(id, current);
  }

  return Array.from(counts.values()).sort((a, b) => {
    const orderDiff = scenarioOrderRank(a.scenario) - scenarioOrderRank(b.scenario);
    if (orderDiff !== 0) return orderDiff;
    return a.reason.localeCompare(b.reason);
  });
}

export function buildUngradedScenarioImpact(
  decisions: HeroDecision[],
  options: { topLimit?: number } = {},
): UngradedScenarioImpact {
  const topLimit = options.topLimit ?? 3;
  const summary = buildUngradedScenarioSummary(decisions);
  const total = summary.reduce((sum, row) => sum + row.count, 0);
  const folded = summary.reduce((sum, row) => sum + row.folded, 0);
  const continued = summary.reduce((sum, row) => sum + row.continued, 0);
  const topScenarios = [...summary]
    .sort((a, b) => {
      const countDiff = b.count - a.count;
      if (countDiff !== 0) return countDiff;
      const orderDiff = scenarioOrderRank(a.scenario) - scenarioOrderRank(b.scenario);
      if (orderDiff !== 0) return orderDiff;
      return a.reason.localeCompare(b.reason);
    })
    .slice(0, Math.max(0, topLimit));

  return {
    total,
    gradeable: Math.max(0, decisions.length - total),
    folded,
    continued,
    rate: decisions.length === 0 ? 0 : total / decisions.length,
    scenarioCount: new Set(summary.map((row) => row.scenario)).size,
    topScenarios,
  };
}
