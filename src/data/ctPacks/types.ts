export type RangePackMethodology = 'gto_cev' | 'mda_exploit';

export type RangePackTier = 'foundational' | 'blind_battles' | 'advanced';

export interface RangePackProvenance {
  kind: 'brand_neutralized_snapshot_config';
  capturedAt: '2026-07-18';
  path: string;
  sha256: string;
}

export interface RangePackBucket {
  actions: string[];
  combos: string[];
}

export interface RangePackCell {
  position: string;
  stackBb: number;
  villainPosition?: string;
  buckets: RangePackBucket[];
}

export interface RangePack {
  slug: string;
  title: string;
  description: string;
  scenario: string;
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
