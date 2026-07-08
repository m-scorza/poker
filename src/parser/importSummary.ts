import type { ImportSummary } from './workerProcessor';

type ImportSummaryTone = 'success' | 'warning' | 'danger';

export interface FormattedImportSummary {
  title: string;
  detail: string;
  tone: ImportSummaryTone;
  warningPreview: string[];
}

export function formatImportSummary(summary: ImportSummary): FormattedImportSummary {
  const title = `${capitalize(summary.confidence)} confidence import`;
  const tone: ImportSummaryTone = summary.confidence === 'high'
    ? 'success'
    : summary.confidence === 'medium'
      ? 'warning'
      : 'danger';
  const handsLabel = pluralize(summary.handsFound, 'hand');
  const summariesLabel = pluralize(summary.summariesFound, 'summary');
  const warningsLabel = pluralize(summary.warnings.length, 'warning');

  return {
    title,
    detail: `${summary.parsedFiles}/${summary.totalFiles} files parsed · ${handsLabel} · ${summariesLabel} · ${warningsLabel}`,
    tone,
    warningPreview: summary.warnings.slice(0, 3),
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
