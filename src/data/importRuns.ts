import type { ImportConfidence, ImportSummary } from '../parser/workerProcessor';
import { db } from './store';

export interface SavedImportCounts {
  savedHands: number;
  savedSummaries: number;
}

export interface ImportRunRecord {
  id: string;
  importedAt: Date;
  sourceFiles: string[];
  totalFiles: number;
  parsedFiles: number;
  failedFiles: number;
  handsFound: number;
  summariesFound: number;
  savedHands: number;
  savedSummaries: number;
  confidence: ImportConfidence;
  warnings: string[];
}

export interface DataHealthSummary {
  status: 'empty' | 'ready';
  confidence: ImportConfidence | null;
  lastImportedAt: Date | null;
  totalRuns: number;
  recentFiles: number;
  recentSavedHands: number;
  recentSavedSummaries: number;
  recentFailedFiles: number;
  warnings: string[];
  message: string;
}

export interface ImportRunTimelineRow {
  id: string;
  importedAt: Date;
  confidence: ImportConfidence;
  title: string;
  parsedFilesLabel: string;
  savedLabel: string;
  sourcePreview: string[];
  failedFilesLabel: string;
  warningPreview: string[];
}

const MAX_WARNING_COUNT = 5;

export function buildImportRunRecord(
  summary: ImportSummary,
  sourceFiles: string[],
  savedCounts: SavedImportCounts,
  importedAt = new Date(),
): ImportRunRecord {
  return {
    id: `import-${importedAt.toISOString()}`,
    importedAt,
    sourceFiles: [...sourceFiles],
    totalFiles: summary.totalFiles,
    parsedFiles: summary.parsedFiles,
    failedFiles: summary.failedFiles,
    handsFound: summary.handsFound,
    summariesFound: summary.summariesFound,
    savedHands: savedCounts.savedHands,
    savedSummaries: savedCounts.savedSummaries,
    confidence: summary.confidence,
    warnings: [...summary.warnings],
  };
}

export function summarizeDataHealth(runs: ImportRunRecord[]): DataHealthSummary {
  if (runs.length === 0) {
    return {
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
    };
  }

  const sortedRuns = [...runs].sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime());
  const latest = sortedRuns[0]!;
  const warnings = sortedRuns.flatMap((run) => run.warnings).slice(0, MAX_WARNING_COUNT);

  const message = latest.confidence === 'high'
    ? 'Latest import is high confidence.'
    : latest.confidence === 'medium'
      ? 'Latest import has warnings; analysis should be treated as directional.'
      : 'Latest import is low confidence; fix import warnings before trusting analysis.';

  return {
    status: 'ready',
    confidence: latest.confidence,
    lastImportedAt: latest.importedAt,
    totalRuns: sortedRuns.length,
    recentFiles: sortedRuns.reduce((sum, run) => sum + run.totalFiles, 0),
    recentSavedHands: sortedRuns.reduce((sum, run) => sum + run.savedHands, 0),
    recentSavedSummaries: sortedRuns.reduce((sum, run) => sum + run.savedSummaries, 0),
    recentFailedFiles: sortedRuns.reduce((sum, run) => sum + run.failedFiles, 0),
    warnings,
    message,
  };
}

export async function saveImportRun(record: ImportRunRecord): Promise<void> {
  await db.importRuns.put(record);
}

export async function getRecentImportRuns(limit = 10): Promise<ImportRunRecord[]> {
  return db.importRuns.orderBy('importedAt').reverse().limit(limit).toArray();
}

export function buildImportRunTimeline(runs: ImportRunRecord[]): ImportRunTimelineRow[] {
  const sorted = [...runs].sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime());
  return sorted.map((run) => {
    const y = run.importedAt.getUTCFullYear();
    const m = String(run.importedAt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(run.importedAt.getUTCDate()).padStart(2, '0');
    const hh = String(run.importedAt.getUTCHours()).padStart(2, '0');
    const mm = String(run.importedAt.getUTCMinutes()).padStart(2, '0');
    const title = `${y}-${m}-${d} ${hh}:${mm} UTC · ${run.confidence} confidence`;

    const parsedFilesLabel = `${run.parsedFiles}/${run.totalFiles} files parsed`;
    const savedLabel = `${run.savedHands} hands / ${run.savedSummaries} summaries saved`;

    const failedFilesLabel = run.failedFiles === 0
      ? 'No failed files'
      : run.failedFiles === 1
        ? '1 failed file'
        : `${run.failedFiles} failed files`;

    const sourcePreview = run.sourceFiles.length > 3
      ? [...run.sourceFiles.slice(0, 3), `+${run.sourceFiles.length - 3} more`]
      : [...run.sourceFiles];

    const warningPreview = run.warnings.length > 2
      ? [...run.warnings.slice(0, 2), `+${run.warnings.length - 2} more warnings`]
      : [...run.warnings];

    return {
      id: run.id,
      importedAt: run.importedAt,
      confidence: run.confidence,
      title,
      parsedFilesLabel,
      savedLabel,
      sourcePreview,
      failedFilesLabel,
      warningPreview,
    };
  });
}
