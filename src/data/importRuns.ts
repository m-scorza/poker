import type { ImportConfidence, ImportSummary } from '../parser/workerProcessor';
import {
  IMPORT_DIAGNOSTICS_EXPORT_RUNS,
  IMPORT_DIAGNOSTICS_RETENTION_RUNS,
  buildImportDiagnosticsSnapshot,
  sanitizeDiagnosticSourceFile,
  sanitizeDiagnosticText,
  type ImportDiagnosticsEnvironment,
  type ImportDiagnosticsSnapshot,
} from './importDiagnosticsPolicy';

export { saveImportRun, getRecentImportRuns } from './store';
export {
  IMPORT_DIAGNOSTICS_EXPORT_RUNS,
  IMPORT_DIAGNOSTICS_RETENTION_RUNS,
  MAX_DIAGNOSTIC_TEXT_LENGTH,
  buildImportDiagnosticsSnapshot,
  sanitizeDiagnosticSourceFile,
  sanitizeDiagnosticText,
} from './importDiagnosticsPolicy';
export type {
  ImportDiagnosticsEnvironment,
  ImportDiagnosticsSnapshot,
} from './importDiagnosticsPolicy';

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
  diagnostics: ImportDiagnosticsSnapshot;
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
  ledger: ImportConfidenceLedger;
}

export interface ImportRunTimelineRow {
  id: string;
  importedAt: Date;
  confidence: ImportConfidence;
  title: string;
  statusLabel: string;
  parsedFilesLabel: string;
  savedLabel: string;
  sourcePreview: string[];
  failedFilesLabel: string;
  warningPreview: string[];
}

export interface ImportDiagnosticsOptions {
  generatedAt?: Date;
  maxRuns?: number;
}

export interface ImportRunRecordOptions {
  environment?: ImportDiagnosticsEnvironment;
}

export type ImportWarningCategory =
  | 'unsupported_format'
  | 'parser_limit'
  | 'summary_gap'
  | 'parse_failure'
  | 'partial_import'
  | 'other';

export interface ImportWarningCategoryRow {
  category: ImportWarningCategory;
  label: string;
  count: number;
  examples: string[];
}

export interface ImportConfidenceLedger {
  analysisPosture: 'empty' | 'ready' | 'directional' | 'blocked';
  latestConfidence: ImportConfidence | null;
  latestImportedAt: Date | null;
  totalRuns: number;
  totalFiles: number;
  parsedFiles: number;
  failedFiles: number;
  savedHands: number;
  savedSummaries: number;
  parsedFileRate: number | null;
  confidenceCounts: Record<ImportConfidence, number>;
  warningCategories: ImportWarningCategoryRow[];
  reviewFocus: string;
}

const MAX_WARNING_COUNT = 5;
const MAX_WARNING_CATEGORY_EXAMPLES = 2;
const WARNING_CATEGORY_ORDER: ImportWarningCategory[] = [
  'unsupported_format',
  'parser_limit',
  'summary_gap',
  'parse_failure',
  'partial_import',
  'other',
];

const WARNING_CATEGORY_LABELS: Record<ImportWarningCategory, string> = {
  unsupported_format: 'Unsupported format',
  parser_limit: 'Size or safety limit',
  summary_gap: 'Summary recovery gap',
  parse_failure: 'Parser failure',
  partial_import: 'Partial import',
  other: 'Other parser warning',
};

function markdownListValue(value: string): string {
  return sanitizeDiagnosticText(value);
}

function emptyConfidenceCounts(): Record<ImportConfidence, number> {
  return {
    high: 0,
    medium: 0,
    low: 0,
  };
}

function sortImportRunsNewestFirst(runs: ImportRunRecord[]): ImportRunRecord[] {
  return [...runs].sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime());
}

function warningCategoryRank(category: ImportWarningCategory): number {
  return WARNING_CATEGORY_ORDER.indexOf(category);
}

function formatPercent(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

export function categorizeImportWarning(warning: string): ImportWarningCategory {
  const text = sanitizeDiagnosticText(warning).toLowerCase();

  if (
    text.includes('unsupported') ||
    text.includes('unrecognized') ||
    text.includes('native parsing is not available') ||
    text.includes('convert/export')
  ) {
    return 'unsupported_format';
  }

  if (
    text.includes('parser limit') ||
    text.includes('too large') ||
    text.includes('decompress') ||
    text.includes('zip entry size') ||
    text.includes('entry expanded')
  ) {
    return 'parser_limit';
  }

  if (
    text.includes('summary') ||
    text.includes('finish position') ||
    text.includes('buy-in') ||
    text.includes('fee')
  ) {
    return 'summary_gap';
  }

  if (
    text.includes('could not') ||
    text.includes('failed') ||
    text.includes('invalid') ||
    text.includes('parse') ||
    text.includes('no records were recovered')
  ) {
    return 'parse_failure';
  }

  if (
    text.includes('missing') ||
    text.includes('skipped') ||
    text.includes('partial') ||
    text.includes('warning')
  ) {
    return 'partial_import';
  }

  return 'other';
}

function buildWarningCategoryRows(runs: ImportRunRecord[]): ImportWarningCategoryRow[] {
  const rows = new Map<ImportWarningCategory, { count: number; examples: string[] }>();

  runs.forEach((run) => {
    run.warnings.forEach((warning) => {
      const sanitized = sanitizeDiagnosticText(warning);
      const category = categorizeImportWarning(sanitized);
      const row = rows.get(category) ?? { count: 0, examples: [] };
      row.count += 1;
      if (row.examples.length < MAX_WARNING_CATEGORY_EXAMPLES && !row.examples.includes(sanitized)) {
        row.examples.push(sanitized);
      }
      rows.set(category, row);
    });
  });

  return Array.from(rows.entries())
    .map(([category, row]) => ({
      category,
      label: WARNING_CATEGORY_LABELS[category],
      count: row.count,
      examples: row.examples,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return warningCategoryRank(a.category) - warningCategoryRank(b.category);
    });
}

export function buildImportConfidenceLedger(runs: ImportRunRecord[]): ImportConfidenceLedger {
  const sortedRuns = sortImportRunsNewestFirst(runs);
  const latest = sortedRuns[0] ?? null;
  const confidenceCounts = emptyConfidenceCounts();

  sortedRuns.forEach((run) => {
    confidenceCounts[run.confidence] += 1;
  });

  const totalFiles = sortedRuns.reduce((sum, run) => sum + run.totalFiles, 0);
  const parsedFiles = sortedRuns.reduce((sum, run) => sum + run.parsedFiles, 0);
  const failedFiles = sortedRuns.reduce((sum, run) => sum + run.failedFiles, 0);
  const savedHands = sortedRuns.reduce((sum, run) => sum + run.savedHands, 0);
  const savedSummaries = sortedRuns.reduce((sum, run) => sum + run.savedSummaries, 0);
  const parsedFileRate = totalFiles > 0 ? parsedFiles / totalFiles : null;

  const analysisPosture = latest === null
    ? 'empty'
    : latest.confidence === 'high'
      ? 'ready'
      : latest.confidence === 'medium'
        ? 'directional'
        : 'blocked';

  const reviewFocus = analysisPosture === 'empty'
    ? 'Import hand histories to establish a parser confidence baseline.'
    : analysisPosture === 'ready'
      ? 'Latest retained import is high confidence; downstream analysis can use the current local dataset normally.'
      : analysisPosture === 'directional'
        ? 'Latest import has warnings; treat analysis as directional and review the top warning categories.'
        : 'Latest import is low confidence; fix parser/import warnings before relying on downstream analysis.';

  return {
    analysisPosture,
    latestConfidence: latest?.confidence ?? null,
    latestImportedAt: latest?.importedAt ?? null,
    totalRuns: sortedRuns.length,
    totalFiles,
    parsedFiles,
    failedFiles,
    savedHands,
    savedSummaries,
    parsedFileRate,
    confidenceCounts,
    warningCategories: buildWarningCategoryRows(sortedRuns),
    reviewFocus,
  };
}

export function buildImportRunRecord(
  summary: ImportSummary,
  sourceFiles: string[],
  savedCounts: SavedImportCounts,
  importedAt = new Date(),
  options: ImportRunRecordOptions = {},
): ImportRunRecord {
  return {
    id: `import-${importedAt.toISOString()}`,
    importedAt,
    sourceFiles: sourceFiles.map(sanitizeDiagnosticSourceFile),
    totalFiles: summary.totalFiles,
    parsedFiles: summary.parsedFiles,
    failedFiles: summary.failedFiles,
    handsFound: summary.handsFound,
    summariesFound: summary.summariesFound,
    savedHands: savedCounts.savedHands,
    savedSummaries: savedCounts.savedSummaries,
    confidence: summary.confidence,
    warnings: summary.warnings.map(sanitizeDiagnosticText),
    diagnostics: buildImportDiagnosticsSnapshot(options.environment),
  };
}

export function summarizeDataHealth(runs: ImportRunRecord[]): DataHealthSummary {
  const ledger = buildImportConfidenceLedger(runs);

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
      ledger,
    };
  }

  const sortedRuns = sortImportRunsNewestFirst(runs);
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
    ledger,
  };
}

export function buildImportRunTimeline(runs: ImportRunRecord[]): ImportRunTimelineRow[] {
  const sorted = sortImportRunsNewestFirst(runs);
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

    const statusLabel = run.confidence === 'high'
      ? 'Import Complete'
      : run.confidence === 'medium'
        ? 'Imported with Warnings'
        : 'Needs Review';

    return {
      id: run.id,
      importedAt: run.importedAt,
      confidence: run.confidence,
      title,
      statusLabel,
      parsedFilesLabel,
      savedLabel,
      sourcePreview,
      failedFilesLabel,
      warningPreview,
    };
  });
}

export function buildImportDiagnosticsMarkdown(
  runs: ImportRunRecord[],
  options: ImportDiagnosticsOptions = {},
): string {
  const generatedAt = options.generatedAt ?? new Date();
  const maxRuns = options.maxRuns ?? IMPORT_DIAGNOSTICS_EXPORT_RUNS;
  const sortedRuns = sortImportRunsNewestFirst(runs)
    .slice(0, maxRuns);

  const lines = [
    '# Poker Import Diagnostics',
    '',
    `Generated: ${generatedAt.toISOString()}`,
    '',
    `Collection: automatic local-only diagnostics. The app keeps the latest ${IMPORT_DIAGNOSTICS_RETENTION_RUNS} import runs in browser storage.`,
    '',
    'Privacy note: this report contains sanitized source filenames, aggregate import counts, environment basics, and parser warnings only. It does not include raw hand histories, hole cards, board cards, actions, player-level hand data, or local paths. Review filenames before sharing outside your machine.',
    '',
  ];

  if (sortedRuns.length === 0) {
    lines.push('No import runs are recorded yet.');
    return `${lines.join('\n')}\n`;
  }

  const ledger = buildImportConfidenceLedger(sortedRuns);
  lines.push(
    '## Import Confidence Ledger',
    '',
    `- Analysis posture: ${ledger.analysisPosture}`,
    `- Latest confidence: ${ledger.latestConfidence ?? 'none'}`,
    `- Runs in report: ${ledger.totalRuns}`,
    `- Files parsed: ${ledger.parsedFiles}/${ledger.totalFiles} (${formatPercent(ledger.parsedFileRate)})`,
    `- Failed files: ${ledger.failedFiles}`,
    `- Saved records: ${ledger.savedHands} hands / ${ledger.savedSummaries} summaries`,
    `- Confidence mix: high ${ledger.confidenceCounts.high}, medium ${ledger.confidenceCounts.medium}, low ${ledger.confidenceCounts.low}`,
    `- Review focus: ${markdownListValue(ledger.reviewFocus)}`,
    '',
    'Warning categories:',
  );

  if (ledger.warningCategories.length === 0) {
    lines.push('- None');
  } else {
    ledger.warningCategories.forEach((row) => {
      const examples = row.examples.length > 0
        ? `; examples: ${row.examples.map(markdownListValue).join(' | ')}`
        : '';
      lines.push(`- ${row.label}: ${row.count}${examples}`);
    });
  }

  lines.push('');

  sortedRuns.forEach((run, index) => {
    lines.push(
      `## Import ${index + 1}: ${run.importedAt.toISOString()}`,
      '',
      `- Confidence: ${run.confidence}`,
      `- Files parsed: ${run.parsedFiles}/${run.totalFiles}`,
      `- Failed files: ${run.failedFiles}`,
      `- Hands found: ${run.handsFound}`,
      `- Tournament summaries found: ${run.summariesFound}`,
      `- Hands saved: ${run.savedHands}`,
      `- Tournament summaries saved: ${run.savedSummaries}`,
      '',
      'Source files:',
    );

    if (run.sourceFiles.length === 0) {
      lines.push('- None recorded');
    } else {
      run.sourceFiles.forEach((sourceFile) => lines.push(`- ${sanitizeDiagnosticSourceFile(sourceFile)}`));
    }

    lines.push('', 'Warnings:');
    if (run.warnings.length === 0) {
      lines.push('- None');
    } else {
      run.warnings.forEach((warning) => lines.push(`- ${markdownListValue(warning)}`));
    }

    const environment = run.diagnostics?.environment;
    if (environment) {
      lines.push('', 'Environment:');
      if (environment.appVersion) lines.push(`- App version: ${markdownListValue(environment.appVersion)}`);
      if (environment.browserFamily) lines.push(`- Browser: ${markdownListValue(environment.browserFamily)}`);
      if (environment.platform) lines.push(`- Platform: ${markdownListValue(environment.platform)}`);
      if (environment.language) lines.push(`- Language: ${markdownListValue(environment.language)}`);
    }

    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}
