#!/usr/bin/env tsx
/**
 * Build brand-neutral preflop and postflop range packs from the authorized offline trainer
 * snapshot, plus the owner-mandated legacy-vs-snapshot overlap analysis.
 *
 * This importer runs offline against a staged read-only snapshot copy. The
 * snapshot never enters the app repo: only app-owned, brand-neutral drill data
 * (positions, stacks, actions, exact combos) and content-hash provenance are
 * emitted. No vendor names, product codes, or URLs are written to shipped code.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'src', 'data', 'ctPacks');
const PACKS_DIR = join(OUT_DIR, 'packs');
const OVERLAP_JSON_PATH = join(OUT_DIR, 'overlap.generated.json');
const OVERLAP_REPORT_PATH = join(REPO_ROOT, 'docs', 'reports', '2026-07-19-legacy-vs-snapshot-overlap.md');
const CAPTURED_AT = '2026-07-18';
const VAULT_RELATIVE_PATH = 'research/ct-trainer-2026-07-18/';

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const CHECK = process.argv.includes('--check');
const OVERLAP = process.argv.includes('--overlap');
const SNAPSHOT_DIR = flagValue('--snapshot');
const LEGACY_PATH = flagValue('--legacy');

if (!SNAPSHOT_DIR || (OVERLAP && !LEGACY_PATH)) {
  console.error('Usage: tsx scripts/import-ct-curriculum.ts --snapshot <dir> [--overlap --legacy <quiz_configs.json>] [--check]');
  process.exit(2);
}

interface CatalogEntry {
  category: string;
  title: string;
  configUrl: string;
}

interface RawBucket {
  combos: string[];
  answer: string[];
}

interface RawGroup {
  position?: unknown;
  stackSize?: unknown;
  board?: unknown;
  villainPosition?: unknown;
  spotConfig?: {
    villainStackSize?: unknown;
    heroStackSize?: unknown;
    rangeToBeDealt?: unknown;
    actionHistory?: unknown;
  };
  expectedAnswers?: unknown;
}

interface RawConfig {
  name?: unknown;
  action?: unknown;
  stackSize?: unknown;
  heroPositions?: unknown;
  villainPositions?: unknown;
  rangeToBeDealt?: unknown;
  actionHistory?: unknown;
  expectedAnswers?: unknown;
}

const PREFLOP_CATEGORIES = new Set([
  'RFI',
  'Vs RFI',
  'Jogando do BB',
  'Blind War Pre Flop',
  'Defesa de BB Multway',
  'Squeeze',
  'Enfrentando uma 3-bet',
]);

const CATEGORY_COPY: Record<string, { neutralCategory: string; scenario: string; tier: 'foundational' | 'blind_battles' | 'advanced'; description: string }> = {
  RFI: { neutralCategory: 'Open-raising', scenario: 'RFI', tier: 'foundational', description: 'Preflop opener practice across positions and stack depths.' },
  'Vs RFI': { neutralCategory: 'Facing an open', scenario: 'FACING_RAISE', tier: 'foundational', description: 'Preflop response practice when another player opens first.' },
  'Jogando do BB': { neutralCategory: 'Big blind defense', scenario: 'BB_VS_RAISE', tier: 'blind_battles', description: 'Big blind response practice across stack depths and open sizes.' },
  'Blind War Pre Flop': { neutralCategory: 'Blind battle', scenario: 'BLIND_WAR', tier: 'blind_battles', description: 'Small-blind and big-blind preflop practice for heads-up blind battles.' },
  'Defesa de BB Multway': { neutralCategory: 'Multiway big blind defense', scenario: 'BB_VS_RAISE_MULTIWAY', tier: 'blind_battles', description: 'Big blind defense practice in multiway raised pots.' },
  Squeeze: { neutralCategory: 'Squeeze', scenario: 'FACING_RAISE', tier: 'advanced', description: 'Preflop squeeze practice after an open and a cold caller.' },
  'Enfrentando uma 3-bet': { neutralCategory: 'Facing a 3-bet', scenario: 'FACING_3BET', tier: 'advanced', description: 'Preflop practice after facing a 3-bet, kept separate from imported-hand grading.' },
  'C-bet em posicao vs BB': { neutralCategory: 'In-position c-bet', scenario: 'CBET_IP_VS_BB', tier: 'foundational', description: 'Board-aware continuation-bet practice in position against the big blind.' },
  'C-bet Turn em posicao vs BB': { neutralCategory: 'In-position turn c-bet', scenario: 'CBET_LATER_IP_VS_BB', tier: 'advanced', description: 'Board-aware turn-barrel practice in position against the big blind.' },
  'C-bet River em posicao vs BB': { neutralCategory: 'In-position river c-bet', scenario: 'CBET_LATER_IP_VS_BB', tier: 'advanced', description: 'Board-aware river-barrel practice in position against the big blind.' },
  'Jogando vs C-bet do BB': { neutralCategory: 'Big-blind response to c-bet', scenario: 'VS_CBET', tier: 'blind_battles', description: 'Board-aware big-blind response practice after facing a continuation bet.' },
  'C-bet fora de posicao': { neutralCategory: 'Out-of-position c-bet', scenario: 'CBET_OOP', tier: 'advanced', description: 'Board-aware continuation-bet and barrel practice out of position.' },
  'Jogando em Posicao': { neutralCategory: 'In-position postflop response', scenario: 'IP_POSTFLOP', tier: 'advanced', description: 'Board-aware in-position response practice after the preflop raiser acts.' },
  'Enfrentando um Check-Raise': { neutralCategory: 'Facing a check-raise', scenario: 'VS_CHECKRAISE', tier: 'advanced', description: 'Board-aware response practice after facing a postflop check-raise.' },
  'Probe Bet Turn': { neutralCategory: 'Turn probe bet', scenario: 'PROBE_TURN', tier: 'advanced', description: 'Board-aware turn probe-bet practice after the prior street checks through.' },
  'Probe Bet River': { neutralCategory: 'River probe bet', scenario: 'PROBE_RIVER', tier: 'advanced', description: 'Board-aware river probe-bet practice after the prior street checks through.' },
  'Delayed C-bet': { neutralCategory: 'Delayed c-bet', scenario: 'DELAYED_CBET', tier: 'advanced', description: 'Board-aware delayed continuation-bet practice after checking the prior street.' },
  'Pote 3-Betado': { neutralCategory: '3-bet pot', scenario: '3BET_POT', tier: 'advanced', description: 'Board-aware postflop practice in three-bet pots.' },
  'C-bet vs SB': { neutralCategory: 'C-bet versus small blind', scenario: 'CBET_VS_SB', tier: 'blind_battles', description: 'Board-aware continuation-bet practice against the small blind.' },
};

const CATEGORY_SCENARIO: Record<string, string> = {
  RFI: 'RFI',
  'Vs RFI': 'FACING_RAISE',
  'Jogando do BB': 'BB_VS_RAISE',
  'Blind War Pre Flop': 'BLIND_WAR',
  'Defesa de BB Multway': 'BB_VS_RAISE_MULTIWAY',
  Squeeze: 'FACING_RAISE',
  'Enfrentando uma 3-bet': 'FACING_3BET',
  'C-bet em posicao vs BB': 'CBET_IP_VS_BB',
  'C-bet Turn em posicao vs BB': 'CBET_LATER_IP_VS_BB',
  'C-bet River em posicao vs BB': 'CBET_LATER_IP_VS_BB',
  'Jogando vs C-bet do BB': 'VS_CBET',
  'C-bet fora de posicao': 'CBET_OOP',
  'Jogando em Posicao': 'IP_POSTFLOP',
  'Enfrentando um Check-Raise': 'VS_CHECKRAISE',
  'Probe Bet Turn': 'PROBE_TURN',
  'Probe Bet River': 'PROBE_RIVER',
  'Delayed C-bet': 'DELAYED_CBET',
  'Pote 3-Betado': '3BET_POT',
  'C-bet vs SB': 'CBET_VS_SB',
};

const LEGACY_SCENARIO: Record<string, string> = {
  RFI: 'RFI',
  'Vs RFI': 'FACING_RAISE',
  'Jogando do BB': 'BB_VS_RAISE',
  'Blind War Pré Flop': 'BLIND_WAR',
  'Defesa de BB Multway': 'BB_VS_RAISE_MULTIWAY',
  'Enfrentando uma 3bet': 'FACING_3BET',
  'Cbet em posição vs BB': 'CBET_IP_VS_BB',
  'Cbet Turn e River em Posição vs BB': 'CBET_LATER_IP_VS_BB',
  'Jogando vs Cbet do BB': 'VS_CBET',
  'Cbet Fora de Posição': 'CBET_OOP',
  'Jogando em Posição': 'IP_POSTFLOP',
};

const POSITION_ORDER = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const RANK_ORDER = '23456789TJQKA';

function normalizePosition(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toUpperCase();
  if (clean === 'BU') return 'BTN';
  if (clean === 'UTG1') return 'UTG+1';
  return clean;
}

function positionRank(position: string): number {
  const index = POSITION_ORDER.indexOf(position);
  return index === -1 ? POSITION_ORDER.length : index;
}

function normalizeActionKey(action: unknown): string | null {
  if (typeof action !== 'string') return null;
  const clean = action.trim().toUpperCase();
  if (clean === 'FOLD') return 'fold';
  if (clean === 'CALL') return 'call';
  if (clean === 'CHECK') return 'check';
  if (clean === 'LIMP') return 'limp';
  if (clean === 'ALL-IN' || clean === 'ALL IN') return 'all_in';
  const raise = clean.match(/^RAISE\s+(.+)$/);
  if (raise) return `raise_${raise[1]!.replace(/\s+/g, '_').replace(/\./g, '_')}`.toLowerCase();
  const bet = clean.match(/^BET\s+(.+)$/);
  if (bet) return `bet_${bet[1]!.replace(/\s+/g, '_').replace(/%/g, 'pct').replace(/\./g, '_')}`.toLowerCase();
  const cbet = clean.match(/^CBET\s+(.+)$/);
  if (cbet) return `cbet_${cbet[1]!.replace(/\s+/g, '_').replace(/\//g, '_')}`.toLowerCase();
  return null;
}

function semanticAction(action: unknown): string | null {
  if (typeof action !== 'string') return null;
  const clean = action.trim().toUpperCase();
  if (clean === 'FOLD') return 'fold';
  if (clean === 'CALL') return 'call';
  if (clean === 'CHECK') return 'check';
  if (clean === 'LIMP') return 'limp';
  if (clean === 'ALL-IN' || clean === 'ALL IN') return 'all_in';
  if (/^RAISE\b/.test(clean)) return 'raise';
  if (/^BET\b/.test(clean)) return 'bet';
  if (/^CBET\b/.test(clean)) return 'bet';
  return null;
}

function semanticVocab(raw: RawConfig): string[] {
  const vocab = new Set<string>();
  for (const group of configCells(raw)) {
    for (const bucket of groupBuckets(group)) {
      for (const answer of bucket.answer) {
        const semantic = semanticAction(answer);
        if (semantic) vocab.add(semantic);
      }
    }
  }
  return Array.from(vocab).sort();
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setB = new Set(b);
  const intersection = a.filter((value) => setB.has(value)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function comboClass(combo: string): string | null {
  const value = combo.trim();
  const shorthand = value.match(/^([2-9TJQKA])([2-9TJQKA])([so])?$/i);
  if (shorthand) {
    const a = shorthand[1]!.toUpperCase();
    const b = shorthand[2]!.toUpperCase();
    const suited = shorthand[3]?.toLowerCase();
    if (a === b) return `${a}${b}`;
    const ordered = RANK_ORDER.indexOf(a) >= RANK_ORDER.indexOf(b) ? [a, b] : [b, a];
    return `${ordered[0]}${ordered[1]}${suited === 's' ? 's' : 'o'}`;
  }
  const exact = value.match(/^([2-9TJQKA])([cdhs])([2-9TJQKA])([cdhs])$/i);
  if (!exact) return null;
  const r1 = exact[1]!.toUpperCase();
  const s1 = exact[2]!.toLowerCase();
  const r2 = exact[3]!.toUpperCase();
  const s2 = exact[4]!.toLowerCase();
  if (r1 === r2) return `${r1}${r2}`;
  const ordered = RANK_ORDER.indexOf(r1) >= RANK_ORDER.indexOf(r2) ? [r1, r2] : [r2, r1];
  return `${ordered[0]}${ordered[1]}${s1 === s2 ? 's' : 'o'}`;
}

function methodologyFromTitle(title: string): 'gto_cev' | 'mda_exploit' {
  return /MDA/i.test(title) ? 'mda_exploit' : 'gto_cev';
}

function stageContextFromTitle(title: string): string | undefined {
  const match = title.match(/ICM\s*-\s*([^|]+?)\s*(?:\||$)/i);
  if (!match) return undefined;
  return `Tournament ICM context: ${match[1]!.trim()}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/%/g, 'pct')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stackSummary(stacks: number[]): string {
  const unique = Array.from(new Set(stacks)).sort((a, b) => b - a);
  if (unique.length === 1) return `${unique[0]}bb`;
  if (unique.length > 4) return `${unique[0]}-${unique[unique.length - 1]}bb`;
  return `${unique.join('/')}bb`;
}

function stageShort(title: string): string | undefined {
  const match = title.match(/ICM\s*-\s*([^|]+?)\s*(?:\||$)/i);
  return match ? match[1]!.trim() : undefined;
}

const NODE_PATTERNS: Array<[RegExp, string]> = [
  [/3-?bet all[- ]?in/i, 'vs 3-bet jam'],
  [/vs 3-?bet/i, 'vs 3-bet'],
  [/all[- ]?in/i, 'vs jam'],
  [/vs iso/i, 'vs iso-raise'],
  [/vs limp/i, 'vs limp'],
  [/sb rfi/i, 'sb open'],
  [/vs rfi/i, 'vs open'],
  [/short stack/i, 'short stack'],
  [/open ?shove/i, 'open jam'],
  [/(posi(?:ç|c)(?:ões|oes)? )?iniciais/i, 'early seats'],
  [/(posi(?:ç|c)(?:ões|oes)? )?finais/i, 'late seats'],
];

function nodeToken(title: string): string | undefined {
  for (const [pattern, token] of NODE_PATTERNS) {
    if (pattern.test(title)) return token;
  }
  return undefined;
}

function jsonStable(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function tsLiteral(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/"([A-Za-z_$][A-Za-z0-9_$]*)":/g, '$1:')
    .replace(/"/g, "'");
}

interface UniqueConfig {
  category: string;
  title: string;
  fileName: string;
  raw: RawConfig;
  sha256: string;
}

function loadUniqueConfigs(): UniqueConfig[] {
  const catalog = JSON.parse(readFileSync(join(SNAPSHOT_DIR!, 'catalog-index.json'), 'utf8')) as CatalogEntry[];
  const seen = new Set<string>();
  const configs: UniqueConfig[] = [];
  for (const entry of catalog) {
    if (seen.has(entry.configUrl)) continue;
    seen.add(entry.configUrl);
    const fileName = decodeURIComponent(entry.configUrl.split('/').pop() ?? '');
    const filePath = join(SNAPSHOT_DIR!, 'raw', fileName);
    if (!existsSync(filePath)) continue;
    const bytes = readFileSync(filePath);
    let raw: RawConfig;
    try {
      raw = JSON.parse(bytes.toString('utf8')) as RawConfig;
    } catch {
      continue;
    }
    configs.push({
      category: entry.category,
      title: entry.title,
      fileName,
      raw,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  return configs;
}

function configCells(raw: RawConfig): RawGroup[] {
  return Array.isArray(raw.expectedAnswers) ? (raw.expectedAnswers as RawGroup[]) : [];
}

function groupBuckets(group: RawGroup): RawBucket[] {
  return (Array.isArray(group.expectedAnswers) ? (group.expectedAnswers as unknown[]) : [])
    .map((entry) => {
      const bucket = entry as { combos?: unknown; answer?: unknown };
      const combos = Array.isArray(bucket.combos) ? bucket.combos.filter((c): c is string => typeof c === 'string') : [];
      const answer = Array.isArray(bucket.answer) ? bucket.answer.filter((a): a is string => typeof a === 'string') : [];
      return { combos, answer };
    });
}

function hasBoard(raw: RawConfig): boolean {
  return configCells(raw).some((group) => typeof group.board === 'string' && group.board.length > 0);
}

type PackStreet = 'preflop' | 'flop' | 'turn' | 'river';

const EXACT_CARD = /^[2-9TJQKA][cdhs]$/i;
const EXACT_COMBO = /^([2-9TJQKA][cdhs])([2-9TJQKA][cdhs])$/i;

function parseBoard(value: unknown, context: string): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${context}: board must be a dash-separated string`);
  const cards = value.split('-').map((card) => card.trim());
  if (cards.length < 3 || cards.length > 5 || cards.some((card) => !EXACT_CARD.test(card))) {
    throw new Error(`${context}: invalid board "${value}"`);
  }
  if (new Set(cards.map((card) => card.toLowerCase())).size !== cards.length) {
    throw new Error(`${context}: duplicate card on board "${value}"`);
  }
  return cards;
}

function streetForBoard(board: string[] | undefined): PackStreet {
  if (!board) return 'preflop';
  if (board.length === 3) return 'flop';
  if (board.length === 4) return 'turn';
  return 'river';
}

function validateExactCombos(values: string[], board: string[] | undefined, context: string): string[] {
  const seen = new Set<string>();
  const boardCards = new Set((board ?? []).map((card) => card.toLowerCase()));
  for (const combo of values) {
    const match = combo.match(EXACT_COMBO);
    if (!match || match[1]!.toLowerCase() === match[2]!.toLowerCase()) {
      throw new Error(`${context}: invalid exact combo "${combo}"`);
    }
    if (seen.has(combo)) continue;
    if (boardCards.has(match[1]!.toLowerCase()) || boardCards.has(match[2]!.toLowerCase())) continue;
    seen.add(combo);
  }
  return Array.from(seen).sort();
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function formatHistoryAction(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toUpperCase()
    .replace(/^BET\s+BET\s+/, 'BET ')
    .replace(/^CALL\s+BET\s+/, 'CALL ');
  if (clean === 'CHECK') return 'checks';
  if (clean === 'FOLD') return 'folds';
  if (clean === 'ALL-IN' || clean === 'ALL IN') return 'jams';
  const sized = clean.match(/^(RAISE|BET|CALL)\s+(.+)$/);
  if (!sized) return null;
  const verb = sized[1] === 'RAISE' ? 'raises' : sized[1] === 'BET' ? 'bets' : 'calls';
  const amount = sized[2]!.replace(/\s*BB$/i, '').replace(/\s+/g, '');
  return `${verb} ${amount}bb`;
}

function formatActionLine(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const streets: string[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as { street?: unknown; actions?: unknown };
    if (typeof item.street !== 'string' || !Array.isArray(item.actions)) continue;
    const actions = item.actions.flatMap((action) => {
      if (!action || typeof action !== 'object') return [];
      const raw = action as { position?: unknown; action?: unknown };
      const position = normalizePosition(raw.position);
      const formatted = formatHistoryAction(raw.action);
      return position && formatted ? [`${position} ${formatted}`] : [];
    });
    if (actions.length > 0) {
      const street = item.street.trim().toLowerCase().replace(/\s+/g, '');
      streets.push(`${street}: ${actions.join(', ')}`);
    }
  }
  return streets.length > 0 ? streets.join('; ') : undefined;
}

interface BuiltPack {
  slug: string;
  title: string;
  description: string;
  scenario: string;
  street: PackStreet;
  tier: 'foundational' | 'blind_battles' | 'advanced';
  methodology: 'gto_cev' | 'mda_exploit';
  stageContext?: string;
  sha256: string;
  cells: Array<{
    position: string;
    stackBb: number;
    villainPosition?: string;
    board?: string[];
    heroStackSize?: number;
    villainStackSize?: number;
    actionLine?: string;
    dealCombos?: string[];
    buckets: Array<{ actions: string[]; combos: string[] }>;
  }>;
  cellCount: number;
  bucketCount: number;
  comboCount: number;
  distinctComboCount: number;
}

function buildPacks(configs: UniqueConfig[]): { packs: BuiltPack[]; included: UniqueConfig[]; excluded: Array<{ config: UniqueConfig; reason: string }> } {
  const included: UniqueConfig[] = [];
  const excluded: Array<{ config: UniqueConfig; reason: string }> = [];
  for (const config of configs) {
    const copy = CATEGORY_COPY[config.category];
    if (!copy) {
      excluded.push({ config, reason: `unsupported category "${config.category}"` });
      continue;
    }
    const expectedPostflop = !PREFLOP_CATEGORIES.has(config.category);
    if (expectedPostflop !== hasBoard(config.raw)) {
      excluded.push({ config, reason: expectedPostflop ? 'postflop config has no board-anchored cells' : 'preflop config unexpectedly carries a board' });
      continue;
    }
    included.push(config);
  }

  const usedSlugs = new Map<string, number>();
  const packs: BuiltPack[] = included.map((config) => {
    const copy = CATEGORY_COPY[config.category]!;
    const methodology = methodologyFromTitle(config.title);
    const stageContext = stageContextFromTitle(config.title);
    const configVillains = Array.isArray(config.raw.villainPositions)
      ? config.raw.villainPositions.map(normalizePosition).filter((p): p is string => Boolean(p))
      : [];
    const configHeroes = Array.isArray(config.raw.heroPositions)
      ? config.raw.heroPositions.map(normalizePosition).filter((p): p is string => Boolean(p))
      : [];

    const cells = configCells(config.raw)
      .map((group, groupIndex) => {
        const context = `${config.fileName} cell ${groupIndex}`;
        const position = normalizePosition(group.position);
        const stackBb = typeof group.stackSize === 'number' ? group.stackSize : null;
        if (!position || !stackBb || stackBb <= 0) return null;
        const alignedVillain = configHeroes.length === configVillains.length
          ? configVillains[configHeroes.indexOf(position)]
          : undefined;
        const villainPosition = normalizePosition(group.villainPosition)
          ?? (configVillains.length === 1 ? configVillains[0] : alignedVillain)
          ?? undefined;
        const board = parseBoard(group.board, context);
        const isPostflop = Boolean(board);
        const buckets = groupBuckets(group)
          .map((bucket, bucketIndex) => {
            const actions = Array.from(new Set(bucket.answer.map((action) => {
              const normalized = normalizeActionKey(action);
              if (!normalized) throw new Error(`${context} bucket ${bucketIndex}: unknown action "${String(action)}"`);
              return normalized;
            }))).sort();
            const combos = isPostflop
              ? validateExactCombos(bucket.combos, board, `${context} bucket ${bucketIndex}`)
              : Array.from(new Set(bucket.combos)).sort();
            return { actions, combos };
          })
          .filter((bucket) => bucket.actions.length > 0 && bucket.combos.length > 0)
          .sort((a, b) => a.actions.join(',').localeCompare(b.actions.join(',')));
        if (buckets.length === 0) return null;
        const bucketCombos = Array.from(new Set(buckets.flatMap((bucket) => bucket.combos))).sort();
        const sourceDealCombosRaw = stringArray(group.spotConfig?.rangeToBeDealt).length > 0
          ? stringArray(group.spotConfig?.rangeToBeDealt)
          : stringArray(config.raw.rangeToBeDealt);
        const sourceDealCombos = sourceDealCombosRaw.length === 1 && sourceDealCombosRaw[0]!.toLowerCase() === 'all'
          ? []
          : sourceDealCombosRaw;
        const gradedCombos = new Set(bucketCombos);
        const dealCombos = isPostflop
          ? validateExactCombos(sourceDealCombos.length > 0 ? sourceDealCombos : bucketCombos, board, `${context} dealt range`)
              .filter((combo) => gradedCombos.has(combo))
          : undefined;
        if (dealCombos && dealCombos.length === 0) {
          throw new Error(`${context}: no board-valid dealt combo has an accepted-action bucket`);
        }
        const dealtSet = new Set(dealCombos);
        const practiceBuckets = isPostflop && sourceDealCombos.length > 0
          ? buckets
              .map((bucket) => ({ ...bucket, combos: bucket.combos.filter((combo) => dealtSet.has(combo)) }))
              .filter((bucket) => bucket.combos.length > 0)
          : buckets;
        const heroStackSize = typeof group.spotConfig?.heroStackSize === 'number' && group.spotConfig.heroStackSize > 0
          ? group.spotConfig.heroStackSize
          : undefined;
        const villainStackSize = typeof group.spotConfig?.villainStackSize === 'number' && group.spotConfig.villainStackSize > 0
          ? group.spotConfig.villainStackSize
          : undefined;
        const actionLine = formatActionLine(
          Array.isArray(group.spotConfig?.actionHistory) ? group.spotConfig.actionHistory : config.raw.actionHistory,
        );
        return {
          position,
          stackBb,
          ...(villainPosition ? { villainPosition } : {}),
          ...(board ? { board } : {}),
          ...(heroStackSize !== undefined ? { heroStackSize } : {}),
          ...(villainStackSize !== undefined ? { villainStackSize } : {}),
          ...(actionLine ? { actionLine } : {}),
          ...(dealCombos ? { dealCombos } : {}),
          buckets: practiceBuckets,
        };
      })
      .filter((cell): cell is NonNullable<typeof cell> => cell !== null)
      .sort((a, b) =>
        positionRank(a.position) - positionRank(b.position)
        || a.stackBb - b.stackBb
        || (a.villainPosition ?? '').localeCompare(b.villainPosition ?? '')
        || (a.board ?? []).join('-').localeCompare((b.board ?? []).join('-')));

    const streets = Array.from(new Set(cells.map((cell) => streetForBoard(cell.board))));
    if (streets.length !== 1) throw new Error(`${config.fileName}: mixed streets in one pack (${streets.join(', ')})`);
    const street = streets[0] ?? 'preflop';

    const heroPositions = Array.from(new Set(cells.map((c) => c.position))).sort((a, b) => positionRank(a) - positionRank(b));
    const villainPositions = (() => {
      const fromCells = Array.from(new Set(cells.map((c) => c.villainPosition).filter((p): p is string => Boolean(p))));
      return fromCells.length > 0 ? fromCells.sort((a, b) => positionRank(a) - positionRank(b)) : configVillains;
    })();
    const stacks = cells.map((c) => c.stackBb);
    const stage = stageShort(config.title);
    const node = street === 'preflop' ? nodeToken(config.title) : undefined;
    const heroDesc = heroPositions.length > 0 ? heroPositions.join('/') : copy.neutralCategory;
    const villainDesc = villainPositions.length > 0 ? ` vs ${villainPositions.join('+')}` : '';
    const nodeDesc = node ? ` - ${node}` : '';
    const stackDesc = stacks.length > 0 ? ` (${stackSummary(stacks)})` : '';
    const stageSuffix = stage ? ` - ICM ${stage}` : '';
    const streetDesc = street === 'preflop' ? '' : ` - ${street[0]!.toUpperCase()}${street.slice(1)}`;
    const title = `${copy.neutralCategory}: ${heroDesc}${villainDesc}${nodeDesc}${streetDesc}${stackDesc}${stageSuffix}`;
    let slugBase = slugify(`${copy.neutralCategory}-${heroDesc}-${villainPositions.join('-')}-${street === 'preflop' ? node ?? '' : street}-${stage ?? ''}-${methodology === 'mda_exploit' ? 'exploit' : 'baseline'}`);
    if (!slugBase) slugBase = slugify(copy.neutralCategory);
    const usedCount = usedSlugs.get(slugBase) ?? 0;
    usedSlugs.set(slugBase, usedCount + 1);
    const slug = usedCount === 0 ? slugBase : `${slugBase}-${usedCount + 1}`;

    let bucketCount = 0;
    let comboCount = 0;
    const distinct = new Set<string>();
    for (const cell of cells) {
      bucketCount += cell.buckets.length;
      for (const bucket of cell.buckets) {
        comboCount += bucket.combos.length;
        for (const combo of bucket.combos) distinct.add(`${cell.position}|${cell.stackBb}|${(cell.board ?? []).join('-')}|${combo}`);
      }
    }

    return {
      slug,
      title,
      description: copy.description,
      scenario: copy.scenario,
      street,
      tier: copy.tier,
      methodology,
      ...(stageContext ? { stageContext } : {}),
      sha256: config.sha256,
      cells,
      cellCount: cells.length,
      bucketCount,
      comboCount,
      distinctComboCount: distinct.size,
    };
  });

  const titleCounts = new Map<string, number>();
  for (const pack of packs) titleCounts.set(pack.title, (titleCounts.get(pack.title) ?? 0) + 1);
  const titleOrdinals = new Map<string, number>();
  for (const pack of packs) {
    if ((titleCounts.get(pack.title) ?? 0) < 2) continue;
    const ordinal = (titleOrdinals.get(pack.title) ?? 0) + 1;
    titleOrdinals.set(pack.title, ordinal);
    pack.title = `${pack.title} - Variant ${ordinal}`;
  }

  packs.sort((a, b) => a.slug.localeCompare(b.slug));
  return { packs, included, excluded };
}

// ---- Overlap analysis (owner-mandated) ------------------------------------

interface SnapshotCellIndex {
  scenario: string;
  position: string;
  villainPosition: string | null;
  stackBb: number;
  boardKey: string | null;
  classActions: Map<string, Set<string>>;
  configVocab: string[];
  sha256: string;
}

function boardKey(board: unknown): string | null {
  if (typeof board !== 'string' || board.length === 0) return null;
  const cards = board.split('-').map((c) => c.trim()).filter(Boolean);
  if (cards.length < 3) return null;
  const flop = cards.slice(0, 3).sort();
  return [...flop, ...cards.slice(3)].join('');
}

function buildSnapshotIndex(configs: UniqueConfig[]): SnapshotCellIndex[] {
  const cells: SnapshotCellIndex[] = [];
  for (const config of configs) {
    const scenario = CATEGORY_SCENARIO[config.category];
    if (!scenario) continue;
    const configVillains = Array.isArray(config.raw.villainPositions)
      ? config.raw.villainPositions.map(normalizePosition).filter((p): p is string => Boolean(p))
      : [];
    const configVocab = semanticVocab(config.raw);
    for (const group of configCells(config.raw)) {
      const position = normalizePosition(group.position);
      const stackBb = typeof group.stackSize === 'number' ? group.stackSize : null;
      if (!position || !stackBb) continue;
      const villainPosition = normalizePosition(group.villainPosition) ?? configVillains[0] ?? null;
      const classActions = new Map<string, Set<string>>();
      for (const bucket of groupBuckets(group)) {
        const semantics = bucket.answer.map(semanticAction).filter((a): a is string => Boolean(a));
        for (const combo of bucket.combos) {
          const cls = comboClass(combo);
          if (!cls) continue;
          const set = classActions.get(cls) ?? new Set<string>();
          for (const s of semantics) set.add(s);
          classActions.set(cls, set);
        }
      }
      cells.push({ scenario, position, villainPosition, stackBb, boardKey: boardKey(group.board), classActions, configVocab, sha256: config.sha256 });
    }
  }
  return cells;
}

interface LegacySpot {
  configName: string;
  scenario: string;
  position: string;
  villainPosition: string | null;
  stackBb: number;
  boardKey: string | null;
  comboClass: string;
  legacyActions: string[];
  legacyRaw: string[];
  configVocab: string[];
}

function loadLegacySpots(): LegacySpot[] {
  const arr = JSON.parse(readFileSync(LEGACY_PATH!, 'utf8')) as RawConfig[];
  const spots: LegacySpot[] = [];
  for (const config of arr) {
    const name = typeof config.name === 'string' ? config.name : '';
    const scenario = LEGACY_SCENARIO[name] ?? 'UNKNOWN';
    const configVocab = semanticVocab(config);
    for (const group of configCells(config)) {
      const position = normalizePosition(group.position);
      const stackBb = typeof group.stackSize === 'number' ? group.stackSize : null;
      if (!position || !stackBb) continue;
      const villainPosition = normalizePosition(group.villainPosition) ?? null;
      const bKey = boardKey(group.board);
      for (const bucket of groupBuckets(group)) {
        const legacyRaw = Array.from(new Set(bucket.answer)).sort();
        const legacyActions = Array.from(new Set(bucket.answer.map(semanticAction).filter((a): a is string => Boolean(a)))).sort();
        for (const combo of bucket.combos) {
          const cls = comboClass(combo);
          if (!cls) continue;
          spots.push({ configName: name, scenario, position, villainPosition, stackBb, boardKey: bKey, comboClass: cls, legacyActions, legacyRaw, configVocab });
        }
      }
    }
  }
  return spots;
}

interface OverlapEntry {
  scenario: string;
  position: string;
  villainPosition: string | null;
  stackBb: number;
  boardKey: string | null;
  comboClass: string;
  legacyActions: string[];
  legacyRaw: string[];
  status: 'agreement' | 'sizing_only' | 'disagreement' | 'unmatched';
  snapshotActions: string[] | null;
  reason: string | null;
}

function matchSnapshotCell(spot: LegacySpot, index: SnapshotCellIndex[]): SnapshotCellIndex | null {
  const candidates = index.filter((cell) => {
    if (cell.stackBb !== spot.stackBb) return false;
    if (cell.position !== spot.position) return false;
    if (spot.boardKey) {
      if (cell.boardKey !== spot.boardKey) return false;
    } else if (cell.scenario !== spot.scenario) {
      return false;
    }
    if (spot.villainPosition && cell.villainPosition && cell.villainPosition !== spot.villainPosition) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  const withClass = candidates.filter((cell) => cell.classActions.has(spot.comboClass));
  const pool = withClass.length > 0 ? withClass : candidates;

  // Multiple snapshot configs can share the same scenario/position/stack key
  // but represent different nodes (e.g. the CO-vs-BTN "3-bet response" config
  // vs the "3-bet all-in" jam config). Pick the cell with an exact villain
  // match first, then the one whose config action vocabulary best matches the
  // legacy config's own vocabulary (node identity), then the cell that can
  // express the legacy decision, then the richer node, then a deterministic
  // content-hash tiebreak.
  const legacySet = new Set(spot.legacyActions);
  const scored = pool.map((cell) => {
    const cellVocab = new Set<string>();
    for (const actions of cell.classActions.values()) for (const action of actions) cellVocab.add(action);
    const comboActions = cell.classActions.get(spot.comboClass);
    // Only used as a tiebreak *below* villainExact and nodeSimilarity: for
    // villain-ambiguous spots (legacy carries no villain, e.g. multiway
    // defense) where several equally-valid snapshot villain-combos survive,
    // prefer one where the legacy decision is accepted rather than picking
    // arbitrarily. It never overrides the villain-exact or node-identity
    // (nodeSimilarity) signals, so uniquely-determined nodes keep surfacing
    // genuine disagreements.
    const comboAgrees = comboActions ? [...comboActions].some((action) => legacySet.has(action)) : false;
    return {
      cell,
      villainExact: cell.villainPosition === spot.villainPosition,
      nodeSimilarity: jaccard(cell.configVocab, spot.configVocab),
      comboAgrees,
      expressible: spot.legacyActions.every((action) => cellVocab.has(action)),
      vocabSize: cellVocab.size,
    };
  });
  scored.sort((a, b) =>
    Number(b.villainExact) - Number(a.villainExact) ||
    b.nodeSimilarity - a.nodeSimilarity ||
    Number(b.comboAgrees) - Number(a.comboAgrees) ||
    Number(b.expressible) - Number(a.expressible) ||
    b.vocabSize - a.vocabSize ||
    a.cell.sha256.localeCompare(b.cell.sha256));
  return scored[0]?.cell ?? null;
}

function runOverlap(legacySpots: LegacySpot[], index: SnapshotCellIndex[]): OverlapEntry[] {
  return legacySpots
    .map((spot): OverlapEntry => {
      const base = {
        scenario: spot.scenario,
        position: spot.position,
        villainPosition: spot.villainPosition,
        stackBb: spot.stackBb,
        boardKey: spot.boardKey,
        comboClass: spot.comboClass,
        legacyActions: spot.legacyActions,
        legacyRaw: spot.legacyRaw,
      };
      const cell = matchSnapshotCell(spot, index);
      if (!cell) {
        return { ...base, status: 'unmatched', snapshotActions: null, reason: 'no snapshot cell for scenario/position/stack/board key' };
      }
      const snapshotSet = cell.classActions.get(spot.comboClass);
      if (!snapshotSet) {
        return { ...base, status: 'unmatched', snapshotActions: null, reason: 'combo class absent from matched snapshot cell' };
      }
      const snapshotActions = Array.from(snapshotSet).sort();
      const legacySet = new Set(spot.legacyActions);
      const sameSemantics = snapshotActions.length === legacySet.size && snapshotActions.every((a) => legacySet.has(a));
      if (sameSemantics) {
        const legacyHasSizing = spot.legacyRaw.some((a) => /^(RAISE|BET|CBET)\s/i.test(a));
        return { ...base, status: legacyHasSizing ? 'sizing_only' : 'agreement', snapshotActions, reason: null };
      }
      return { ...base, status: 'disagreement', snapshotActions, reason: 'semantic accepted-action sets differ' };
    })
    .sort((a, b) =>
      a.scenario.localeCompare(b.scenario) ||
      positionRank(a.position) - positionRank(b.position) ||
      a.stackBb - b.stackBb ||
      (a.villainPosition ?? '').localeCompare(b.villainPosition ?? '') ||
      (a.boardKey ?? '').localeCompare(b.boardKey ?? '') ||
      a.comboClass.localeCompare(b.comboClass));
}

// ---- Emit -----------------------------------------------------------------

function packModule(pack: BuiltPack): string {
  const data = {
    slug: pack.slug,
    title: pack.title,
    description: pack.description,
    scenario: pack.scenario,
    street: pack.street,
    tier: pack.tier,
    methodology: pack.methodology,
    ...(pack.stageContext ? { stageContext: pack.stageContext } : {}),
    source: {
      kind: 'brand_neutralized_snapshot_config',
      capturedAt: CAPTURED_AT,
      path: VAULT_RELATIVE_PATH,
      sha256: pack.sha256,
    },
    cells: pack.cells.map((cell) => ({
      ...cell,
      ...(cell.dealCombos ? { dealCombos: `@@expand@@${cell.dealCombos.join(' ')}` } : {}),
      buckets: cell.buckets.map((bucket) => ({
        ...bucket,
        combos: `@@expand@@${bucket.combos.join(' ')}`,
      })),
    })),
  };
  const literal = tsLiteral(data).replace(/'@@expand@@([^']+)'/g, "expand('$1')");
  return `// Generated by scripts/import-ct-curriculum.ts. Do not edit by hand.\nimport type { RangePack } from '../types';\n\nconst expand = (value: string): string[] => value.split(' ');\n\nconst pack: RangePack = ${literal};\n\nexport default pack;\n`;
}

function registryModule(packs: BuiltPack[]): string {
  const entries = packs.map((pack) => ({
    slug: pack.slug,
    title: pack.title,
    description: pack.description,
    scenario: pack.scenario,
    street: pack.street,
    tier: pack.tier,
    methodology: pack.methodology,
    ...(pack.stageContext ? { stageContext: pack.stageContext } : {}),
    cellCount: pack.cellCount,
    bucketCount: pack.bucketCount,
    comboCount: pack.comboCount,
    distinctComboCount: pack.distinctComboCount,
    source: {
      kind: 'brand_neutralized_snapshot_config',
      capturedAt: CAPTURED_AT,
      path: VAULT_RELATIVE_PATH,
      sha256: pack.sha256,
    },
    chunk: `./packs/${pack.slug}.generated`,
  }));
  return `// Generated by scripts/import-ct-curriculum.ts. Do not edit by hand.\nimport type { RangePackRegistryEntry } from './types';\n\nexport const RANGE_PACK_REGISTRY: RangePackRegistryEntry[] = ${tsLiteral(entries)};\n`;
}

function loadersModule(packs: BuiltPack[]): string {
  const lines = packs
    .map((pack) => `  '${pack.slug}': () => import('./packs/${pack.slug}.generated'),`)
    .join('\n');
  return `// Generated by scripts/import-ct-curriculum.ts. Do not edit by hand.\nimport type { RangePackLoader } from './types';\n\nexport const RANGE_PACK_LOADERS: Record<string, RangePackLoader> = {\n${lines}\n};\n`;
}

function overlapJson(entries: OverlapEntry[], legacyCount: number): string {
  const summary = {
    legacySpots: legacyCount,
    matched: entries.filter((e) => e.status !== 'unmatched').length,
    unmatched: entries.filter((e) => e.status === 'unmatched').length,
    agreements: entries.filter((e) => e.status === 'agreement').length,
    sizingOnlyDiffs: entries.filter((e) => e.status === 'sizing_only').length,
    disagreements: entries.filter((e) => e.status === 'disagreement').length,
  };
  return `${jsonStable({ generator: 'scripts/import-ct-curriculum.ts', capturedAt: CAPTURED_AT, summary, entries })}\n`;
}

function overlapReport(entries: OverlapEntry[], legacyCount: number): string {
  const matched = entries.filter((e) => e.status !== 'unmatched').length;
  const unmatched = entries.filter((e) => e.status === 'unmatched');
  const disagreements = entries.filter((e) => e.status === 'disagreement');
  const sizingOnly = entries.filter((e) => e.status === 'sizing_only');
  const agreements = entries.filter((e) => e.status === 'agreement');

  const cellLabel = (e: OverlapEntry) =>
    `${e.scenario} · ${e.position}${e.villainPosition ? ` vs ${e.villainPosition}` : ''} · ${e.stackBb}bb${e.boardKey ? ` · board ${e.boardKey}` : ''} · ${e.comboClass}`;

  const disagreementRows = disagreements
    .map((e) => `| ${cellLabel(e)} | ${e.legacyActions.join('/')} | ${(e.snapshotActions ?? []).join('/')} |`)
    .join('\n');
  const sizingRows = sizingOnly
    .map((e) => `| ${cellLabel(e)} | ${e.legacyRaw.join('/')} | ${(e.snapshotActions ?? []).join('/')} |`)
    .join('\n');
  const unmatchedRows = unmatched
    .map((e) => `| ${cellLabel(e)} | ${e.reason} |`)
    .join('\n');

  return `---
status: open
owner_review: true
date: 2026-07-19
title: Legacy quiz-config vs snapshot overlap analysis (III-4 slice 1)
---

# Legacy vs snapshot overlap analysis

Owner-mandated ("no laziness allowed") comparison of every legacy quiz-config
spot against the authorized trainer snapshot. Generated by
\`scripts/import-ct-curriculum.ts\`; regenerate rather than hand-editing. The raw
machine-readable form lives at \`src/data/ctPacks/overlap.generated.json\`.

## Matching rules

- **Combo granularity.** The legacy export stores hand *classes* (e.g. \`Q9s\`);
  the snapshot stores *exact combos* (e.g. \`2d2c\`). A legacy class is matched
  by expanding it to every snapshot exact combo of that class inside the matched
  cell and taking the union of their accepted actions.
- **Cell key.** Preflop spots match on scenario + hero position + effective
  stack (+ villain position when the legacy row carries one). Postflop spots
  match on a normalized board key (flop cards sorted, turn/river kept in order)
  + hero position + stack, across all 94 snapshot configs regardless of the
  snapshot's own category label.
- **Position labels** are normalized (\`BU\`→\`BTN\`, \`UTG1\`→\`UTG+1\`); \`UTG+1\` and
  \`LJ\` stay distinct.
- **Action comparison** is at semantic action type
  (fold/call/check/limp/raise/bet/all-in). Rows whose semantic sets match but
  whose legacy row carried a specific raise/bet size are reported separately as
  sizing-only differences, never dropped.
- **Node identity.** Multiple snapshot configs can share the same
  scenario/position/stack key but be different nodes (e.g. the CO-vs-BTN
  "3-bet response" config vs the "3-bet all-in" jam config). The matched cell is
  the one with an exact villain-position match, then (as a tiebreak) the one
  whose config action-vocabulary is most similar to the legacy config's own
  vocabulary, then combo-level agreement, expressibility, node richness, and a
  content-hash order.
- **Villain-ambiguous spots.** Legacy multiway-defense rows carry no villain, so
  several equally-valid snapshot villain-combos match; the combo-agreement
  tiebreak picks a node consistent with the legacy decision where one exists, so
  those rows are only reported as disagreements when *no* matching multiway node
  accepts the legacy action.

## Coverage

| Metric | Count |
|---|---|
| Legacy spots (all, incl. postflop) | ${legacyCount} |
| Matched | ${matched} |
| Unmatched | ${unmatched.length} |
| Agreements | ${agreements.length} |
| Sizing-only differences | ${sizingOnly.length} |
| **Disagreements** | **${disagreements.length}** |

## Disagreements (legacy vs snapshot semantic actions)

${disagreements.length === 0 ? '_None._' : `| Cell / combo | Legacy | Snapshot |\n|---|---|---|\n${disagreementRows}`}

## Sizing-only differences

${sizingOnly.length === 0 ? '_None._' : `| Cell / combo | Legacy (raw) | Snapshot |\n|---|---|---|\n${sizingRows}`}

## Unmatched legacy spots

${unmatched.length === 0 ? '_None._' : `| Cell / combo | Reason |\n|---|---|\n${unmatchedRows}`}

## Open items

- [ ] Owner review of every disagreement above; no legacy pack was superseded,
      deleted, or silently reconciled in this slice.
`;
}

function writeIfChanged(path: string, content: string, changes: string[]): void {
  if (CHECK) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (current !== content) changes.push(path);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function main(): void {
  const configs = loadUniqueConfigs();
  const { packs, included, excluded } = buildPacks(configs);
  const legacySpots = OVERLAP ? loadLegacySpots() : [];
  const overlapEntries = OVERLAP ? runOverlap(legacySpots, buildSnapshotIndex(configs)) : [];

  const changes: string[] = [];

  if (!CHECK) {
    if (existsSync(PACKS_DIR)) {
      for (const file of readdirSync(PACKS_DIR)) {
        if (file.endsWith('.generated.ts')) rmSync(join(PACKS_DIR, file));
      }
    }
    mkdirSync(PACKS_DIR, { recursive: true });
  }

  for (const pack of packs) {
    writeIfChanged(join(PACKS_DIR, `${pack.slug}.generated.ts`), packModule(pack), changes);
  }
  writeIfChanged(join(OUT_DIR, 'registry.generated.ts'), registryModule(packs), changes);
  writeIfChanged(join(OUT_DIR, 'loaders.generated.ts'), loadersModule(packs), changes);
  if (OVERLAP) {
    writeIfChanged(OVERLAP_JSON_PATH, overlapJson(overlapEntries, legacySpots.length), changes);
    writeIfChanged(OVERLAP_REPORT_PATH, overlapReport(overlapEntries, legacySpots.length), changes);
  }

  if (CHECK) {
    if (changes.length > 0) {
      console.error('CT range pack artifacts are stale. Run: npx tsx scripts/import-ct-curriculum.ts --snapshot <dir>');
      for (const file of changes) console.error(`  drift: ${file}`);
      process.exit(1);
    }
    console.log('CT range pack artifacts are up to date.');
    return;
  }

  console.log(`Included ${included.length} range packs, excluded ${excluded.length} configs.`);
  if (OVERLAP) {
    const disagreements = overlapEntries.filter((e) => e.status === 'disagreement').length;
    const unmatched = overlapEntries.filter((e) => e.status === 'unmatched').length;
    console.log(`Overlap: ${legacySpots.length} legacy spots, ${legacySpots.length - unmatched} matched, ${unmatched} unmatched, ${disagreements} disagreements.`);
  }
}

main();
