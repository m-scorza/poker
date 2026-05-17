import { describe, expect, it } from 'vitest';
import { formatImportSummary } from '../importSummary';
import type { ImportSummary } from '../workerProcessor';

const baseSummary: ImportSummary = {
  totalFiles: 2,
  parsedFiles: 2,
  failedFiles: 0,
  handsFound: 10,
  summariesFound: 1,
  confidence: 'high',
  warnings: [],
};

describe('formatImportSummary', () => {
  it('summarizes clean high-confidence imports', () => {
    expect(formatImportSummary(baseSummary)).toEqual({
      title: 'High confidence import',
      detail: '2/2 files parsed · 10 hands · 1 summary · 0 warnings',
      tone: 'success',
      warningPreview: [],
    });
  });

  it('surfaces medium-confidence partial imports with capped warning preview', () => {
    expect(formatImportSummary({
      ...baseSummary,
      parsedFiles: 1,
      failedFiles: 1,
      confidence: 'medium',
      warnings: ['notes.csv: Unsupported file', 'archive.zip/readme.md: Unsupported file'],
    })).toEqual({
      title: 'Medium confidence import',
      detail: '1/2 files parsed · 10 hands · 1 summary · 2 warnings',
      tone: 'warning',
      warningPreview: ['notes.csv: Unsupported file', 'archive.zip/readme.md: Unsupported file'],
    });
  });
});
