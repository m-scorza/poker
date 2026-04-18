/**
 * Leak detection engine.
 *
 * Automatically identifies leaks in hero's play by comparing aggregate stats
 * against profile-specific thresholds.
 *
 * Source: CLAUDE.md "Leak Analyzer", docs/strategy/09-study-methods-and-tools.md §4
 */

import type { HeroDecision } from '../types/analysis';
import type { StrategyProfile } from '../data/strategyProfiles';
import { getThresholds } from '../data/strategyProfiles';

export type LeakSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Leak {
  id: string;
  name: string;
  description: string;
  severity: LeakSeverity;
  /** Current value of the metric */
  value: number;
  /** Target range [min, max] */
  target: [number, number];
  /** How far outside the target (percentage points) */
  deviation: number;
  /** Number of hands in the sample */
  sampleSize: number;
}

export interface AggregateStats {
  totalHands: number;
  vpipHands: number;       // Hands where hero voluntarily put money in
  pfrHands: number;        // Hands where hero raised preflop
  threeBetOpps: number;    // Opportunities to 3-bet
  threeBetMade: number;    // Actually 3-bet
  cbetOpps: number;        // C-bet opportunities (PFR + saw flop)
  cbetMade: number;        // C-bets made
  cbetHUOpps: number;      // C-bet opportunities HU
  cbetHUMade: number;      // C-bets made HU
  doubleBarrelOpps: number;
  doubleBarrelMade: number;
  wtsdHands: number;       // Went to showdown
  wonSDHands: number;      // Won at showdown
  limpHands: number;       // Preflop limps (call with no prior raise)
  totalBets: number;       // For AF calculation
  totalRaises: number;     // For AF calculation
  totalCalls: number;      // For AF calculation
  complianceEligible: number;
  complianceCompliant: number;
  postflopErrors: Map<string, { count: number; sample: number; note: string; source: string }>;
}

/**
 * Compute aggregate stats from an array of HeroDecisions.
 */
export function computeAggregateStats(decisions: HeroDecision[]): AggregateStats {
  const stats: AggregateStats = {
    totalHands: decisions.length,
    vpipHands: 0,
    pfrHands: 0,
    threeBetOpps: 0,
    threeBetMade: 0,
    cbetOpps: 0,
    cbetMade: 0,
    cbetHUOpps: 0,
    cbetHUMade: 0,
    doubleBarrelOpps: 0,
    doubleBarrelMade: 0,
    wtsdHands: 0,
    wonSDHands: 0,
    limpHands: 0,
    totalBets: 0,
    totalRaises: 0,
    totalCalls: 0,
    complianceEligible: 0,
    complianceCompliant: 0,
    postflopErrors: new Map(),
  };

  for (const d of decisions) {
    // VPIP: raised or called preflop
    if (d.action === 'raise' || d.action === 'call') {
      stats.vpipHands++;
    }

    // PFR: raised preflop
    if (d.wasPreFlopRaiser) {
      stats.pfrHands++;
    }

    // Limps: called with no prior raise (RFI or FACING_LIMP scenario + call)
    if (d.action === 'call' && (d.scenario === 'RFI' || d.scenario === 'FACING_LIMP' || d.scenario === 'BLIND_WAR')) {
      stats.limpHands++;
    }

    // 3-bet opportunities: facing a raise from non-BTN/BB positions
    if (d.scenario === 'FACING_RAISE') {
      stats.threeBetOpps++;
      if (d.action === 'raise') {
        stats.threeBetMade++;
      }
    }

    // C-bet
    if (d.cbetOpportunity) {
      stats.cbetOpps++;
      if (d.cbetMade) stats.cbetMade++;

      if (d.cbetHU) {
        stats.cbetHUOpps++;
        if (d.cbetMade) stats.cbetHUMade++;
      }
    }

    // Double barrel
    if (d.doubleBarrelOpportunity) {
      stats.doubleBarrelOpps++;
      if (d.doubleBarrelMade) stats.doubleBarrelMade++;
    }

    // Showdown
    if (d.wentToShowdown) {
      stats.wtsdHands++;
      if (d.wonAtShowdown) stats.wonSDHands++;
    }

    // Compliance
    if (d.deviationType !== null || d.isCompliant) {
      stats.complianceEligible++;
      if (d.isCompliant) stats.complianceCompliant++;
    }

    // AF components: Aggression Factor = (bets + raises) / calls
    // We approximate using available decision data:
    // - PFR (raise) counts as a raise
    // - C-bet counts as a bet
    // - Double barrel counts as a bet
    // - Call action counts as a call
    // This is simplified since we don't have per-street action counts in HeroDecision
    if (d.action === 'raise') stats.totalRaises++;
    if (d.action === 'call') stats.totalCalls++;
    if (d.cbetMade) stats.totalBets++;
    if (d.doubleBarrelMade) stats.totalBets++;

    // Postflop detailed analysis
    if (d.postflopActions) {
      for (const action of d.postflopActions) {
        if (action.isCorrect === false) {
          const key = action.spot;
          const existing = stats.postflopErrors.get(key) || { count: 0, sample: 0, note: action.note, source: '' };
          
          // Source mapping for documentation
          let source = '';
          if (key === 'MISSED_CBET' || key === 'CBET_HU') source = '[Vol.2]';
          if (key === 'PROBE_TURN') source = '[D#07]';
          if (key === 'DONK_BET_TURN') source = '[D#21]';
          if (key === 'BET_VS_MISSED_CBET') source = '[Vol.3]';

          stats.postflopErrors.set(key, {
            count: existing.count + 1,
            sample: existing.sample + 1,
            note: action.note,
            source,
          });
        }
      }
    }
  }

  return stats;
}

/** Safe percentage: returns 0 if denominator is 0. */
function pct(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

/** Compute severity based on how far a value is from the target range. */
function computeSeverity(value: number, min: number, max: number): LeakSeverity {
  const belowMin = min - value;
  const aboveMax = value - max;
  const deviation = Math.max(belowMin, aboveMax, 0);

  if (deviation === 0) return 'low'; // Within range (shouldn't be a leak)
  if (deviation <= 5) return 'low';
  if (deviation <= 10) return 'medium';
  if (deviation <= 20) return 'high';
  return 'critical';
}

/**
 * Detect leaks from aggregate stats using profile-specific thresholds.
 */
export function detectLeaks(
  stats: AggregateStats,
  profile: StrategyProfile = 'game_plan',
): Leak[] {
  const thresholds = getThresholds(profile);
  const leaks: Leak[] = [];

  const vpip = pct(stats.vpipHands, stats.totalHands);
  const pfr = pct(stats.pfrHands, stats.totalHands);
  const cbetTotal = pct(stats.cbetMade, stats.cbetOpps);
  const cbetHU = pct(stats.cbetHUMade, stats.cbetHUOpps);
  const wtsd = stats.vpipHands > 0 ? pct(stats.wtsdHands, stats.vpipHands) : 0;
  const wonSD = pct(stats.wonSDHands, stats.wtsdHands);
  const limpPct = pct(stats.limpHands, stats.totalHands);
  const compliance = pct(stats.complianceCompliant, stats.complianceEligible);

  // VPIP (minimum 30 hands for meaningful detection)
  if (stats.totalHands >= 30 && (vpip < thresholds.vpip.min || vpip > thresholds.vpip.max)) {
    const deviation = vpip < thresholds.vpip.min
      ? thresholds.vpip.min - vpip
      : vpip - thresholds.vpip.max;
    leaks.push({
      id: 'vpip',
      name: 'VPIP',
      description: vpip < thresholds.vpip.min
        ? 'Playing too tight — not entering enough pots'
        : 'Playing too loose — entering too many pots',
      severity: computeSeverity(vpip, thresholds.vpip.min, thresholds.vpip.max),
      value: Math.round(vpip * 10) / 10,
      target: [thresholds.vpip.min, thresholds.vpip.max],
      deviation: Math.round(deviation * 10) / 10,
      sampleSize: stats.totalHands,
    });
  }

  // PFR (minimum 30 hands for meaningful detection)
  if (stats.totalHands >= 30 && (pfr < thresholds.pfr.min || pfr > thresholds.pfr.max)) {
    const deviation = pfr < thresholds.pfr.min
      ? thresholds.pfr.min - pfr
      : pfr - thresholds.pfr.max;
    leaks.push({
      id: 'pfr',
      name: 'PFR',
      description: pfr < thresholds.pfr.min
        ? 'Not raising enough preflop — too passive'
        : 'Raising too much preflop',
      severity: computeSeverity(pfr, thresholds.pfr.min, thresholds.pfr.max),
      value: Math.round(pfr * 10) / 10,
      target: [thresholds.pfr.min, thresholds.pfr.max],
      deviation: Math.round(deviation * 10) / 10,
      sampleSize: stats.totalHands,
    });
  }

  // 3-bet % (Advanced only)
  if (thresholds.threeBetPct && stats.threeBetOpps >= 10) {
    const threeBet = pct(stats.threeBetMade, stats.threeBetOpps);
    if (threeBet < thresholds.threeBetPct.min || threeBet > thresholds.threeBetPct.max) {
      const deviation = threeBet < thresholds.threeBetPct.min
        ? thresholds.threeBetPct.min - threeBet
        : threeBet - thresholds.threeBetPct.max;
      leaks.push({
        id: 'three_bet',
        name: '3-bet %',
        description: threeBet < thresholds.threeBetPct.min
          ? 'Not 3-betting enough — missing value and bluff opportunities'
          : '3-betting too frequently',
        severity: computeSeverity(threeBet, thresholds.threeBetPct.min, thresholds.threeBetPct.max),
        value: Math.round(threeBet * 10) / 10,
        target: [thresholds.threeBetPct.min, thresholds.threeBetPct.max],
        deviation: Math.round(deviation * 10) / 10,
        sampleSize: stats.threeBetOpps,
      });
    }
  }

  // C-bet Total
  if (stats.cbetOpps >= 5) {
    if (cbetTotal < thresholds.cbetTotal.min || cbetTotal > thresholds.cbetTotal.max) {
      const deviation = cbetTotal < thresholds.cbetTotal.min
        ? thresholds.cbetTotal.min - cbetTotal
        : cbetTotal - thresholds.cbetTotal.max;
      leaks.push({
        id: 'cbet_total',
        name: 'C-bet Total',
        description: cbetTotal < thresholds.cbetTotal.min
          ? 'Missing c-bet opportunities — giving up equity'
          : 'C-betting too frequently in multiway pots',
        severity: computeSeverity(cbetTotal, thresholds.cbetTotal.min, thresholds.cbetTotal.max),
        value: Math.round(cbetTotal * 10) / 10,
        target: [thresholds.cbetTotal.min, thresholds.cbetTotal.max],
        deviation: Math.round(deviation * 10) / 10,
        sampleSize: stats.cbetOpps,
      });
    }
  }

  // C-bet HU (Critical leak in Game Plan)
  if (stats.cbetHUOpps >= 10) {
    if (cbetHU < thresholds.cbetHU.min) {
      leaks.push({
        id: 'cbet_hu',
        name: 'C-bet HU',
        description: 'Missed c-bets in heads-up pots as PFR — should be 100% in Game Plan',
        severity: profile === 'game_plan' ? 'critical' : computeSeverity(cbetHU, thresholds.cbetHU.min, thresholds.cbetHU.max),
        value: Math.round(cbetHU * 10) / 10,
        target: [thresholds.cbetHU.min, thresholds.cbetHU.max],
        deviation: Math.round((thresholds.cbetHU.min - cbetHU) * 10) / 10,
        sampleSize: stats.cbetHUOpps,
      });
    }
  }

  // WTSD
  if (stats.vpipHands >= 20) {
    if (wtsd < thresholds.wtsd.min || wtsd > thresholds.wtsd.max) {
      const deviation = wtsd < thresholds.wtsd.min
        ? thresholds.wtsd.min - wtsd
        : wtsd - thresholds.wtsd.max;
      leaks.push({
        id: 'wtsd',
        name: 'WTSD',
        description: wtsd > thresholds.wtsd.max
          ? 'Going to showdown too often — calling too wide on later streets'
          : 'Folding too much postflop — being exploited by aggression',
        severity: computeSeverity(wtsd, thresholds.wtsd.min, thresholds.wtsd.max),
        value: Math.round(wtsd * 10) / 10,
        target: [thresholds.wtsd.min, thresholds.wtsd.max],
        deviation: Math.round(deviation * 10) / 10,
        sampleSize: stats.vpipHands,
      });
    }
  }

  // Won at Showdown
  if (stats.wtsdHands >= 10) {
    if (wonSD < thresholds.wonSD.min) {
      leaks.push({
        id: 'won_sd',
        name: 'Won at SD',
        description: 'Losing too often at showdown — calling too light or bluff-catching poorly',
        severity: computeSeverity(wonSD, thresholds.wonSD.min, thresholds.wonSD.max),
        value: Math.round(wonSD * 10) / 10,
        target: [thresholds.wonSD.min, thresholds.wonSD.max],
        deviation: Math.round((thresholds.wonSD.min - wonSD) * 10) / 10,
        sampleSize: stats.wtsdHands,
      });
    }
  }

  // AF (Aggression Factor) — out-of-range alert
  // Requires a meaningful sample on both sides of the ratio.
  if (stats.totalCalls >= 10 && (stats.totalCalls + stats.totalBets + stats.totalRaises) >= 20) {
    const af = stats.totalCalls === 0 ? 0 : (stats.totalBets + stats.totalRaises) / stats.totalCalls;
    if (af < thresholds.af.min || af > thresholds.af.max) {
      const deviation = af < thresholds.af.min
        ? thresholds.af.min - af
        : af - thresholds.af.max;
      leaks.push({
        id: 'af',
        name: 'AF',
        description: af < thresholds.af.min
          ? 'Too passive — not enough bets/raises relative to calls'
          : 'Too aggressive — betting and raising beyond typical value frequency',
        severity: computeSeverity(af, thresholds.af.min, thresholds.af.max),
        value: Math.round(af * 100) / 100,
        target: [thresholds.af.min, thresholds.af.max],
        deviation: Math.round(deviation * 100) / 100,
        sampleSize: stats.totalCalls + stats.totalBets + stats.totalRaises,
      });
    }
  }

  // Limps (zero tolerance, minimum 20 hands)
  if (stats.totalHands >= 20 && limpPct > thresholds.limpPct.max) {
    leaks.push({
      id: 'limps',
      name: 'Limping',
      description: 'Open-limping detected — should always raise or fold (except HU BTN)',
      severity: limpPct > 5 ? 'high' : limpPct > 2 ? 'medium' : 'low',
      value: Math.round(limpPct * 10) / 10,
      target: [0, thresholds.limpPct.max],
      deviation: Math.round(limpPct * 10) / 10,
      sampleSize: stats.totalHands,
    });
  }

  // Range Compliance
  if (stats.complianceEligible >= 10) {
    if (compliance < thresholds.rangeCompliance.min) {
      leaks.push({
        id: 'compliance',
        name: 'Range Compliance',
        description: 'Deviating from theoretical ranges too often',
        severity: computeSeverity(compliance, thresholds.rangeCompliance.min, 100),
        value: Math.round(compliance * 10) / 10,
        target: [thresholds.rangeCompliance.min, 100],
        deviation: Math.round((thresholds.rangeCompliance.min - compliance) * 10) / 10,
        sampleSize: stats.complianceEligible,
      });
    }
  }

  // VPIP-PFR gap (Advanced only)
  if (thresholds.vpipPfrGap && stats.totalHands >= 50) {
    const gap = vpip - pfr;
    if (gap > thresholds.vpipPfrGap.max) {
      leaks.push({
        id: 'vpip_pfr_gap',
        name: 'VPIP-PFR Gap',
        description: 'Too passive preflop — large gap between VPIP and PFR indicates too much calling',
        severity: gap > 15 ? 'high' : gap > 12 ? 'medium' : 'low',
        value: Math.round(gap * 10) / 10,
        target: [0, thresholds.vpipPfrGap.max],
        deviation: Math.round((gap - thresholds.vpipPfrGap.max) * 10) / 10,
        sampleSize: stats.totalHands,
      });
    }
  }

  // Postflop Aggregated Leaks
  stats.postflopErrors.forEach((error, key) => {
    if (error.count >= 2) { // Minimum 2 instances to flag as a "leak"
        leaks.push({
            id: `postflop_${key.toLowerCase()}`,
            name: `Postflop: ${key.replace(/_/g, ' ')}`,
            description: `${error.note} ${error.source ? `Source: ${error.source}` : ''}`,
            severity: error.count >= 5 ? 'high' : 'medium',
            value: error.count,
            target: [0, 0],
            deviation: error.count,
            sampleSize: error.sample,
        });
    }
  });

  // Sort by severity (critical first)
  const severityOrder: Record<LeakSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  leaks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return leaks;
}
