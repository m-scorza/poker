import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * UIR-002 — numeric presentation boundary.
 *
 * Chip/blind/stack values must render through the shared `chipAmount`
 * formatter, never raw. Raw rendering is how `385.00000000000006` reached the
 * UI: the value came from user-supplied input (e.g. `Number(cells[0])` when
 * parsing an uploaded push/fold CSV) and IEEE-754 artefacts went straight to
 * the screen.
 *
 * This guard keeps the migration from regressing — it fails when a new JSX
 * site interpolates a `*Bb` value immediately before a literal `bb` unit
 * without passing it through a formatter.
 */
const SRC = resolve(process.cwd(), 'src');

function tsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      tsxFiles(full, acc);
    } else if (entry.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

/** `{something.minStackBb}` style interpolation directly followed by a `bb` unit. */
const RAW_BB_RENDER = /\{[^}]*Bb\}(?=[-\s·]*(?:\{[^}]*Bb\})?\s*bb\b)/;

describe('numeric presentation boundary (UIR-002)', () => {
  const files = tsxFiles(SRC);

  it('scans a non-trivial number of component files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('renders no bb value raw — every site goes through a formatter', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      source.split('\n').forEach((line, i) => {
        if (!RAW_BB_RENDER.test(line)) return;
        if (/chipAmount|toFixed|money\(|pct\(/.test(line)) return;
        offenders.push(`${file.replace(SRC, 'src')}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
