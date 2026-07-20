import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const overlap = JSON.parse(readFileSync(join(HERE, '..', 'overlap.generated.json'), 'utf8')) as {
  capturedAt: string;
  summary: {
    legacySpots: number;
    matched: number;
    unmatched: number;
    agreements: number;
    sizingOnlyDiffs: number;
    disagreements: number;
  };
  entries: Array<{
    scenario: string;
    position: string;
    villainPosition: string | null;
    stackBb: number;
    boardKey: string | null;
    comboClass: string;
    legacyActions: string[];
    status: string;
    snapshotActions: string[] | null;
    reason: string | null;
  }>;
};

const POSITION_ORDER = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const positionRank = (position: string) => {
  const index = POSITION_ORDER.indexOf(position);
  return index === -1 ? POSITION_ORDER.length : index;
};

describe('legacy vs snapshot overlap analysis', () => {
  it('accounts for every legacy spot', () => {
    const { summary, entries } = overlap;
    expect(entries).toHaveLength(summary.legacySpots);
    expect(summary.matched + summary.unmatched).toBe(summary.legacySpots);
    expect(summary.agreements + summary.sizingOnlyDiffs + summary.disagreements + summary.unmatched).toBe(summary.legacySpots);
  });

  it('surfaces genuine disagreements without reconciling them', () => {
    const disagreements = overlap.entries.filter((entry) => entry.status === 'disagreement');
    expect(disagreements.length).toBe(overlap.summary.disagreements);
    for (const entry of disagreements) {
      expect(entry.snapshotActions).not.toBeNull();
      const legacy = [...entry.legacyActions].sort().join(',');
      const snapshot = [...(entry.snapshotActions ?? [])].sort().join(',');
      expect(legacy).not.toBe(snapshot);
    }
    for (const entry of overlap.entries.filter((e) => e.status === 'unmatched')) {
      expect(entry.snapshotActions).toBeNull();
      expect(entry.reason).toBeTruthy();
    }
  });

  it('is emitted in a deterministic, stable order', () => {
    const sorted = [...overlap.entries].sort((a, b) =>
      a.scenario.localeCompare(b.scenario) ||
      positionRank(a.position) - positionRank(b.position) ||
      a.stackBb - b.stackBb ||
      (a.villainPosition ?? '').localeCompare(b.villainPosition ?? '') ||
      (a.boardKey ?? '').localeCompare(b.boardKey ?? '') ||
      a.comboClass.localeCompare(b.comboClass));
    expect(overlap.entries).toEqual(sorted);
    expect(overlap.capturedAt).toBe('2026-07-18');
  });
});
