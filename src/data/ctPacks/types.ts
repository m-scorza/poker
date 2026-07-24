type RangePackMethodology = 'gto_cev' | 'mda_exploit';

type RangePackTier = 'foundational' | 'blind_battles' | 'advanced';

export type RangePackStreet = 'preflop' | 'flop' | 'turn' | 'river';

interface RangePackProvenance {
  kind: 'brand_neutralized_snapshot_config';
  capturedAt: '2026-07-18';
  path: string;
  sha256: string;
}

interface RangePackBucket {
  actions: string[];
  combos: string[];
}

export interface RangePackCell {
  position: string;
  stackBb: number;
  villainPosition?: string;
  board?: string[];
  heroStackSize?: number;
  villainStackSize?: number;
  actionLine?: string;
  /** Exact combos the source can deal for this board. Preflop packs fall back to the bucket union. */
  dealCombos?: string[];
  buckets: RangePackBucket[];
}

export interface RangePack {
  slug: string;
  title: string;
  description: string;
  scenario: string;
  street: RangePackStreet;
  tier: RangePackTier;
  methodology: RangePackMethodology;
  stageContext?: string;
  source: RangePackProvenance;
  cells: RangePackCell[];
}

export interface RangePackRegistryEntry {
  slug: string;
  title: string;
  description: string;
  scenario: string;
  street: RangePackStreet;
  tier: RangePackTier;
  methodology: RangePackMethodology;
  stageContext?: string;
  cellCount: number;
  bucketCount: number;
  comboCount: number;
  distinctComboCount: number;
  source: RangePackProvenance;
  chunk: string;
}

export type RangePackLoader = () => Promise<{ default: RangePack }>;
