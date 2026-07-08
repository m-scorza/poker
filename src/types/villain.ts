/**
 * Villain tracking types.
 *
 * Source: CLAUDE.md "Villain Tracker", docs/knowledge/strategy/08-gto-and-exploits.md §3 (MDA framework)
 */

import type { Position, Scenario } from './analysis';

/**
 * MDA-derived villain archetype. Source: [D#04, 08-gto §3]
 *
 * ⏸ PARKED 2026-06-23 — auto-classification is dormant (not computed or shown);
 * these fields stay on `VillainProfile` for a future revival "when richer". See
 * the banner in `src/analysis/villainClassifier.ts` + ROADMAP "Parked".
 */
export type VillainArchetype =
  | 'fish'             // VPIP − PFR > 15
  | 'nit'              // VPIP < 18, PFR < 14
  | 'tag'              // VPIP 20-28, PFR 18-25, AF > 2
  | 'lag'              // VPIP 28-40, PFR 24-35, AF > 3
  | 'calling_station'  // VPIP > 35, AF < 1.5
  | 'maniac';          // VPIP > 40, PFR > 30, AF > 4

export type ArchetypeConfidence = 'low' | 'medium' | 'high';

/** Stats tracked per villain. Computed from observed actions. */
export interface VillainStats {
  vpip: number;
  pfr: number;
  threeBetPct: number;
  foldToThreeBet: number;
  cbetFlop: number;
  cbetTurn: number;
  foldToCbet: number;
  wtsd: number;
  wsd: number;          // Won $ at showdown
  af: number;           // Aggression factor: (bets + raises) / calls
  limpPct: number;
}

/** Per-position stats subset. */
export interface PositionStats {
  hands: number;
  vpip: number;
  pfr: number;
  threeBetPct: number;
  rawCounters: PositionStatsRawCounters;
}

/** Raw counters for position-specific preflop stats. */
export interface PositionStatsRawCounters {
  totalHands: number;
  vpipHands: number;
  pfrHands: number;
  threeBetOpps: number;
  threeBetMade: number;
}

/** A hand revealed at showdown — used to build villain's actual range profile. */
interface ShownHand {
  handId: string;
  date: Date;
  position: Position;
  handKey: string;      // Canonical form: "AKs", "JJ", etc.
  scenario: Scenario;
  action: string;
}

/** Full villain profile, aggregated across all observed hands. */
export interface VillainProfile {
  playerName: string;
  firstSeen: Date;
  lastSeen: Date;
  totalHands: number;
  stats: VillainStats;
  statsByPosition: Partial<Record<Position, PositionStats>>;
  rawCounters: VillainRawCounters;
  shownHands: ShownHand[];
  archetype: VillainArchetype | null;
  archetypeConfidence: ArchetypeConfidence;
  notes: string;
  tags: string[];
}

/** Raw counters used to incrementally build VillainStats. */
export interface VillainRawCounters {
  totalHands: number;
  vpipHands: number;
  pfrHands: number;
  threeBetOpps: number;
  threeBetMade: number;
  foldToThreeBetOpps: number;
  foldToThreeBetMade: number;
  cbetFlopOpps: number;
  cbetFlopMade: number;
  cbetTurnOpps: number;
  cbetTurnMade: number;
  foldToCbetOpps: number;
  foldToCbetMade: number;
  wtsdHands: number;
  wsdHands: number;
  limpHands: number;
  totalBets: number;
  totalRaises: number;
  totalCalls: number;
}
