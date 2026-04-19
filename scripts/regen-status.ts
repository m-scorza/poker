#!/usr/bin/env tsx
/**
 * Regenerate autogen blocks in docs/STATUS.md from source.
 *
 * Writes four sections between <!-- BEGIN:AUTOGEN:<name> --> /
 * <!-- END:AUTOGEN:<name> --> markers:
 *   - deps      — dependencies + devDependencies from package.json
 *   - routes    — <Route> entries from src/App.tsx
 *   - src-tree  — files under src/{parser,analysis,data,pages,components,utils,types}
 *   - tests     — test-file count from src/**\/__tests__/*.test.{ts,tsx}
 *
 * Usage:
 *   tsx scripts/regen-status.ts          # rewrite STATUS.md in place
 *   tsx scripts/regen-status.ts --check  # exit 1 if STATUS.md is stale
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');
const STATUS_PATH = join(REPO_ROOT, 'docs', 'STATUS.md');
const PKG_PATH = join(REPO_ROOT, 'package.json');
const APP_PATH = join(REPO_ROOT, 'src', 'App.tsx');
const SRC_DIRS = ['parser', 'analysis', 'data', 'pages', 'components', 'utils', 'types'];

const CHECK = process.argv.includes('--check');

function depsBlock(): string {
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
  const fmt = (o: Record<string, string>) =>
    Object.entries(o).sort(([a], [b]) => a.localeCompare(b)).map(([n, v]) => `- ${n} ${v}`).join('\n');
  return [
    '**Runtime** (`dependencies`):',
    '',
    fmt(pkg.dependencies ?? {}),
    '',
    '**Build / test** (`devDependencies`):',
    '',
    fmt(pkg.devDependencies ?? {}),
  ].join('\n');
}

function routesBlock(): string {
  const src = readFileSync(APP_PATH, 'utf-8');
  const re = /<Route\s+path=["']([^"']+)["']\s+element=\{<(\w+)/g;
  const rows: Array<[string, string]> = [];
  let m;
  while ((m = re.exec(src)) !== null) rows.push([m[1]!, m[2]!]);
  rows.sort(([a], [b]) => a.localeCompare(b));
  const header = '| Path | Component |';
  const sep = '|---|---|';
  const body = rows.map(([p, c]) => `| \`${p}\` | \`${c}\` |`).join('\n');
  return [header, sep, body].join('\n');
}

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const e of entries) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(e) && !/\.test\.(ts|tsx)$/.test(e)) acc.push(full);
  }
  return acc;
}

function srcTreeBlock(): string {
  const lines: string[] = ['```'];
  for (const d of SRC_DIRS) {
    const files = walk(join(REPO_ROOT, 'src', d))
      .map(f => relative(join(REPO_ROOT, 'src'), f).split(sep).join('/'))
      .sort();
    if (files.length === 0) continue;
    lines.push(`src/${d}/  (${files.length} files)`);
    for (const f of files) lines.push(`  ${f}`);
  }
  lines.push('```');
  return lines.join('\n');
}

function testsBlock(): string {
  const files: string[] = [];
  function find(dir: string) {
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e);
      const st = statSync(full);
      if (st.isDirectory()) find(full);
      else if (/\.test\.(ts|tsx)$/.test(e)) files.push(full);
    }
  }
  find(join(REPO_ROOT, 'src'));
  files.sort();

  const relPaths = files.map(f => relative(REPO_ROOT, f).split(sep).join('/'));
  let totalTests = 0;
  for (const f of files) {
    const src = readFileSync(f, 'utf-8');
    const matches = src.match(/^\s*(it|test)(\.\w+)?\s*\(/gm);
    totalTests += matches ? matches.length : 0;
  }
  return [
    `**Test files:** ${files.length}`,
    `**\`it\` / \`test\` calls (approximate):** ${totalTests}`,
    '',
    '```',
    ...relPaths,
    '```',
  ].join('\n');
}

const blocks: Record<string, () => string> = {
  deps: depsBlock,
  routes: routesBlock,
  'src-tree': srcTreeBlock,
  tests: testsBlock,
};

function regen(status: string): string {
  let out = status;
  for (const [name, fn] of Object.entries(blocks)) {
    const begin = `<!-- BEGIN:AUTOGEN:${name} -->`;
    const end = `<!-- END:AUTOGEN:${name} -->`;
    const re = new RegExp(`${begin}[\\s\\S]*?${end}`, 'g');
    if (!re.test(out)) {
      console.error(`Missing marker block "${name}" in ${STATUS_PATH}. Add:\n${begin}\n\n${end}`);
      process.exit(2);
    }
    re.lastIndex = 0;
    out = out.replace(re, `${begin}\n${fn()}\n${end}`);
  }
  return out;
}

const current = readFileSync(STATUS_PATH, 'utf-8');
const next = regen(current);

if (CHECK) {
  if (current !== next) {
    console.error('docs/STATUS.md autogen blocks are stale. Run: npm run docs:update');
    process.exit(1);
  }
  process.exit(0);
}

if (current !== next) {
  writeFileSync(STATUS_PATH, next, 'utf-8');
  console.log('docs/STATUS.md updated.');
} else {
  console.log('docs/STATUS.md already up to date.');
}
