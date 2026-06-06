#!/usr/bin/env tsx
/**
 * Enforce the current private/local product boundary.
 *
 * This is a static tripwire, not a permanent product ban. Future opt-in cloud,
 * support-export, or solver API work may add a precise allowlist entry here,
 * but that change should travel with privacy docs and reviewed UX.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

export type PrivacyPatternId =
  | 'external-url'
  | 'fetch'
  | 'xml-http-request'
  | 'send-beacon'
  | 'web-socket'
  | 'event-source'
  | 'navigator-share'
  | 'blocked-dependency';

export interface PrivacyFinding {
  file: string;
  line: number;
  patternId: PrivacyPatternId;
  matched: string;
  reason: string;
}

export interface PrivacyAllowlistEntry {
  file: string;
  patternId: PrivacyPatternId;
  reason: string;
}

const PRIVACY_ALLOWLIST: PrivacyAllowlistEntry[] = [
  // Future explicit opt-in network features belong here, one exact file and pattern at a time.
];

const ALLOWED_URL_PREFIXES = [
  'http://www.w3.org/2000/svg',
  'https://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'https://www.w3.org/1999/xlink',
];

const SOURCE_PATTERNS: Array<{ id: PrivacyPatternId; regex: RegExp; reason: string }> = [
  {
    id: 'fetch',
    regex: /\bfetch\s*\(/g,
    reason: 'Browser fetch can upload or retrieve data outside the local app boundary.',
  },
  {
    id: 'xml-http-request',
    regex: /\bXMLHttpRequest\b/g,
    reason: 'XMLHttpRequest can upload or retrieve data outside the local app boundary.',
  },
  {
    id: 'send-beacon',
    regex: /\b(?:navigator\.)?sendBeacon\s*\(/g,
    reason: 'sendBeacon is commonly used for silent telemetry.',
  },
  {
    id: 'web-socket',
    regex: /\b(?:new\s+)?WebSocket\s*\(/g,
    reason: 'WebSocket opens a persistent network channel.',
  },
  {
    id: 'event-source',
    regex: /\bEventSource\s*\(/g,
    reason: 'EventSource opens a persistent network channel.',
  },
  {
    id: 'navigator-share',
    regex: /\bnavigator\.share\s*\(/g,
    reason: 'Native share flows can move local hand-history data outside the app.',
  },
];

const EXTERNAL_URL_REGEX = /https?:\/\/[^\s"'`)<]+/g;

const BLOCKED_DEPENDENCIES = [
  '@amplitude/',
  '@anthropic-ai/sdk',
  '@firebase/',
  '@posthog/',
  '@segment/',
  '@sentry/',
  '@supabase/',
  '@vercel/analytics',
  'amplitude-js',
  'firebase',
  'mixpanel-browser',
  'openai',
  'plausible-tracker',
  'posthog-js',
  'sentry',
  'stripe',
];

function normalizePath(file: string): string {
  return file.split(sep).join('/');
}

function lineForOffset(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function isAllowedUrl(value: string): boolean {
  return ALLOWED_URL_PREFIXES.some(prefix => value.startsWith(prefix));
}

function isAllowlisted(finding: PrivacyFinding, allowlist: PrivacyAllowlistEntry[]): boolean {
  return allowlist.some(entry =>
    entry.file === finding.file &&
    entry.patternId === finding.patternId &&
    entry.reason.trim().length > 0,
  );
}

export function scanSourceText(
  file: string,
  content: string,
  allowlist: PrivacyAllowlistEntry[] = PRIVACY_ALLOWLIST,
): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];

  for (const pattern of SOURCE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    for (const match of content.matchAll(pattern.regex)) {
      findings.push({
        file,
        line: lineForOffset(content, match.index ?? 0),
        patternId: pattern.id,
        matched: match[0],
        reason: pattern.reason,
      });
    }
  }

  for (const match of content.matchAll(EXTERNAL_URL_REGEX)) {
    const matched = match[0];
    if (isAllowedUrl(matched)) continue;
    findings.push({
      file,
      line: lineForOffset(content, match.index ?? 0),
      patternId: 'external-url',
      matched,
      reason: 'External URLs can trigger network requests or pull remote assets into the local app.',
    });
  }

  return findings.filter(finding => !isAllowlisted(finding, allowlist));
}

function isBlockedDependency(name: string): boolean {
  return BLOCKED_DEPENDENCIES.some(blocked => {
    if (blocked.endsWith('/')) return name.startsWith(blocked);
    return name === blocked;
  });
}

export function scanPackageJsonText(content: string): PrivacyFinding[] {
  const parsed = JSON.parse(content) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencyGroups = [parsed.dependencies ?? {}, parsed.devDependencies ?? {}];
  const findings: PrivacyFinding[] = [];

  for (const group of dependencyGroups) {
    for (const name of Object.keys(group)) {
      if (!isBlockedDependency(name)) continue;
      findings.push({
        file: 'package.json',
        line: 1,
        patternId: 'blocked-dependency',
        matched: name,
        reason: 'Telemetry, cloud, payment, or remote-AI SDK dependency needs explicit privacy review before entering the local app.',
      });
    }
  }

  return findings;
}

function shouldScanFile(relativePath: string): boolean {
  const path = normalizePath(relativePath);
  if (path.includes('/__tests__/') || path.startsWith('src/test/') || /\.test\.(ts|tsx|js|jsx)$/.test(path)) {
    return false;
  }
  return /\.(ts|tsx|js|jsx|css|html|json|svg)$/.test(path);
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function candidateFiles(root = REPO_ROOT): string[] {
  const files: string[] = [];
  for (const dir of ['src', 'public']) {
    const full = join(root, dir);
    if (existsSync(full)) files.push(...walk(full));
  }
  for (const file of ['index.html', 'vite.config.ts']) {
    const full = join(root, file);
    if (existsSync(full)) files.push(full);
  }
  return files;
}

export function scanPrivacyBoundary(root = REPO_ROOT): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];

  for (const file of candidateFiles(root)) {
    const relativePath = normalizePath(relative(root, file));
    if (!shouldScanFile(relativePath)) continue;
    findings.push(...scanSourceText(relativePath, readFileSync(file, 'utf8')));
  }

  const packagePath = join(root, 'package.json');
  if (existsSync(packagePath)) {
    findings.push(...scanPackageJsonText(readFileSync(packagePath, 'utf8')));
  }

  return findings;
}

export function formatFindings(findings: PrivacyFinding[]): string {
  if (findings.length === 0) {
    return 'Privacy boundary check passed: no unreviewed network, telemetry, remote asset, or native-share surface found.';
  }

  return [
    'Privacy boundary check failed.',
    'The current product gate is private/local. Add a documented opt-in design and a precise allowlist entry before introducing network/share behavior.',
    '',
    ...findings.map(finding =>
      `- ${finding.file}:${finding.line} [${finding.patternId}] ${finding.matched}\n  ${finding.reason}`,
    ),
  ].join('\n');
}

function main(): void {
  const findings = scanPrivacyBoundary();
  const output = formatFindings(findings);
  if (findings.length === 0) {
    console.log(output);
    return;
  }

  console.error(output);
  process.exit(1);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main();
}
