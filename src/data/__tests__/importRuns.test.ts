import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ImportSummary } from '../../parser/workerProcessor';
import {
  buildImportRunRecord,
  summarizeDataHealth,
  saveImportRun,
  getRecentImportRuns,
} from '../importRuns';
import { clearAllData } from '../store';

const baseSummary: ImportSummary = {
  totalFiles: 3,
  parsedFiles: 2,
  failedFiles: 1,
  handsFound: 120,
  summariesFound: 2,
  confidence: 'medium',
  warnings: ['bad.txt: unsupported file', 'summary.txt: missing finish position'],
};

describe('buildImportRunRecord', () => {
  it('preserves import summary, source filenames, saved counts, warnings, and timestamp', () => {
    const importedAt = new Date('2026-05-17T20:00:00Z');

    const record = buildImportRunRecord(
      baseSummary,
      ['hands-1.txt', 'hands-2.txt', 'bad.txt'],
      { savedHands: 118, savedSummaries: 2 },
      importedAt,
    );

    expect(record.id).toBe('import-2026-05-17T20:00:00.000Z');
    expect(record.importedAt).toEqual(importedAt);
    expect(record.sourceFiles).toEqual(['hands-1.txt', 'hands-2.txt', 'bad.txt']);
    expect(record.totalFiles).toBe(3);
    expect(record.parsedFiles).toBe(2);
    expect(record.failedFiles).toBe(1);
    expect(record.handsFound).toBe(120);
    expect(record.summariesFound).toBe(2);
    expect(record.savedHands).toBe(118);
    expect(record.savedSummaries).toBe(2);
    expect(record.confidence).toBe('medium');
    expect(record.warnings).toEqual(baseSummary.warnings);
  });
});

describe('summarizeDataHealth', () => {
  it('returns neutral empty state before any import run is recorded', () => {
    expect(summarizeDataHealth([])).toEqual({
      status: 'empty',
      confidence: null,
      lastImportedAt: null,
      totalRuns: 0,
      recentFiles: 0,
      recentSavedHands: 0,
      recentSavedSummaries: 0,
      recentFailedFiles: 0,
      warnings: [],
      message: 'No import history recorded yet.',
    });
  });

  it('uses the newest run for current confidence and aggregates recent counts', () => {
    const olderHigh = buildImportRunRecord(
      { ...baseSummary, totalFiles: 1, parsedFiles: 1, failedFiles: 0, confidence: 'high', warnings: [] },
      ['older.txt'],
      { savedHands: 50, savedSummaries: 1 },
      new Date('2026-05-16T20:00:00Z'),
    );
    const latestMedium = buildImportRunRecord(
      baseSummary,
      ['latest-1.txt', 'latest-2.txt', 'bad.txt'],
      { savedHands: 118, savedSummaries: 2 },
      new Date('2026-05-17T20:00:00Z'),
    );

    const summary = summarizeDataHealth([olderHigh, latestMedium]);

    expect(summary.status).toBe('ready');
    expect(summary.confidence).toBe('medium');
    expect(summary.lastImportedAt).toEqual(new Date('2026-05-17T20:00:00Z'));
    expect(summary.totalRuns).toBe(2);
    expect(summary.recentFiles).toBe(4);
    expect(summary.recentSavedHands).toBe(168);
    expect(summary.recentSavedSummaries).toBe(3);
    expect(summary.recentFailedFiles).toBe(1);
    expect(summary.warnings).toEqual(baseSummary.warnings);
    expect(summary.message).toBe('Latest import has warnings; analysis should be treated as directional.');
  });

  it('keeps low-confidence latest imports low even with saved hands', () => {
    const low = buildImportRunRecord(
      { ...baseSummary, confidence: 'low', parsedFiles: 0, failedFiles: 3, warnings: ['all files failed'] },
      ['a.txt', 'b.txt', 'c.txt'],
      { savedHands: 0, savedSummaries: 0 },
      new Date('2026-05-17T21:00:00Z'),
    );

    const summary = summarizeDataHealth([low]);

    expect(summary.status).toBe('ready');
    expect(summary.confidence).toBe('low');
    expect(summary.recentFailedFiles).toBe(3);
    expect(summary.warnings).toEqual(['all files failed']);
    expect(summary.message).toBe('Latest import is low confidence; fix import warnings before trusting analysis.');
  });
});

describe('import run persistence', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('saves import runs and reads them newest-first with a limit', async () => {
    const oldest = buildImportRunRecord(
      { ...baseSummary, confidence: 'high', warnings: [] },
      ['oldest.txt'],
      { savedHands: 10, savedSummaries: 1 },
      new Date('2026-05-15T20:00:00Z'),
    );
    const middle = buildImportRunRecord(
      { ...baseSummary, confidence: 'medium' },
      ['middle.txt'],
      { savedHands: 20, savedSummaries: 1 },
      new Date('2026-05-16T20:00:00Z'),
    );
    const newest = buildImportRunRecord(
      { ...baseSummary, confidence: 'low' },
      ['newest.txt'],
      { savedHands: 30, savedSummaries: 1 },
      new Date('2026-05-17T20:00:00Z'),
    );

    await saveImportRun(oldest);
    await saveImportRun(newest);
    await saveImportRun(middle);

    const runs = await getRecentImportRuns(2);

    expect(runs.map((run) => run.id)).toEqual([newest.id, middle.id]);
  });

  it('clears import runs during full local data reset', async () => {
    const run = buildImportRunRecord(
      baseSummary,
      ['hands.txt'],
      { savedHands: 118, savedSummaries: 2 },
      new Date('2026-05-17T20:00:00Z'),
    );

    await saveImportRun(run);
    await clearAllData();

    await expect(getRecentImportRuns()).resolves.toEqual([]);
  });
});
