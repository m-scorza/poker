import { RANGE_PACK_REGISTRY } from '../../data/ctPacks/registry.generated';
import { RANGE_PACK_LOADERS } from '../../data/ctPacks/loaders.generated';
import type { RangePack, RangePackCell, RangePackRegistryEntry } from '../../data/ctPacks/types';
import type { CurriculumSpotSeed } from '../../data/curriculumSeedPacks.generated';
import type { ArenaCurriculumPack } from './curriculumSeeds';

export const RANGE_PACK_REGISTRY_ENTRIES: readonly RangePackRegistryEntry[] = RANGE_PACK_REGISTRY;

const DEAL_FROM_RANGE_SESSION_SIZE = 20;

export const METHODOLOGY_LABELS: Record<RangePackRegistryEntry['methodology'], string> = {
  gto_cev: 'Solver-derived baseline',
  mda_exploit: 'Population exploit',
};

export const TIER_LABELS: Record<RangePackRegistryEntry['tier'], string> = {
  foundational: 'Foundational',
  blind_battles: 'Blind battles',
  advanced: 'Advanced',
};

export async function loadRangePack(slug: string): Promise<RangePack | null> {
  const loader = RANGE_PACK_LOADERS[slug];
  if (!loader) return null;
  const module = await loader();
  return module.default;
}

const SEED_POSITIONS: ReadonlySet<CurriculumSpotSeed['position']> = new Set(['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']);
const RANK_ORDER = '23456789TJQKA';

function seedPosition(position: string): CurriculumSpotSeed['position'] {
  if (position === 'UTG+1') return 'LJ';
  return SEED_POSITIONS.has(position as CurriculumSpotSeed['position']) ? (position as CurriculumSpotSeed['position']) : 'BTN';
}

function comboClass(combo: string): string {
  const exact = combo.match(/^([2-9TJQKA])[cdhs]([2-9TJQKA])[cdhs]$/i);
  if (!exact) return combo;
  const r1 = exact[1]!.toUpperCase();
  const r2 = exact[2]!.toUpperCase();
  const suited = combo[1]!.toLowerCase() === combo[3]!.toLowerCase();
  if (r1 === r2) return `${r1}${r2}`;
  const ordered = RANK_ORDER.indexOf(r1) >= RANK_ORDER.indexOf(r2) ? [r1, r2] : [r2, r1];
  return `${ordered[0]}${ordered[1]}${suited ? 's' : 'o'}`;
}

interface CellSample {
  combos: string[];
  actionsByCombo: Map<string, string[]>;
  legalActions: string[];
}

function indexCell(cell: RangePackCell): CellSample {
  const merged = new Map<string, Set<string>>();
  for (const bucket of cell.buckets) {
    for (const combo of bucket.combos) {
      const set = merged.get(combo) ?? new Set<string>();
      for (const action of bucket.actions) set.add(action);
      merged.set(combo, set);
    }
  }
  const combos = (cell.dealCombos?.length ? cell.dealCombos : Array.from(merged.keys())).slice().sort();
  const actionsByCombo = new Map(Array.from(merged, ([combo, actions]) => [combo, Array.from(actions).sort()] as const));
  const legalActions = Array.from(new Set(cell.buckets.flatMap((bucket) => bucket.actions))).sort();
  return { combos, actionsByCombo, legalActions };
}

function exactComboCards(combo: string): [string, string] | undefined {
  const match = combo.match(/^([2-9TJQKA][cdhs])([2-9TJQKA][cdhs])$/i);
  return match ? [match[1]!, match[2]!] : undefined;
}

/**
 * Sample a fixed-size practice session from a deal-from-range pack: each spot
 * draws a real exact combo from a cell's dealt range and is graded by that
 * combo's accepted-action bucket membership (mixed combos accept any listed
 * action). Reuses the CurriculumSpotSeed shape so the existing `curriculum`
 * drill path grades it unchanged.
 */
export function buildDealFromRangeSession(
  pack: RangePack,
  count: number = DEAL_FROM_RANGE_SESSION_SIZE,
  rng: () => number = Math.random,
): ArenaCurriculumPack {
  const cells = pack.cells.filter((cell) => cell.buckets.length > 0);
  const samples = cells.map(indexCell);
  const spots: CurriculumSpotSeed[] = [];

  for (let index = 0; index < count && cells.length > 0; index += 1) {
    const cellIndex = Math.min(cells.length - 1, Math.floor(rng() * cells.length));
    const cell = cells[cellIndex]!;
    const sample = samples[cellIndex]!;
    if (sample.combos.length === 0) continue;
    const combo = sample.combos[Math.min(sample.combos.length - 1, Math.floor(rng() * sample.combos.length))]!;
    const heroCards = exactComboCards(combo);
    spots.push({
      id: `ct-${pack.slug}-${index}-${combo}`,
      combo: comboClass(combo),
      position: seedPosition(cell.position),
      stackBb: cell.stackBb,
      acceptedActions: sample.actionsByCombo.get(combo) ?? [],
      legalActions: sample.legalActions,
      sourceGroupIndex: cellIndex,
      ...(heroCards ? { heroCards } : {}),
      ...(cell.board ? { board: cell.board } : {}),
      ...(cell.villainPosition ? { villainPosition: cell.villainPosition } : {}),
      ...(cell.heroStackSize !== undefined ? { heroStackSize: cell.heroStackSize } : {}),
      ...(cell.villainStackSize !== undefined ? { villainStackSize: cell.villainStackSize } : {}),
      ...(cell.actionLine ? { actionLine: cell.actionLine } : {}),
    });
  }

  return {
    slug: pack.slug,
    title: pack.title,
    description: pack.description,
    source: { kind: pack.source.kind, path: pack.source.path },
    spots,
  };
}
