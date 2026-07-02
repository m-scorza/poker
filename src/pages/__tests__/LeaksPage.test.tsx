import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildLeakDataHealthNotice } from '../LeaksPage';
import type { DataHealthSummary } from '../../data/importRuns';

const importedAt = new Date('2026-06-29T18:30:00.000Z');

function dataHealthSummary(overrides: Partial<DataHealthSummary> = {}): DataHealthSummary {
  const confidence = overrides.confidence ?? 'medium';
  const analysisPosture = confidence === 'low' ? 'blocked' : confidence === 'medium' ? 'directional' : 'ready';

  return {
    status: 'ready',
    confidence,
    lastImportedAt: importedAt,
    totalRuns: 2,
    recentFiles: 4,
    recentSavedHands: 42,
    recentSavedSummaries: 1,
    recentFailedFiles: 1,
    warnings: ['sample parser warning'],
    message: 'Latest import has warnings; analysis should be treated as directional.',
    ledger: {
      analysisPosture,
      latestConfidence: confidence,
      latestImportedAt: importedAt,
      totalRuns: 2,
      totalFiles: 4,
      parsedFiles: 3,
      failedFiles: 1,
      savedHands: 42,
      savedSummaries: 1,
      parsedFileRate: 0.75,
      confidenceCounts: { high: 1, medium: confidence === 'medium' ? 1 : 0, low: confidence === 'low' ? 1 : 0 },
      warningCategories: [
        { category: 'unsupported_format', label: 'Unsupported format', count: 2, examples: ['room.txt: unsupported'] },
        { category: 'summary_gap', label: 'Summary recovery gap', count: 1, examples: ['summary missing finish'] },
      ],
      reviewFocus: 'Latest import has warnings; review the top warning categories.',
    },
    ...overrides,
  };
}

describe('buildLeakDataHealthNotice', () => {
  it('turns medium-confidence import warnings into a directional Leaks triage notice', () => {
    const notice = buildLeakDataHealthNotice(dataHealthSummary());

    expect(notice).toMatchObject({
      tone: 'warning',
      kicker: 'Directional Analysis',
      title: 'Leak grading is directional until import warnings are reviewed',
      cta: '/hands?panel=data-health#data-health',
    });
    expect(notice!.message).toContain('unparsed files');
    expect(notice!.details).toContainEqual({ label: 'Analysis posture', value: 'Directional only' });
    expect(notice!.details).toContainEqual({ label: 'Files parsed', value: '3/4 (75%)' });
    expect(notice!.details).toContainEqual({ label: 'Top warning categories', value: 'Unsupported format 2 · Summary recovery gap 1' });
  });

  it('marks low-confidence import state as blocked before leak cards are trusted', () => {
    const notice = buildLeakDataHealthNotice(dataHealthSummary({ confidence: 'low' }));

    expect(notice).toMatchObject({
      tone: 'danger',
      kicker: 'Action Required',
      title: 'Leak grading is blocked by low-confidence import data',
    });
    expect(notice!.message).toContain('Fix Data Health');
    expect(notice!.details).toContainEqual({ label: 'Analysis posture', value: 'Blocked until Data Health review' });
  });

  it('stays silent for high-confidence or empty import health', () => {
    expect(buildLeakDataHealthNotice(dataHealthSummary({ confidence: 'high' }))).toBeNull();
    expect(buildLeakDataHealthNotice({
      ...dataHealthSummary(),
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
      ledger: {
        analysisPosture: 'empty',
        latestConfidence: null,
        latestImportedAt: null,
        totalRuns: 0,
        totalFiles: 0,
        parsedFiles: 0,
        failedFiles: 0,
        savedHands: 0,
        savedSummaries: 0,
        parsedFileRate: null,
        confidenceCounts: { high: 0, medium: 0, low: 0 },
        warningCategories: [],
        reviewFocus: 'Import hand histories to establish a parser confidence baseline.',
      },
    })).toBeNull();
  });
});
