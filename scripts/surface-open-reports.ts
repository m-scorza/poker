#!/usr/bin/env tsx
/**
 * Surface OPEN health/janitor reports into agent context.
 *
 * Wired as a SessionStart hook in .claude/settings.json: its stdout is injected
 * into the conversation on exit 0, so every agent session sees the open reports
 * before doing work. A report is "open" until someone flips its frontmatter
 * `status:` to `resolved`.
 *
 * Convention (see docs/reports/README.md):
 *   - Each docs/reports/*.md MAY start with YAML frontmatter `status: open | resolved`.
 *   - Only `status: open` reports are surfaced. Missing/`resolved` => silent.
 *   - Surfaced content is, in priority order, the report's `## Open items`
 *     section, else `## Recommended next actions`, else the first lines of body.
 *
 * Exits 0 always (a reporting hook must never block a session). Prints nothing
 * when no report is open.
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
const FALLBACK_BODY_LINES = 25;

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

function collectOpenReports(): OpenReport[] {
  let files: string[];
  try {
    files = readdirSync(REPORTS_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md');
  } catch {
    return [];
  }

  const open: OpenReport[] = [];
  for (const file of files) {
    const raw = readFileSync(join(REPORTS_DIR, file), 'utf-8');
    if (readStatus(raw) !== 'open') continue;

    const body = stripFrontmatter(raw);
    const section =
      extractSection(body, 'Open items') ??
      extractSection(body, 'Recommended next actions') ??
      body.split('\n').slice(0, FALLBACK_BODY_LINES).join('\n').trim();

    open.push({ file, dateKey: leadingDate(file), section: clamp(section, MAX_SECTION_LINES) });
  }

  open.sort((a, b) => b.dateKey.localeCompare(a.dateKey)); // newest first
  return open;
}

function render(open: OpenReport[]): string {
  const out: string[] = [];
  out.push('⚠️ OPEN health reports — review before planning or starting work.');
  out.push('These stay surfaced until their items are done and someone sets');
  out.push('`status: resolved` in the report frontmatter (see docs/reports/README.md).');
  out.push('');
  for (const r of open) {
    out.push(`### docs/reports/${r.file}`);
    out.push(r.section);
    out.push('');
  }
  return clamp(out.join('\n').trimEnd(), MAX_TOTAL_LINES);
}

const open = collectOpenReports();
if (open.length > 0) {
  process.stdout.write(render(open) + '\n');
}
process.exit(0);
