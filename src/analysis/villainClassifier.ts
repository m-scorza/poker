/**
 * Villain auto-classification using MDA (Mass Data Analysis) criteria.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PARKED 2026-06-23 — REVISIT WHEN BETTER-RESOURCED.                        │
 * │ The owner wants to bring auto-archetypes back later "when richer", done  │
 * │ properly. For now `classifyVillain` / `getExploitAdvice` are DORMANT:     │
 * │ nothing calls them (store no longer classifies; VillainsPage/CareerPage   │
 * │ show only observed stats + manual notes — no guessed label). They stay    │
 * │ here, exported and tested, so revival is just re-wiring the call sites.   │
 * │ `computeVillainStats` / `emptyCounters` remain LIVE (real-stat pipeline). │
 * │ See docs/product/ROADMAP.md "Parked".                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Source: docs/knowledge/strategy/08-gto-and-exploits.md §3
 * Thresholds from: CLAUDE.md "Villain Tracker" section
 *
 * Classification requires minimum hand counts:
 * - 30 hands: tentative classification (low confidence)
 * - 100+ hands: confident classification (high confidence)
 */

import type {
  VillainArchetype,
  ArchetypeConfidence,
  VillainStats,
  VillainRawCounters,
} from '../types/villain';

/** Minimum hands for tentative classification. */
const MIN_HANDS_TENTATIVE = 30;

/** Minimum hands for confident classification. */
const MIN_HANDS_CONFIDENT = 100;

/** Medium confidence threshold. */
const MIN_HANDS_MEDIUM = 60;

/**
 * Classify a villain's archetype based on observed stats.
 *
 * | Archetype        | Criteria                               | Exploit                              |
 * |------------------|----------------------------------------|--------------------------------------|
 * | Fish             | VPIP − PFR > 15                        | Value bet wider, bluff less          |
 * | Nit              | VPIP < 18, PFR < 14                    | Steal wide, fold to aggression       |
 * | TAG              | VPIP 20-28, PFR 18-25, AF > 2          | Respect raises, 3-bet light          |
 * | LAG              | VPIP 28-40, PFR 24-35, AF > 3          | Call down wider, trap more           |
 * | Calling Station  | VPIP > 35, AF < 1.5                    | Never bluff, value bet relentlessly  |
 * | Maniac           | VPIP > 40, PFR > 30, AF > 4            | Let them hang themselves, call down  |
 */
export function classifyVillain(
  stats: VillainStats,
  totalHands: number,
): { archetype: VillainArchetype | null; confidence: ArchetypeConfidence } {
  if (totalHands < MIN_HANDS_TENTATIVE) {
    return { archetype: null, confidence: 'low' };
  }

  const confidence: ArchetypeConfidence =
    totalHands >= MIN_HANDS_CONFIDENT ? 'high' :
    totalHands >= MIN_HANDS_MEDIUM ? 'medium' : 'low';

  const { vpip, pfr, af } = stats;
  const vpipPfrGap = vpip - pfr;

  // Order matters: check most distinctive patterns first

  // Maniac: VPIP > 40, PFR > 30, AF > 4
  if (vpip > 40 && pfr > 30 && af > 4) {
    return { archetype: 'maniac', confidence };
  }

  // Calling Station: VPIP > 35, AF < 1.5
  if (vpip > 35 && af < 1.5) {
    return { archetype: 'calling_station', confidence };
  }

  // Fish / Recreational: VPIP − PFR > 15
  if (vpipPfrGap > 15) {
    return { archetype: 'fish', confidence };
  }

  // LAG: VPIP 28-40, PFR 24-35, AF > 3
  if (vpip >= 28 && vpip <= 40 && pfr >= 24 && pfr <= 35 && af > 3) {
    return { archetype: 'lag', confidence };
  }

  // Nit: VPIP < 18, PFR < 14
  if (vpip < 18 && pfr < 14) {
    return { archetype: 'nit', confidence };
  }

  // TAG: VPIP 20-28, PFR 18-25, AF > 2
  if (vpip >= 20 && vpip <= 28 && pfr >= 18 && pfr <= 25 && af > 2) {
    return { archetype: 'tag', confidence };
  }

  // No clear classification — could be transitional or mixed
  return { archetype: null, confidence };
}

/**
 * Compute VillainStats from raw counters.
 */
export function computeVillainStats(counters: VillainRawCounters): VillainStats {
  const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);

  const totalActions = counters.totalBets + counters.totalRaises + counters.totalCalls;
  const af = counters.totalCalls === 0
    ? (totalActions > 0 ? 99 : 0) // Infinite AF approximation
    : (counters.totalBets + counters.totalRaises) / counters.totalCalls;

  return {
    vpip: pct(counters.vpipHands, counters.totalHands),
    pfr: pct(counters.pfrHands, counters.totalHands),
    threeBetPct: pct(counters.threeBetMade, counters.threeBetOpps),
    foldToThreeBet: pct(counters.foldToThreeBetMade, counters.foldToThreeBetOpps),
    cbetFlop: pct(counters.cbetFlopMade, counters.cbetFlopOpps),
    cbetTurn: pct(counters.cbetTurnMade, counters.cbetTurnOpps),
    foldToCbet: pct(counters.foldToCbetMade, counters.foldToCbetOpps),
    wtsd: pct(counters.wtsdHands, counters.vpipHands),
    wsd: pct(counters.wsdHands, counters.wtsdHands),
    af: Math.round(af * 100) / 100,
    limpPct: pct(counters.limpHands, counters.totalHands),
  };
}

/**
 * Create empty raw counters (for initializing a new villain profile).
 */
export function emptyCounters(): VillainRawCounters {
  return {
    totalHands: 0,
    vpipHands: 0,
    pfrHands: 0,
    threeBetOpps: 0,
    threeBetMade: 0,
    foldToThreeBetOpps: 0,
    foldToThreeBetMade: 0,
    cbetFlopOpps: 0,
    cbetFlopMade: 0,
    cbetTurnOpps: 0,
    cbetTurnMade: 0,
    foldToCbetOpps: 0,
    foldToCbetMade: 0,
    wtsdHands: 0,
    wsdHands: 0,
    limpHands: 0,
    totalBets: 0,
    totalRaises: 0,
    totalCalls: 0,
  };
}

/**
 * Get exploit recommendations for a given archetype.
 * Source: CLAUDE.md "Villain Tracker" table, [08-gto §3]
 */
export function getExploitAdvice(archetype: VillainArchetype): string {
  switch (archetype) {
    case 'fish':
      return 'Value bet wider, bluff less. They call too much with weak hands.';
    case 'nit':
      return 'Steal wide, fold to their aggression. When they raise, they have it.';
    case 'tag':
      return 'Respect their raises. 3-bet light occasionally to exploit their tight image.';
    case 'lag':
      return 'Call down wider, trap more. They bluff frequently — let them hang themselves.';
    case 'calling_station':
      return 'Never bluff. Value bet relentlessly — they will call with marginal hands.';
    case 'maniac':
      return 'Let them hang themselves. Call down with medium-strength hands, trap with monsters.';
  }
}

/**
 * Check if a villain is a recreational player (MDA population filter).
 * Source: [08-gto §3] — "recreational filter: VPIP-PFR > 15"
 */
export function isRecreational(stats: VillainStats): boolean {
  return stats.vpip - stats.pfr > 15;
}

/**
 * Check if a villain is a regular (MDA population filter).
 * Source: [08-gto §3] — "reg filter: VPIP < 35, VPIP-PFR < 10"
 */
export function isRegular(stats: VillainStats): boolean {
  return stats.vpip < 35 && stats.vpip - stats.pfr < 10;
}
