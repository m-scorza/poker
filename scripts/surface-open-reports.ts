#!/usr/bin/env tsx
/**
 * Surface ACTIVE health/janitor reports into agent context.
 *
 * Wired as a SessionStart hook in .claude/settings.json: its stdout is injected
 * into the conversation on exit 0, so every agent session sees the active reports
 * before doing work.
 *
 * Convention (see docs/reports/README.md):
 *   - Reports live in docs/reports/ (active) and docs/reports/archive/ (done).
 *     This scans only the active top level, so archived reports never surface.
 *   - A report is surfaced only when its frontmatter `status:` is `open` or
 *     `in_progress` AND it has a `## Open items` (or `## Recommended next actions`)
 *     section. Reports without such a section (e.g. a reference appendix) stay
 *     silent; the README index still lists every report.
 *
 * Exits 0 always (a reporting hook must never block a session). Prints nothing
 * when nothing active needs attention.
 *
 * Usage:
 *   tsx scripts/surface-open-reports.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = process.env.CLAUDE_PROJECT_DIR ?? join(__dirname, '..');
const REPORTS_DIR = join(REPO_ROOT, 'docs', 'reports');

const MAX_TOTAL_LINES = 70; // hard cap on injected context
const MAX_SECTION_LINES = 30; // per-report cap before truncation

interface OpenReport {
  file: string;
  dateKey: string;
  section: string;
}

/** Extract the YAML frontmatter `status:` value, or null if absent. */
function readStatus(raw: string): string | null {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;
  const front = raw.slice(3, end);
  const match = /^\s*status:\s*(\S+)/m.exec(front);
  return match ? match[1]!.toLowerCase() : null;
}

/** Strip frontmatter so body-relative extraction is not confused by it. */
function stripFrontmatter(raw: string): string {
  if (!raw.startsWith('---')) return raw;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return raw;
  const after = raw.indexOf('\n', end + 1);
  return after === -1 ? '' : raw.slice(after + 1);
}

/** Pull a `## <heading>` section (up to the next `## ` heading), trimmed. */
function extractSection(body: string, heading: string): string | null {
  const lines = body.split('\n');
  const headRe = new RegExp(`^##\\s+${heading}\\s*$`, 'i');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headRe.test(lines[i]!)) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  const collected: string[] = [];
  for (let i = start; i < lines.length; i++) {
    if (/^##\s/.test(lines[i]!)) break;
    collected.push(lines[i]!);
  }
  return collected.join('\n').trim();
}

function clamp(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return [...lines.slice(0, maxLines), '… (truncated — read the full report)'].join('\n');
}

function leadingDate(file: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(file);
  return m ? m[1]! : '0000-00-00'; // undated reports sort last
}

function collectActiveReports(): OpenReport[] {
  let files: string[];
  try {
    files = readdirSync(REPORTS_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md');
  } catch {
    return [];
  }

  const active: OpenReport[] = [];
  for (const file of files) {
    const raw = readFileSync(join(REPORTS_DIR, file), 'utf-8');
    const status = readStatus(raw);
    if (status !== 'open' && status !== 'in_progress') continue;

    const body = stripFrontmatter(raw);
    const section =
      extractSection(body, 'Open items') ?? extractSection(body, 'Recommended next actions');
    if (!section) continue; // no actionable section → not surfaced (index still lists it)

    active.push({ file, dateKey: leadingDate(file), section: clamp(section, MAX_SECTION_LINES) });
  }

  active.sort((a, b) => b.dateKey.localeCompare(a.dateKey)); // newest first
  return active;
}

function render(open: OpenReport[]): string {
  const out: string[] = [];
  out.push('⚠️ ACTIVE health reports — review before planning or starting work.');
  out.push('These stay surfaced until their items are done and the report is set to');
  out.push('`status: resolved` / `superseded` (see docs/reports/README.md).');
  out.push('');
  for (const r of open) {
    out.push(`### docs/reports/${r.file}`);
    out.push(r.section);
    out.push('');
  }
  return clamp(out.join('\n').trimEnd(), MAX_TOTAL_LINES);
}

const active = collectActiveReports();
if (active.length > 0) {
  process.stdout.write(render(active) + '\n');
}
process.exit(0);
