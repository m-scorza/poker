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
      buyIns += (t.buyIn + t.fee);
      prizes += (t.prize ?? 0);
    }
  }
  const pnl = prizes - buyIns;
  const roi = buyIns > 0 ? (pnl / buyIns) * 100 : 0;

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
      wtsd: Math.round(pct(s.stats.wtsdHands, s.stats.vpipHands) * 10) / 10,
      compliance: Math.round(pct(s.stats.complianceCompliant, s.stats.complianceEligible) * 10) / 10,
      pnl: s.pnl,
      cumulativePnl
    };
  });
}
