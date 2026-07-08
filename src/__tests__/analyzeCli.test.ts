/**
 * Shell-out contract for the headless analyze CLI (scripts/analyze-cli.ts).
 * Infra test in the agentKernel.test.ts mold: runs the real script against a
 * real fixture and asserts the JSON contract scripting users depend on.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../..');
const tsxBin = join(repoRoot, 'node_modules', '.bin', 'tsx');
const cliPath = join(repoRoot, 'scripts', 'analyze-cli.ts');
const fixture = join(
  repoRoot,
  'src/test/fixtures/pokerstars/hh',
  "HH20260405 T3989543785 No Limit Hold'em US$ 0,90 + US$ 0,10.txt",
);

function runCli(args: string[]) {
  return spawnSync(tsxBin, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    timeout: 60_000,
  });
}

describe('analyze CLI', () => {
  it('emits the stable JSON contract for a real fixture', () => {
    expect(existsSync(fixture)).toBe(true);
    const result = runCli([fixture, '--json']);
    expect(result.status, result.stderr).toBe(0);

    const report = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(Object.keys(report).sort()).toEqual([
      'decisions', 'files', 'hands', 'leaks', 'stats', 'summaries', 'tournaments',
    ]);
    expect(report.hands).toBeGreaterThan(0);
    expect(report.decisions).toBeGreaterThan(0);
    const files = report.files as { total: number; parsed: number };
    expect(files.total).toBe(1);
    expect(files.parsed).toBe(1);
    const stats = report.stats as Record<string, unknown>;
    expect(typeof stats.vpipPct).toBe('number');
    expect(typeof stats.compliancePct).toBe('number');
    expect(Array.isArray(report.leaks)).toBe(true);
  }, 60_000);

  it('fails usefully with no input files', () => {
    const result = runCli([]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage:');
  }, 60_000);
});
