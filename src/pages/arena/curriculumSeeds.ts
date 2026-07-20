import { CURRICULUM_SEED_PACKS, type CurriculumSeedPack, type CurriculumSpotSeed } from '../../data/curriculumSeedPacks.generated';
import type { HeroDecision } from '../../types/analysis';

/**
 * Structural superset of CurriculumSeedPack that also fits the deal-from-range
 * packs imported from the trainer snapshot (their provenance kind and shape
 * differ, but they drive the same `curriculum` drill machinery).
 */
export interface ArenaCurriculumPack {
  slug: string;
  title: string;
  description: string;
  source: { kind: string; path: string; sourceConfigIndexes?: number[] };
  spots: CurriculumSpotSeed[];
}

export const STARTER_DIAGNOSTIC_PACK: CurriculumSeedPack = {
  slug: 'starter-diagnostic',
  title: 'Starter diagnostic',
  description: 'Lower-confidence starter path from brand-neutral curriculum seeds for players without imported hand histories.',
  source: {
    kind: 'brand_neutralized_quiz_config',
    path: '../poker-knowledge/quiz_configs.json',
    sourceConfigIndexes: Array.from(new Set(CURRICULUM_SEED_PACKS.flatMap((pack) => pack.source.sourceConfigIndexes))),
  },
  // One spot from every pack, in pack order, so the diagnostic samples across all
  // curriculum categories (preflop + postflop) instead of exhausting a fixed cap
  // on the first few packs and silently dropping the rest.
  spots: CURRICULUM_SEED_PACKS.flatMap<CurriculumSpotSeed>((pack) => pack.spots.slice(0, 1)),
};

export const CURRICULUM_PACK_GROUPS: Array<{ title: string; description: string; slugs: string[] }> = [
  {
    title: 'Preflop foundations',
    description: 'Open, face 3-bets, and respond to opens before the hand gets complicated.',
    slugs: ['open-raise-fundamentals', 'facing-3bet-frontier', 'versus-open-raise'],
  },
  {
    title: 'Blind defense',
    description: 'Big blind, multiway, and blind-war decisions where players leak fast.',
    slugs: ['big-blind-defense', 'multiway-bb-defense', 'blind-war-preflop'],
  },
  {
    title: 'Postflop play',
    description: 'C-bet, continue, and respond across in-position and out-of-position nodes.',
    slugs: ['in-position-cbet-vs-bb', 'in-position-postflop', 'in-position-turn-river-barrels-vs-bb', 'out-of-position-cbet', 'versus-bb-cbet'],
  },
];

function sourcePackForCurriculumSpot(spot: CurriculumSpotSeed | null | undefined): CurriculumSeedPack | null {
  if (!spot) return null;
  return CURRICULUM_SEED_PACKS.find((pack) => pack.spots.some((packSpot) => packSpot.id === spot.id)) ?? null;
}

export function sourcePackTitleForStarterSpot(spot: CurriculumSpotSeed | null | undefined): string {
  return sourcePackForCurriculumSpot(spot)?.title ?? 'Curriculum seed';
}

// Postflop curriculum packs (see the 'Postflop play' group in
// CURRICULUM_PACK_GROUPS). The Scenario enum is preflop-only, so postflop content
// cannot ride the scenario badge — these get their own stage/badge instead of
// falling through to the preflop 'RFI'/'Pre-flop' default.
const POSTFLOP_CURRICULUM_PACK_SLUGS = new Set<string>([
  'in-position-cbet-vs-bb',
  'in-position-postflop',
  'in-position-turn-river-barrels-vs-bb',
  'out-of-position-cbet',
  'versus-bb-cbet',
]);

// Stage/badge derive from the spot's *source* pack, not the pack currently being
// drilled: a starter-diagnostic session mixes spots from every pack, so a postflop
// seed inside it must still read as postflop.
export function curriculumSpotStage(spot: CurriculumSpotSeed | null | undefined): 'preflop' | 'postflop' {
  const pack = sourcePackForCurriculumSpot(spot);
  return pack && POSTFLOP_CURRICULUM_PACK_SLUGS.has(pack.slug) ? 'postflop' : 'preflop';
}

export function curriculumSpotBadge(spot: CurriculumSpotSeed | null | undefined): string {
  const pack = sourcePackForCurriculumSpot(spot);
  if (!pack) return 'Curriculum';
  if (POSTFLOP_CURRICULUM_PACK_SLUGS.has(pack.slug)) return 'Postflop';
  return curriculumScenarioForPack(pack).replace('_', ' ');
}

export function diagnosticReviewAreaSummary(area: { misses: number; attempts: number }): string {
  const missLabel = area.misses === 1 ? 'miss' : 'misses';
  const spotLabel = area.attempts === 1 ? 'diagnostic spot' : 'diagnostic spots';
  return `${area.misses} ${missLabel} across ${area.attempts} ${spotLabel}`;
}

function curriculumScenarioForPack(pack: Pick<ArenaCurriculumPack, 'slug'>): HeroDecision['scenario'] {
  if (pack.slug.includes('3bet') || pack.slug.includes('3-bet')) return 'FACING_3BET';
  if (pack.slug.includes('big-blind') || pack.slug.includes('bb-defense')) return 'BB_VS_RAISE';
  if (pack.slug.includes('blind-war') || pack.slug.includes('blind-battle')) return 'BLIND_WAR';
  return 'RFI';
}

function curriculumPosition(position: CurriculumSpotSeed['position']): HeroDecision['position'] {
  return position === 'LJ' ? 'MP' : position;
}

export function curriculumDecision(pack: Pick<ArenaCurriculumPack, 'slug'>, spot: CurriculumSpotSeed): HeroDecision {
  return {
    handId: `curriculum-${spot.id}`,
    position: curriculumPosition(spot.position),
    handKey: spot.combo,
    stackBb: spot.stackBb,
    scenario: curriculumScenarioForPack(pack),
    action: 'fold',
    isCompliant: true,
    deviationType: null,
    sawFlop: false,
    wasPreFlopRaiser: false,
    cbetOpportunity: false,
    cbetMade: false,
    cbetHU: false,
    doubleBarrelOpportunity: false,
    doubleBarrelMade: false,
    wentToShowdown: false,
    wonAtShowdown: false,
    wonAmount: 0,
    netProfit: 0,
  };
}
