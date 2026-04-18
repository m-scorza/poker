/**
 * Compute aggregate stats broken down by position.
 * Used for the Position Performance Heatmap on Dashboard/Stats pages.
 */

import type { HeroDecision, Position } from '../types/analysis';

export interface PositionStats {
  position: Position;
  hands: number;
  vpip: number;      // % 
  pfr: number;       // %
  compliance: number; // %
  winPct: number;    // % of hands where hero won chips
  totalProfit: number;
  bb100: number;
}

const POSITION_ORDER: Position[] = [
  'UTG', 'UTG+1', 'MP1', 'MP', 'MP2', 'HJ', 'CO', 'BTN', 'SB', 'BB', 'BTN/SB'
];

/**
 * Compute per-position stats from hero decisions.
 * Only returns positions that have at least 1 hand.
 */
export function computePositionStats(decisions: HeroDecision[]): PositionStats[] {
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
    const wonHands = posDecisions.filter(d => d.wonAmount > 0).length;
    const winPct = total > 0 ? (wonHands / total) * 100 : 0;

    // Financials
    const totalProfit = posDecisions.reduce((sum, d) => sum + d.netProfit, 0);
    // bb/100 logic: (netProfit / (BB * hands)) * 100
    // But we don't have the specific BB per hand in the decision, we have stackBb.
    // However, netProfit is already in absolute chips. 
    // Usually bb/100 requires knowing the BB size.
    // If hero won 10,000 chips and blind is 1,000 -> that's 10bb.
    // We can't calculate exact bb/100 without the BB size from Hand.
    // I'll use a hack if BB is not present: just show chips/100 for now or pass BB in.
    // Better: let's just show Net Chips for now until we pass BB through.
    
    results.push({
      position: pos,
      hands: total,
      vpip: total > 0 ? (vpipCount / total) * 100 : 0,
      pfr: total > 0 ? (pfrCount / total) * 100 : 0,
      compliance: eligible.length > 0 ? (compliant / eligible.length) * 100 : 0,
      winPct,
      totalProfit,
      bb100: 0, // Placeholder for now
    });
  }

  return results;
}
