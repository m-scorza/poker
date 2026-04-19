/**
 * Session manager — auto-groups hands into sessions by time window.
 *
 * Default gap: 4 hours between consecutive hands = new session.
 * Source: CLAUDE.md "Session Manager"
 */

import type { Hand, Tournament } from '../types/hand';
import type { HeroDecision } from '../types/analysis';
import type { AggregateStats } from '../analysis/leakDetector';
import { computeAggregateStats } from '../analysis/leakDetector';

export interface Session {
  id: string;
  startTime: Date;
  endTime: Date;
  tournamentIds: string[];
  hands: Hand[];
  totalHands: number;
  stats: AggregateStats;
  buyIns: number;
  prizes: number;
  pnl: number;
  roi: number;
  nemesis?: { 
    name: string; 
    amount: number; 
    type: 'assassin' | 'crusher' | 'damage';
  };
}

const DEFAULT_GAP_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Group hands into sessions based on time gaps.
 *
 * @param hands - All hands, will be sorted by date internally
 * @param decisions - Hero decisions keyed by handId
 * @param gapMs - Gap in milliseconds to trigger a new session (default: 4 hours)
 */
export function groupIntoSessions(
  hands: Hand[],
  decisions: Map<string, HeroDecision>,
  tournaments: Map<string, Tournament>,
  gapMs: number = DEFAULT_GAP_MS,
): Session[] {
  if (hands.length === 0) return [];

  // Sort by date ascending
  const sorted = [...hands].sort((a, b) => a.date.getTime() - b.date.getTime());

  const sessions: Session[] = [];
  let currentHands: Hand[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const hand = sorted[i]!;
    const prevHand = sorted[i - 1]!;
    const gap = hand.date.getTime() - prevHand.date.getTime();

    if (gap > gapMs) {
      sessions.push(buildSession(currentHands, decisions, tournaments, sessions.length));
      currentHands = [hand];
    } else {
      currentHands.push(hand);
    }
  }

  if (currentHands.length > 0) {
    sessions.push(buildSession(currentHands, decisions, tournaments, sessions.length));
  }

  return sessions;
}

function buildSession(
  hands: Hand[],
  decisions: Map<string, HeroDecision>,
  tournaments: Map<string, Tournament>,
  index: number,
): Session {
  const tournamentIds = [...new Set(hands.map((h) => h.tournamentId))];
  const sessionDecisions = hands
    .map((h) => decisions.get(h.id))
    .filter((d): d is HeroDecision => d !== undefined);

  let buyIns = 0;
  let prizes = 0;
  for (const tid of tournamentIds) {
    const t = tournaments.get(tid);
    if (t) {
      if (t.currency === 'PLAY' || t.currency === 'TICKET') {
        // Exclude 0 value out-of-pocket costs and play-money from raw USD financial tracking.
        continue;
      }
      buyIns += (t.buyIn + t.fee);
      prizes += (t.prize ?? 0);
    }
  }
  const pnl = prizes - buyIns;
  const roi = buyIns > 0 ? (pnl / buyIns) * 100 : 0;

  // Advanced Nemesis Detection
  const nemesisMap = new Map<string, number>();
  let assassin: string | undefined;
  let crusher = { name: '', amount: 0 };
  
  for (const h of hands) {
    const decision = decisions.get(h.id);
    const heroNet = decision?.netProfit ?? (h.heroChipsAfter - h.heroChipsBefore);
    
    // Crusher: Villain who won the most in a single hand against hero
    if (heroNet < 0) {
      for (const v of h.villainDeltas) {
        if (v.net > crusher.amount) {
          crusher = { name: v.name, amount: v.net };
        }
        // Total damage
        nemesisMap.set(v.name, (nemesisMap.get(v.name) || 0) + v.net);
      }
    }
    
    // Assassin: Hero went to 0 chips in this hand
    if (h.heroChipsAfter === 0 && h.heroChipsBefore > 0) {
      const winner = h.villainDeltas.sort((a, b) => b.net - a.net)[0];
      if (winner) assassin = winner.name;
    }
  }

  let damageNemesis: { name: string; amount: number } | undefined;
  let maxDamage = 0;
  nemesisMap.forEach((amount, name) => {
    if (amount > maxDamage) {
      maxDamage = amount;
      damageNemesis = { name, amount };
    }
  });

  const finalNemesis = assassin 
    ? { name: assassin, amount: nemesisMap.get(assassin) || 0, type: 'assassin' as const } 
    : crusher.amount > 0 
      ? { name: crusher.name, amount: crusher.amount, type: 'crusher' as const }
      : damageNemesis 
        ? { name: damageNemesis.name, amount: damageNemesis.amount, type: 'damage' as const }
        : undefined;

  return {
    id: `session-${index + 1}`,
    startTime: hands[0]!.date,
    endTime: hands[hands.length - 1]!.date,
    tournamentIds,
    hands,
    totalHands: hands.length,
    stats: computeAggregateStats(sessionDecisions),
    buyIns,
    prizes,
    pnl,
    roi,
    nemesis: finalNemesis,
  };
}

/**
 * Compute per-session stat summaries for trend charts.
 */
export interface SessionTrendPoint {
  sessionId: string;
  date: Date;
  hands: number;
  vpip: number;
  pfr: number;
  cbetTotal: number;
  cbetHU: number;
  wtsd: number;
  compliance: number;
  pnl: number;
  cumulativePnl: number;
}

export function computeSessionTrends(sessions: Session[]): SessionTrendPoint[] {
  let cumulativePnl = 0;
  return sessions.map((s) => {
    const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);
    cumulativePnl += s.pnl;

    return {
      sessionId: s.id,
      date: s.startTime,
      hands: s.totalHands,
      vpip: Math.round(pct(s.stats.vpipHands, s.stats.totalHands) * 10) / 10,
      pfr: Math.round(pct(s.stats.pfrHands, s.stats.totalHands) * 10) / 10,
      cbetTotal: Math.round(pct(s.stats.cbetMade, s.stats.cbetOpps) * 10) / 10,
      cbetHU: Math.round(pct(s.stats.cbetHUMade, s.stats.cbetHUOpps) * 10) / 10,
      wtsd: Math.round(pct(s.stats.wtsdHands, s.stats.sawFlopHands) * 10) / 10,
      compliance: Math.round(pct(s.stats.complianceCompliant, s.stats.complianceEligible) * 10) / 10,
      pnl: s.pnl,
      cumulativePnl
    };
  });
}

/**
 * Compute running stat trends WITHIN a single session, grouped every N hands.
 * Used when user filters to a specific session so charts still show data.
 */
export function computeIntraSessionTrends(
  decisions: HeroDecision[],
  bucketSize: number = 25,
): SessionTrendPoint[] {
  if (decisions.length === 0) return [];
  const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);
  const points: SessionTrendPoint[] = [];
  
  let runVpip = 0, runPfr = 0, runComp = 0, runCompEl = 0, runWon = 0;
  let runSawFlop = 0, runWentToSd = 0;
  
  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i]!;
    if (d.action === 'raise' || d.action === 'call') runVpip++;
    if (d.wasPreFlopRaiser) runPfr++;
    if (d.sawFlop) runSawFlop++;
    if (d.wentToShowdown) runWentToSd++;
    if (d.deviationType !== null || d.isCompliant) {
      runCompEl++;
      if (d.isCompliant) runComp++;
    }
    runWon += d.netProfit;
    
    // Emit a point every bucketSize hands, and at the end
    if ((i + 1) % bucketSize === 0 || i === decisions.length - 1) {
      const total = i + 1;
      points.push({
        sessionId: 'intra',
        date: new Date(),
        hands: total,
        vpip: Math.round(pct(runVpip, total) * 10) / 10,
        pfr: Math.round(pct(runPfr, total) * 10) / 10,
        cbetTotal: 0,
        cbetHU: 0,
        wtsd: Math.round(pct(runWentToSd, runSawFlop) * 10) / 10,
        compliance: Math.round(pct(runComp, runCompEl) * 10) / 10,
        pnl: runWon,
        cumulativePnl: runWon,
      });
    }
  }
  
  return points;
}

