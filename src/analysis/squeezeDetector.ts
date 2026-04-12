/**
 * Squeeze play detector.
 *
 * A squeeze is a 3-bet made when there is an open raiser AND at least one caller.
 * This is distinct from a standard 3-bet (which faces only a raiser with no callers).
 *
 * Sources:
 * - docs/strategy/03-preflop-strategy.md §4 "Squeeze Play"
 * - docs/strategy/10-glossary.md
 * - [Vol.3]
 */

import type { Action } from '../types/hand';
import type { Position } from '../types/analysis';

export interface SqueezeSpot {
  handId: string;
  heroPosition: Position;
  openerPosition: string; // Who opened
  callerCount: number;    // How many callers before hero
  heroAction: 'squeeze' | 'fold' | 'call' | 'other';
  heroHandKey: string;
  stackBb: number;
  /** Recommended sizing: standard 3-bet + 1bb per caller. Source: [Vol.3] */
  recommendedSizing: number;
  note: string;
}

/**
 * Detect if a hand contains a squeeze opportunity for hero.
 *
 * A squeeze opportunity exists when:
 * 1. Someone opened (raised)
 * 2. At least one player called the open
 * 3. Hero hasn't acted yet (or hero is the one who could squeeze)
 *
 * Returns null if no squeeze opportunity exists.
 */
export function detectSqueezeOpportunity(
  actions: Action[],
  heroName: string,
  heroPosition: Position,
  heroHandKey: string,
  stackBb: number,
  bigBlind: number,
): SqueezeSpot | null {
  const FORCED = new Set(['post_ante', 'post_sb', 'post_bb']);

  const preflopActions = actions.filter(
    (a) => a.street === 'preflop' && !FORCED.has(a.actionType),
  );

  // Find hero's first voluntary action index
  const heroIdx = preflopActions.findIndex((a) => a.playerName === heroName);
  if (heroIdx === -1) return null;

  // Actions before hero
  const actionsBefore = preflopActions.slice(0, heroIdx);

  // Find first raiser
  const firstRaiseIdx = actionsBefore.findIndex((a) => a.actionType === 'raise');
  if (firstRaiseIdx === -1) return null; // No open raise = no squeeze opportunity

  const opener = actionsBefore[firstRaiseIdx]!;

  // Check for callers AFTER the open raise but BEFORE hero
  const actionsAfterOpen = actionsBefore.slice(firstRaiseIdx + 1);
  const callers = actionsAfterOpen.filter((a) => a.actionType === 'call');

  if (callers.length === 0) return null; // No callers = standard 3-bet spot, not squeeze

  // Check if there's a second raise before hero (someone already 3-bet)
  const secondRaise = actionsAfterOpen.some((a) => a.actionType === 'raise');
  if (secondRaise) return null; // Already 3-bet = not a squeeze opportunity for hero

  // This is a squeeze spot! What did hero do?
  const heroAction = preflopActions[heroIdx]!;
  let heroSqueezeAction: SqueezeSpot['heroAction'];

  if (heroAction.actionType === 'raise') {
    heroSqueezeAction = 'squeeze';
  } else if (heroAction.actionType === 'fold') {
    heroSqueezeAction = 'fold';
  } else if (heroAction.actionType === 'call') {
    heroSqueezeAction = 'call';
  } else {
    heroSqueezeAction = 'other';
  }

  // Calculate recommended sizing
  // Standard 3-bet size + 1bb per caller (Source: 03-preflop-strategy.md §4)
  const openSize = opener.amount ?? (bigBlind * 2.5);
  const standardThreeBet = openSize * 3; // Approximate 3x the open
  const recommendedSizing = standardThreeBet + (bigBlind * callers.length);

  let note: string;
  if (heroSqueezeAction === 'squeeze') {
    note = `Squeeze de ${heroPosition} vs ${opener.playerName} + ${callers.length} caller(s).`;
  } else if (heroSqueezeAction === 'call') {
    note = `Oportunidade de squeeze perdida — cold call em vez de squeeze.`;
  } else if (heroSqueezeAction === 'fold') {
    note = `Fold no spot de squeeze — pode ser correto com mão fraca.`;
  } else {
    note = `Spot de squeeze detectado.`;
  }

  return {
    handId: actions[0]?.handId ?? '',
    heroPosition,
    openerPosition: opener.playerName,
    callerCount: callers.length,
    heroAction: heroSqueezeAction,
    heroHandKey: heroHandKey,
    stackBb,
    recommendedSizing,
    note,
  };
}

/**
 * Batch detect squeeze opportunities from multiple hands' actions.
 */
export function batchDetectSqueeze(
  handsData: Array<{
    actions: Action[];
    heroName: string;
    heroPosition: Position;
    heroHandKey: string;
    stackBb: number;
    bigBlind: number;
  }>,
): SqueezeSpot[] {
  const results: SqueezeSpot[] = [];
  for (const data of handsData) {
    const result = detectSqueezeOpportunity(
      data.actions,
      data.heroName,
      data.heroPosition,
      data.heroHandKey,
      data.stackBb,
      data.bigBlind,
    );
    if (result) {
      results.push(result);
    }
  }
  return results;
}

/**
 * Compute squeeze stats.
 */
export function squeezeStats(spots: SqueezeSpot[]): {
  totalOpportunities: number;
  squeezed: number;
  folded: number;
  coldCalled: number;
  squeezePct: number;
} {
  const squeezed = spots.filter((s) => s.heroAction === 'squeeze').length;
  const folded = spots.filter((s) => s.heroAction === 'fold').length;
  const coldCalled = spots.filter((s) => s.heroAction === 'call').length;
  const total = spots.length;

  return {
    totalOpportunities: total,
    squeezed,
    folded,
    coldCalled,
    squeezePct: total === 0 ? 0 : (squeezed / total) * 100,
  };
}
