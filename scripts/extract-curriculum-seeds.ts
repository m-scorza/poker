#!/usr/bin/env tsx
/**
 * Build brand-neutral local curriculum seed packs from the adjacent
 * poker-knowledge quiz config export.
 *
 * This script intentionally imports no videos, account/profile data, or private
 * platform copy. It transforms scenario names, actions, positions, and combos
 * into app-owned local drill data with source provenance.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');
const SOURCE_PATH = join(REPO_ROOT, '..', 'poker-knowledge', 'quiz_configs.json');
const OUT_PATH = join(REPO_ROOT, 'src', 'data', 'curriculumSeedPacks.generated.ts');
const SOURCE_LABEL = '../poker-knowledge/quiz_configs.json';

function resolveSourcePath(): string {
  const flagIndex = process.argv.indexOf('--source');
  const value = flagIndex === -1 ? undefined : process.argv[flagIndex + 1];
  return value ? value : SOURCE_PATH;
}

interface RawExpectedAnswer {
  combos?: unknown;
  answer?: unknown;
}

interface RawHistoryAction {
  position?: unknown;
  action?: unknown;
}

interface RawHistoryStreet {
  street?: unknown;
  actions?: unknown;
}

interface RawSpotConfig {
  heroStackSize?: unknown;
  villainStackSize?: unknown;
  actionHistory?: unknown;
}

interface RawAnswerGroup {
  position?: unknown;
  stackSize?: unknown;
  board?: unknown;
  villainPosition?: unknown;
  spotConfig?: unknown;
  expectedAnswers?: unknown;
}

interface RawQuizConfig {
  name?: unknown;
  action?: unknown;
  tableSize?: unknown;
  expectedAnswers?: unknown;
}

interface CurriculumSpotSeed {
  id: string;
  combo: string;
  position: 'UTG' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
  stackBb: number;
  acceptedActions: string[];
  legalActions?: string[];
  sourceGroupIndex: number;
  heroCards?: [string, string];
  board?: string[];
  villainPosition?: string;
  heroStackSize?: number;
  villainStackSize?: number;
  actionLine?: string;
}

interface CurriculumSeedPack {
  slug: string;
  title: string;
  description: string;
  source: {
    kind: 'brand_neutralized_quiz_config';
    path: string;
    sourceConfigIndexes: number[];
  };
  spots: CurriculumSpotSeed[];
}

const PACK_COPY: Record<string, { slug: string; title: string; description: string }> = {
  RFI: {
    slug: 'open-raise-fundamentals',
    title: 'Open-raise fundamentals',
    description: 'Preflop opener practice across positions and stack depths.',
  },
  'Cbet em posição vs BB': {
    slug: 'in-position-cbet-vs-bb',
    title: 'In-position c-bet vs BB',
    description: 'Continuation-bet decisions after opening and seeing a flop in position versus the big blind.',
  },
  'Cbet Turn e River em Posição vs BB': {
    slug: 'in-position-turn-river-barrels-vs-bb',
    title: 'In-position turn/river barrels vs BB',
    description: 'Later-street barrel sizing practice in position versus the big blind.',
  },
  'Vs RFI': {
    slug: 'versus-open-raise',
    title: 'Versus open raise',
    description: 'Preflop response practice when another player opens first.',
  },
  'Jogando do BB': {
    slug: 'big-blind-defense',
    title: 'Big blind defense',
    description: 'Big blind response practice across stack depths and open sizes.',
  },
  'Blind War Pré Flop': {
    slug: 'blind-war-preflop',
    title: 'Blind-war preflop',
    description: 'Small-blind and big-blind preflop practice for heads-up blind battles.',
  },
  'Jogando vs Cbet do BB': {
    slug: 'versus-bb-cbet',
    title: 'Versus BB c-bet',
    description: 'Response practice after the big blind continuation-bets.',
  },
  'Defesa de BB Multway': {
    slug: 'multiway-bb-defense',
    title: 'Multiway BB defense',
    description: 'Big blind defense practice in multiway raised pots.',
  },
  'Enfrentando uma 3bet': {
    slug: 'facing-3bet-frontier',
    title: 'Facing 3-bet frontier',
    description: 'Preflop practice after facing a 3-bet, kept separate from imported-hand grading.',
  },
  'Cbet Fora de Posição': {
    slug: 'out-of-position-cbet',
    title: 'Out-of-position c-bet',
    description: 'Continuation-bet decisions after reaching the flop out of position.',
  },
  'Jogando em Posição': {
    slug: 'in-position-postflop',
    title: 'In-position postflop',
    description: 'In-position postflop response and betting practice.',
  },
};

function readRawConfigs(): RawQuizConfig[] {
  const parsed: unknown = JSON.parse(readFileSync(resolveSourcePath(), 'utf-8'));
  if (!Array.isArray(parsed)) throw new Error('quiz_configs.json must be an array');
  return parsed as RawQuizConfig[];
}

function normalizePosition(position: unknown): CurriculumSpotSeed['position'] | null {
  if (typeof position !== 'string') return null;
  if (position === 'UTG1') return 'LJ';
  if (/^(UTG|LJ|HJ|CO|BTN|SB|BB)$/.test(position)) return position as CurriculumSpotSeed['position'];
  return null;
}

function normalizeAction(action: unknown): string | null {
  if (typeof action !== 'string') return null;
  const clean = action.trim().toUpperCase();
  if (clean === 'FOLD') return 'fold';
  if (clean === 'CALL') return 'call';
  if (clean === 'CHECK') return 'check';
  if (clean === 'LIMP') return 'limp';
  if (clean === 'ALL-IN') return 'all_in';
  const raise = clean.match(/^RAISE\s+(.+)$/);
  if (raise) return `raise_${raise[1]!.replace(/\s+/g, '_').replace(/\./g, '_')}`.toLowerCase();
  const bet = clean.match(/^BET\s+(.+)$/);
  if (bet) return `bet_${bet[1]!.replace(/\s+/g, '_').replace(/%/g, 'pct').replace(/\./g, '_')}`.toLowerCase();
  const cbet = clean.match(/^CBET\s+(.+)$/);
  if (cbet) return `cbet_${cbet[1]!.replace(/\s+/g, '_').replace(/\//g, '_')}`.toLowerCase();
  return clean.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || null;
}

const RANK_ORDER = '23456789TJQKA';
function normalizeCombo(combo: unknown): string | null {
  if (typeof combo !== 'string') return null;
  const value = combo.trim().toUpperCase();
  const shorthand = value.match(/^([2-9TJQKA])([2-9TJQKA])([SO])?$/);
  if (shorthand) return orderHandClass(shorthand[1]!, shorthand[2]!, shorthand[3]);

  const suitedCards = value.match(/^([2-9TJQKA])[CDHS]([2-9TJQKA])[CDHS]$/);
  if (!suitedCards) return null;
  const firstSuit = value[1];
  const secondSuit = value[3];
  const suitedness = suitedCards[1] === suitedCards[2] ? undefined : firstSuit === secondSuit ? 'S' : 'O';
  return orderHandClass(suitedCards[1]!, suitedCards[2]!, suitedness);
}

function orderHandClass(a: string, b: string, suitedness?: string): string {
  if (a === b) return `${a}${b}`;
  const ordered = RANK_ORDER.indexOf(a) >= RANK_ORDER.indexOf(b) ? [a, b] : [b, a];
  return `${ordered[0]}${ordered[1]}${suitedness === 'S' ? 's' : 'o'}`;
}

function parseBoard(board: unknown): string[] | undefined {
  if (typeof board !== 'string') return undefined;
  const cards = board.split('-').map((card) => card.trim()).filter(Boolean);
  return cards.length > 0 ? cards : undefined;
}

const STREET_LABELS: Record<string, string> = {
  'PRÉ-FLOP': 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
};

function translateHistoryAction(action: unknown): string | null {
  if (typeof action !== 'string') return null;
  const match = action.trim().match(/^(\S+)(?:\s+(.+))?$/);
  if (!match) return null;
  const verb = match[1]!.toLowerCase();
  const amount = match[2]?.trim();
  const sized = (label: string) =>
    amount ? `${label} ${/^[\d.]+$/.test(amount) ? `${amount}bb` : amount}` : label;
  if (verb === 'fold') return 'folds';
  if (verb === 'check') return 'checks';
  if (verb === 'call') return 'calls';
  if (verb === 'limp') return 'limps';
  if (verb === 'raise') return sized('raises');
  if (verb === 'bet') return sized('bets');
  if (verb === 'cbet') return sized('c-bets');
  return null;
}

function buildActionLine(spotConfig: RawSpotConfig | undefined): string | undefined {
  const history = spotConfig && Array.isArray(spotConfig.actionHistory)
    ? spotConfig.actionHistory as RawHistoryStreet[]
    : [];
  const segments = history
    .map((street) => {
      const label = typeof street.street === 'string' ? STREET_LABELS[street.street] : undefined;
      if (!label) return null;
      const actions = (Array.isArray(street.actions) ? street.actions as RawHistoryAction[] : [])
        .map((entry) => {
          const verb = translateHistoryAction(entry.action);
          if (!verb || typeof entry.position !== 'string') return null;
          return `${entry.position} ${verb}`;
        })
        .filter((entry): entry is string => Boolean(entry));
      return actions.length > 0 ? `${label}: ${actions.join(', ')}` : null;
    })
    .filter((segment): segment is string => Boolean(segment));
  return segments.length > 0 ? segments.join('; ') : undefined;
}

function buildPacks(configs: RawQuizConfig[]): CurriculumSeedPack[] {
  const bySlug = new Map<string, CurriculumSeedPack>();

  configs.forEach((config, configIndex) => {
    if (typeof config.name !== 'string') return;
    const copy = PACK_COPY[config.name];
    if (!copy) throw new Error(`No brand-neutral pack mapping for ${config.name}`);

    const pack = bySlug.get(copy.slug) ?? {
      ...copy,
      source: { kind: 'brand_neutralized_quiz_config', path: SOURCE_LABEL, sourceConfigIndexes: [] },
      spots: [],
    };
    if (!pack.source.sourceConfigIndexes.includes(configIndex)) pack.source.sourceConfigIndexes.push(configIndex);

    const groups = Array.isArray(config.expectedAnswers) ? config.expectedAnswers as RawAnswerGroup[] : [];
    groups.forEach((group, groupIndex) => {
      const position = normalizePosition(group.position);
      const stackBb = typeof group.stackSize === 'number' ? group.stackSize : null;
      if (!position || !stackBb || stackBb <= 0) return;

      const board = parseBoard(group.board);
      const spotConfig = board && group.spotConfig && typeof group.spotConfig === 'object'
        ? group.spotConfig as RawSpotConfig
        : undefined;
      const villainPosition = board && typeof group.villainPosition === 'string' ? group.villainPosition : undefined;
      const heroStackSize = typeof spotConfig?.heroStackSize === 'number' ? spotConfig.heroStackSize : undefined;
      const villainStackSize = typeof spotConfig?.villainStackSize === 'number' ? spotConfig.villainStackSize : undefined;
      const actionLine = buildActionLine(spotConfig);

      const answers = Array.isArray(group.expectedAnswers) ? group.expectedAnswers as RawExpectedAnswer[] : [];
      answers.forEach((entry, entryIndex) => {
        const combos = Array.isArray(entry.combos) ? entry.combos : [];
        const acceptedActions = (Array.isArray(entry.answer) ? entry.answer : [])
          .map(normalizeAction)
          .filter((a): a is string => Boolean(a));
        if (acceptedActions.length === 0) return;

        combos.forEach((rawCombo, comboIndex) => {
          const combo = normalizeCombo(rawCombo);
          if (!combo) return;
          pack.spots.push({
            id: `${copy.slug}-${configIndex}-${groupIndex}-${entryIndex}-${comboIndex}`,
            combo,
            position,
            stackBb,
            acceptedActions: Array.from(new Set(acceptedActions)).sort(),
            sourceGroupIndex: groupIndex,
            board,
            villainPosition,
            heroStackSize,
            villainStackSize,
            actionLine,
          });
        });
      });
    });

    bySlug.set(copy.slug, pack);
  });

  return Array.from(bySlug.values())
    .map((pack) => ({ ...pack, spots: pack.spots.sort((a, b) => a.id.localeCompare(b.id)) }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const packs = buildPacks(readRawConfigs());
const content = `// Generated by scripts/extract-curriculum-seeds.ts. Do not edit by hand.\n\nexport interface CurriculumSpotSeed {\n  id: string;\n  combo: string;\n  position: 'UTG' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';\n  stackBb: number;\n  acceptedActions: string[];\n  legalActions?: string[];\n  sourceGroupIndex: number;\n  heroCards?: [string, string];\n  board?: string[];\n  villainPosition?: string;\n  heroStackSize?: number;\n  villainStackSize?: number;\n  actionLine?: string;\n}\n\nexport interface CurriculumSeedPack {\n  slug: string;\n  title: string;\n  description: string;\n  source: {\n    kind: 'brand_neutralized_quiz_config';\n    path: string;\n    sourceConfigIndexes: number[];\n  };\n  spots: CurriculumSpotSeed[];\n}\n\nexport const CURRICULUM_SEED_PACKS = ${JSON.stringify(packs, null, 2)} satisfies CurriculumSeedPack[];\n`;

const check = process.argv.includes('--check');
if (check) {
  const current = readFileSync(OUT_PATH, 'utf-8');
  if (current !== content) {
    console.error('curriculumSeedPacks.generated.ts is stale. Run: npx tsx scripts/extract-curriculum-seeds.ts');
    process.exit(1);
  }
} else {
  writeFileSync(OUT_PATH, content);
  console.log(`Wrote ${packs.length} curriculum seed packs to ${OUT_PATH}`);
}
