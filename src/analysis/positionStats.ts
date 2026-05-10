/**
 * Compute aggregate stats broken down by position.
 * Used for the Position Performance Heatmap on Dashboard/Stats pages.
 */

import type { HeroDecision, Position } from '../types/analysis';
import type { Hand } from '../types/hand';

export interface PositionStats {
  position: Position;
  hands: number;
  vpip: number;      // %
  pfr: number;       // %
  compliance: number; // %
  winPct: number;    // % of hands where hero won chips
  totalProfit: number;
  totalBb: number;
  bb100: number;
  bb100Hands: number;
}

const POSITION_ORDER: Position[] = [
  'UTG', 'UTG+1', 'MP1', 'MP', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB', 'BTN/SB'
];

function buildBigBlindMap(hands: Hand[] | Map<string, number> = []): Map<string, number> {
  if (hands instanceof Map) return hands;
  return new Map(hands.map((hand) => [hand.id, hand.bigBlind]));
}

function netBigBlinds(decision: HeroDecision, bigBlindByHandId: Map<string, number>): number | null {
  const bigBlind = bigBlindByHandId.get(decision.handId);
  if (!bigBlind || bigBlind <= 0) return null;
  return decision.netProfit / bigBlind;
}

/**
 * Convert chip PnL to poker-standard bb/100.
 * Formula: sum(net chips / hand big blind) / hands with known blinds * 100.
 */
export function computeBb100(decisions: HeroDecision[], hands: Hand[] | Map<string, number> = []): {
  totalBb: number;
  bb100: number;
  sampleSize: number;
} {
  const bigBlindByHandId = buildBigBlindMap(hands);
  let totalBb = 0;
  let sampleSize = 0;

  for (const decision of decisions) {
    const netBb = netBigBlinds(decision, bigBlindByHandId);
    if (netBb === null) continue;
    totalBb += netBb;
    sampleSize += 1;
  }

  return {
    totalBb,
    bb100: sampleSize > 0 ? (totalBb / sampleSize) * 100 : 0,
    sampleSize,
  };
}

/**
 * Compute per-position stats from hero decisions.
 * Only returns positions that have at least 1 hand.
 */
export function computePositionStats(decisions: HeroDecision[], hands: Hand[] | Map<string, number> = []): PositionStats[] {
  const bigBlindByHandId = buildBigBlindMap(hands);
  const byPos = new Map<Position, HeroDecision[]>();

  for (const d of decisions) {
    const existing = byPos.get(d.position) ?? [];
    existing.push(d);
    byPos.set(d.position, existing);
  }

  const results: PositionStats[] = [];

  for (const pos of POSITION_ORDER) {
    const posDecisions = byPos.get(pos);
    if (!posDecisions || posDecisions.length === 0) continue;

    const total = posDecisions.length;
    const vpipCount = posDecisions.filter(d => d.action === 'raise' || d.action === 'call').length;
    const pfrCount = posDecisions.filter(d => d.wasPreFlopRaiser).length;

    const eligible = posDecisions.filter(d => d.deviationType !== null || d.isCompliant);
    const compliant = eligible.filter(d => d.isCompliant).length;

    // Win percentage: % of hands where hero won chips
    const wonHands = posDecisions.filter(d => d.netProfit > 0).length;
    const winPct = total > 0 ? (wonHands / total) * 100 : 0;

    const totalProfit = posDecisions.reduce((sum, d) => sum + d.netProfit, 0);
    const bbStats = computeBb100(posDecisions, bigBlindByHandId);

    results.push({
      position: pos,
      hands: total,
      vpip: total > 0 ? (vpipCount / total) * 100 : 0,
      pfr: total > 0 ? (pfrCount / total) * 100 : 0,
      compliance: eligible.length > 0 ? (compliant / eligible.length) * 100 : 0,
      winPct,
      totalProfit,
      totalBb: bbStats.totalBb,
      bb100: bbStats.bb100,
      bb100Hands: bbStats.sampleSize,
    });
  }

  return results;
}
