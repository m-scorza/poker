import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportSummary } from '../../parser/workerProcessor';
import {
  IMPORT_DIAGNOSTICS_RETENTION_RUNS,
  MAX_DIAGNOSTIC_TEXT_LENGTH,
  buildImportDiagnosticsMarkdown,
  buildImportRunRecord,
  buildImportRunTimeline,
  sanitizeDiagnosticSourceFile,
  sanitizeDiagnosticText,
  summarizeDataHealth,
} from '../importRuns';

const baseSummary: ImportSummary = {
  totalFiles: 3,
  parsedFiles: 2,
  failedFiles: 1,
  handsFound: 120,
  summariesFound: 2,
  confidence: 'medium',
  warnings: ['bad.txt: unsupported file', 'summary.txt: missing finish position'],
};

async function loadIsolatedImportRunPersistence() {
  vi.resetModules();
  vi.doMock('../store', async () => {
    const DexieModule = await import('dexie');
    const fakeIndexedDb = await import('fake-indexeddb');
    const Dexie = DexieModule.default;
    Dexie.dependencies.indexedDB = fakeIndexedDb.indexedDB;
    Dexie.dependencies.IDBKeyRange = fakeIndexedDb.IDBKeyRange;

    const db = new Dexie(`PokerAnalyzerImportRunsTest-${crypto.randomUUID()}`) as any;
    db.version(1).stores({ importRuns: 'id, importedAt, confidence' });

    return {
      db,
      clearAllData: async () => {
        await db.importRuns.clear();
      },
      clearImportRuns: async () => {
        await db.importRuns.clear();
      },
      saveImportRun: async (record: any, retentionLimit = IMPORT_DIAGNOSTICS_RETENTION_RUNS) => {
        await db.importRuns.put(record);
        const excessKeys = await db.importRuns
          .orderBy('importedAt')
          .reverse()
          .offset(retentionLimit)
          .primaryKeys();
        if (excessKeys.length > 0) {
          await db.importRuns.bulkDelete(excessKeys);
        }
      },
      getRecentImportRuns: async (limit = 10) => {
        return db.importRuns.orderBy('importedAt').reverse().limit(limit).toArray();
      },
    };
  });

  const importRuns = await import('../importRuns');
  const store = await import('../store');
  await store.clearAllData();

  return { importRuns, store };
}

describe('diagnostic redaction helpers', () => {
  it('keeps source filenames to basenames and strips local or archive paths', () => {
    expect(sanitizeDiagnosticSourceFile('C:\\Users\\Hero\\Documents\\hands.txt')).toBe('hands.txt');
    expect(sanitizeDiagnosticSourceFile('upload.zip/folder/session-1.txt')).toBe('upload.zip/session-1.txt');
    expect(sanitizeDiagnosticSourceFile('\n')).toBe('(blank)');
  });

  it('keeps warning text single-line and capped', () => {
    const longWarning = `bad.txt: ${'x'.repeat(MAX_DIAGNOSTIC_TEXT_LENGTH + 40)}`;

    expect(sanitizeDiagnosticText('first line\nsecond\tline')).toBe('first line second line');
    expect(sanitizeDiagnosticText(longWarning)).toHaveLength(MAX_DIAGNOSTIC_TEXT_LENGTH);
    expect(sanitizeDiagnosticText(longWarning)).toMatch(/\.\.\.$/);
  });
});

describe('buildImportRunRecord', () => {
  it('preserves import summary, sanitized source filenames, saved counts, warnings, diagnostics, and timestamp', () => {
    const importedAt = new Date('2026-05-17T20:00:00Z');

    const record = buildImportRunRecord(
      { ...baseSummary, warnings: ['bad.txt: unsupported file\nsecond line'] },
      ['hands-1.txt', 'folder/hands-2.txt', 'archive.zip/private/bad.txt'],
      { savedHands: 118, savedSummaries: 2 },
      importedAt,
      {
        environment: {
          appVersion: 'test-build',
          browserFamily: 'Chrome',
          language: 'en-US',
          platform: 'Win32',
        },
      },
    );

    expect(record.id).toBe('import-2026-05-17T20:00:00.000Z');
    expect(record.importedAt).toEqual(importedAt);
    expect(record.sourceFiles).toEqual(['hands-1.txt', 'hands-2.txt', 'archive.zip/bad.txt']);
    expect(record.totalFiles).toBe(3);
    expect(record.parsedFiles).toBe(2);
    expect(record.failedFiles).toBe(1);
    expect(record.handsFound).toBe(120);
    expect(record.summariesFound).toBe(2);
    expect(record.savedHands).toBe(118);
    expect(record.savedSummaries).toBe(2);
    expect(record.confidence).toBe('medium');
    expect(record.warnings).toEqual(['bad.txt: unsupported file second line']);
    expect(record.diagnostics).toMatchObject({
      schemaVersion: 1,
      collectedAutomatically: true,
      storage: 'local-only',
      sourceFilePolicy: 'basename-only',
      warningPolicy: 'single-line-truncated',
      retentionRuns: IMPORT_DIAGNOSTICS_RETENTION_RUNS,
      environment: {
        appVersion: 'test-build',
        browserFamily: 'Chrome',
        language: 'en-US',
        platform: 'Win32',
      },
    });
    expect(record.diagnostics.excludes).toContain('raw hand histories');
    expect(record.diagnostics.excludes).toContain('local paths');
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

describe('buildImportRunTimeline', () => {
  it('returns recent runs newest-first with formatted labels and capped previews', () => {
    const olderHigh = buildImportRunRecord(
      { ...baseSummary, totalFiles: 1, parsedFiles: 1, failedFiles: 0, confidence: 'high', warnings: [] },
      ['older.txt'],
      { savedHands: 50, savedSummaries: 1 },
      new Date('2026-05-16T20:00:00Z'),
    );
    const latestMedium = buildImportRunRecord(
      baseSummary,
      ['latest-1.txt', 'latest-2.txt', 'latest-3.txt', 'latest-4.txt'],
      { savedHands: 118, savedSummaries: 2 },
      new Date('2026-05-17T20:00:00Z'),
    );

    const timeline = buildImportRunTimeline([olderHigh, latestMedium]);

    expect(timeline.map(row => row.id)).toEqual([latestMedium.id, olderHigh.id]);
    expect(timeline[0]).toEqual({
      id: latestMedium.id,
      importedAt: new Date('2026-05-17T20:00:00Z'),
      confidence: 'medium',
      title: '2026-05-17 20:00 UTC · medium confidence',
      statusLabel: 'Imported with Warnings',
      parsedFilesLabel: '2/3 files parsed',
      savedLabel: '118 hands / 2 summaries saved',
      sourcePreview: ['latest-1.txt', 'latest-2.txt', 'latest-3.txt', '+1 more'],
      failedFilesLabel: '1 failed file',
      warningPreview: ['bad.txt: unsupported file', 'summary.txt: missing finish position'],
    });
    expect(timeline[1]!.failedFilesLabel).toBe('No failed files');
    expect(timeline[1]!.warningPreview).toEqual([]);
    expect(timeline[1]!.statusLabel).toBe('Import Complete');
  });

  it('caps warning previews and source previews for dense imports', () => {
    const dense = buildImportRunRecord(
      {
        ...baseSummary,
        warnings: ['w1', 'w2', 'w3', 'w4'],
      },
      ['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt'],
      { savedHands: 1, savedSummaries: 0 },
      new Date('2026-05-17T22:30:00Z'),
    );

    expect(buildImportRunTimeline([dense])).toMatchObject([
      {
        sourcePreview: ['a.txt', 'b.txt', 'c.txt', '+2 more'],
        warningPreview: ['w1', 'w2', '+2 more warnings'],
      },
    ]);
  });
});

describe('buildImportDiagnosticsMarkdown', () => {
  it('exports recent import runs newest-first with counts, sources, warnings, and privacy note', () => {
    const olderHigh = buildImportRunRecord(
      { ...baseSummary, totalFiles: 1, parsedFiles: 1, failedFiles: 0, confidence: 'high', warnings: [] },
      ['older.txt'],
      { savedHands: 40, savedSummaries: 1 },
      new Date('2026-05-16T10:00:00Z'),
    );
    const latestMedium = buildImportRunRecord(
      baseSummary,
      ['hands-1.txt', 'bad.txt'],
      { savedHands: 118, savedSummaries: 2 },
      new Date('2026-05-17T20:00:00Z'),
      {
        environment: {
          appVersion: 'test-build',
          browserFamily: 'Chrome',
          platform: 'Win32',
          language: 'en-US',
        },
      },
    );

    const report = buildImportDiagnosticsMarkdown([olderHigh, latestMedium], {
      generatedAt: new Date('2026-05-18T12:00:00Z'),
    });

    expect(report).toContain('# Poker Import Diagnostics');
    expect(report).toContain('Generated: 2026-05-18T12:00:00.000Z');
    expect(report).toContain('Collection: automatic local-only diagnostics.');
    expect(report).toContain('It does not include raw hand histories');
    expect(report).toContain('local paths');
    expect(report.indexOf('## Import 1: 2026-05-17T20:00:00.000Z')).toBeLessThan(
      report.indexOf('## Import 2: 2026-05-16T10:00:00.000Z'),
    );
    expect(report).toContain('- Confidence: medium');
    expect(report).toContain('- Files parsed: 2/3');
    expect(report).toContain('- Failed files: 1');
    expect(report).toContain('- hands-1.txt');
    expect(report).toContain('- bad.txt');
    expect(report).toContain('- bad.txt: unsupported file');
    expect(report).toContain('- None');
    expect(report).toContain('- App version: test-build');
    expect(report).toContain('- Browser: Chrome');
    expect(report).toContain('- Platform: Win32');
    expect(report).toContain('- Language: en-US');
  });

  it('handles empty import history', () => {
    const report = buildImportDiagnosticsMarkdown([], {
      generatedAt: new Date('2026-05-18T12:00:00Z'),
    });

    expect(report).toContain('No import runs are recorded yet.');
  });

  it('limits exported runs when requested', () => {
    const runs = [1, 2, 3].map((day) =>
      buildImportRunRecord(
        baseSummary,
        [`run-${day}.txt`],
        { savedHands: day, savedSummaries: 0 },
        new Date(`2026-05-${10 + day}T00:00:00Z`),
      ),
    );

    const report = buildImportDiagnosticsMarkdown(runs, {
      generatedAt: new Date('2026-05-18T12:00:00Z'),
      maxRuns: 2,
    });

    expect(report).toContain('run-3.txt');
    expect(report).toContain('run-2.txt');
    expect(report).not.toContain('run-1.txt');
  });

  it('keeps exported source and warning rows on one markdown list line', () => {
    const run = buildImportRunRecord(
      { ...baseSummary, warnings: ['bad.txt: first line\nsecond line'] },
      ['folder\nhands.txt'],
      { savedHands: 0, savedSummaries: 0 },
      new Date('2026-05-17T20:00:00Z'),
    );

    const report = buildImportDiagnosticsMarkdown([run], {
      generatedAt: new Date('2026-05-18T12:00:00Z'),
    });

    expect(report).toContain('- folder hands.txt');
    expect(report).toContain('- bad.txt: first line second line');
  });
});

describe('import run persistence', () => {
  beforeEach(() => {
    vi.doUnmock('../store');
  });

  it('saves import runs and reads them newest-first with a limit', async () => {
    const { importRuns, store } = await loadIsolatedImportRunPersistence();
    const oldest = importRuns.buildImportRunRecord(
      { ...baseSummary, confidence: 'high', warnings: [] },
      ['oldest.txt'],
      { savedHands: 10, savedSummaries: 1 },
      new Date('2026-05-15T20:00:00Z'),
    );
    const middle = importRuns.buildImportRunRecord(
      { ...baseSummary, confidence: 'medium' },
      ['middle.txt'],
      { savedHands: 20, savedSummaries: 1 },
      new Date('2026-05-16T20:00:00Z'),
    );
    const newest = importRuns.buildImportRunRecord(
      { ...baseSummary, confidence: 'low' },
      ['newest.txt'],
      { savedHands: 30, savedSummaries: 1 },
      new Date('2026-05-17T20:00:00Z'),
    );

    await store.saveImportRun(oldest);
    await store.saveImportRun(newest);
    await store.saveImportRun(middle);

    const runs = await store.getRecentImportRuns(2);

    expect(runs.map((run) => run.id)).toEqual([newest.id, middle.id]);
  });

  it('prunes old import diagnostics after the retention cap', async () => {
    const { importRuns, store } = await loadIsolatedImportRunPersistence();
    for (let i = 0; i < IMPORT_DIAGNOSTICS_RETENTION_RUNS + 2; i++) {
      await store.saveImportRun(importRuns.buildImportRunRecord(
        baseSummary,
        [`run-${i}.txt`],
        { savedHands: i, savedSummaries: 0 },
        new Date(Date.UTC(2026, 4, 17, 20, i, 0)),
      ));
    }

    const runs = await store.getRecentImportRuns(IMPORT_DIAGNOSTICS_RETENTION_RUNS + 10);

    expect(runs).toHaveLength(IMPORT_DIAGNOSTICS_RETENTION_RUNS);
    expect(runs[0]!.sourceFiles).toEqual([`run-${IMPORT_DIAGNOSTICS_RETENTION_RUNS + 1}.txt`]);
    expect(runs[runs.length - 1]!.sourceFiles).toEqual(['run-2.txt']);
  });

  it('clears only import diagnostics when requested', async () => {
    const { importRuns, store } = await loadIsolatedImportRunPersistence();
    const run = importRuns.buildImportRunRecord(
      baseSummary,
      ['hands.txt'],
      { savedHands: 118, savedSummaries: 2 },
      new Date('2026-05-17T20:00:00Z'),
    );

    await store.saveImportRun(run);
    await store.clearImportRuns();

    await expect(store.getRecentImportRuns()).resolves.toEqual([]);
  });

  it('clears import runs during full local data reset', async () => {
    const { importRuns, store } = await loadIsolatedImportRunPersistence();
    const run = importRuns.buildImportRunRecord(
      baseSummary,
      ['hands.txt'],
      { savedHands: 118, savedSummaries: 2 },
      new Date('2026-05-17T20:00:00Z'),
    );

    await store.saveImportRun(run);
    await store.clearAllData();

    await expect(store.getRecentImportRuns()).resolves.toEqual([]);
  });
});
