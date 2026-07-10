import { CURRICULUM_SEED_PACKS, type CurriculumSeedPack, type CurriculumSpotSeed } from '../../data/curriculumSeedPacks.generated';
import type { HeroDecision } from '../../types/analysis';

export const STARTER_DIAGNOSTIC_PACK: CurriculumSeedPack = {
  slug: 'starter-diagnostic',
  title: 'Starter diagnostic',
  description: 'Lower-confidence starter path from brand-neutral curriculum seeds for players without imported hand histories.',
  source: {
    kind: 'brand_neutralized_quiz_config',
    path: '../poker-knowledge/quiz_configs.json',
    sourceConfigIndexes: Array.from(new Set(CURRICULUM_SEED_PACKS.flatMap((pack) => pack.source.sourceConfigIndexes))),
  },
  spots: CURRICULUM_SEED_PACKS.reduce<CurriculumSpotSeed[]>(
    (spots, pack) => spots.concat(pack.spots.slice(0, 2)),
    [],
  ).slice(0, 8),
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

export function sourcePackTitleForStarterSpot(spot: CurriculumSpotSeed | null | undefined): string {
  if (!spot) return 'Curriculum seed';
  return CURRICULUM_SEED_PACKS.find((pack) => pack.spots.some((packSpot) => packSpot.id === spot.id))?.title ?? 'Curriculum seed';
}

export function diagnosticReviewAreaSummary(area: { misses: number; attempts: number }): string {
  const missLabel = area.misses === 1 ? 'miss' : 'misses';
  const spotLabel = area.attempts === 1 ? 'diagnostic spot' : 'diagnostic spots';
  return `${area.misses} ${missLabel} across ${area.attempts} ${spotLabel}`;
}

function curriculumScenarioForPack(pack: CurriculumSeedPack): HeroDecision['scenario'] {
  if (pack.slug.includes('3bet')) return 'FACING_3BET';
  if (pack.slug.includes('big-blind') || pack.slug.includes('bb-defense')) return 'BB_VS_RAISE';
  if (pack.slug.includes('blind-war')) return 'BLIND_WAR';
  return 'RFI';
}

function curriculumPosition(position: CurriculumSpotSeed['position']): HeroDecision['position'] {
  return position === 'LJ' ? 'MP' : position;
}

export function curriculumDecision(pack: CurriculumSeedPack, spot: CurriculumSpotSeed): HeroDecision {
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
