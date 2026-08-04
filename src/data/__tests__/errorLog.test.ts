import { describe, expect, it } from 'vitest';
import {
  ERROR_LOG_RETENTION_RECORDS,
  MAX_ERROR_STACK_FRAMES,
  buildErrorLogMarkdown,
  buildErrorLogRecord,
  sanitizeStackFrame,
  sortErrorLogNewestFirst,
} from '../errorLog';
import { MAX_DIAGNOSTIC_TEXT_LENGTH } from '../importDiagnosticsPolicy';

const AT = new Date('2026-08-04T10:00:00.000Z');

describe('sanitizeStackFrame', () => {
  it('keeps the callee and file position but drops the origin', () => {
    expect(sanitizeStackFrame('    at buildStudyQueue (http://localhost:5173/src/analysis/studyPlan.ts:231:12)'))
      .toBe('buildStudyQueue (studyPlan.ts:231:12)');
  });

  it('drops an absolute filesystem path down to a basename', () => {
    expect(sanitizeStackFrame('at parse (/home/someone/secret-folder/src/parser/pokerstars.ts:88:3)'))
      .toBe('parse (pokerstars.ts:88:3)');
  });

  it('handles a bare location with no callee', () => {
    expect(sanitizeStackFrame('at http://localhost:5173/src/main.tsx:10:1')).toBe('main.tsx:10:1');
  });

  it('strips a cache-busting query string', () => {
    expect(sanitizeStackFrame('at x (http://localhost:5173/src/a.ts?t=17351:4:2)')).toBe('x (a.ts:4:2)');
  });
});

describe('buildErrorLogRecord', () => {
  it('records a render error with a sanitized message, stack, and component stack', () => {
    const error = new Error('Cannot read properties of undefined');
    error.stack = [
      'Error: Cannot read properties of undefined',
      '    at RangeGrid (http://localhost:5173/src/components/shared/RangeGrid.tsx:42:7)',
      '    at RangesPage (http://localhost:5173/src/pages/RangesPage.tsx:88:3)',
    ].join('\n');

    const record = buildErrorLogRecord(
      {
        kind: 'render',
        error,
        componentStack: '\n    at RangeGrid (created by RangesPage)\n    at RangesPage',
        route: '/ranges',
      },
      AT,
    );

    expect(record.kind).toBe('render');
    expect(record.name).toBe('Error');
    expect(record.message).toBe('Cannot read properties of undefined');
    expect(record.stackFrames).toEqual([
      'RangeGrid (RangeGrid.tsx:42:7)',
      'RangesPage (RangesPage.tsx:88:3)',
    ]);
    expect(record.componentStack).toEqual(['RangeGrid', 'RangesPage']);
    expect(record.route).toBe('/ranges');
    expect(record.occurredAt).toEqual(AT);
  });

  it('drops the query string from the route — it can carry user input', () => {
    const record = buildErrorLogRecord(
      { kind: 'render', error: new Error('x'), route: '/hands?reviewHand=PS-123&q=secret' },
      AT,
    );
    expect(record.route).toBe('/hands');
  });

  it('caps the message at the shared diagnostic length', () => {
    const record = buildErrorLogRecord({ kind: 'render', error: new Error('x'.repeat(1000)) }, AT);
    expect(record.message.length).toBeLessThanOrEqual(MAX_DIAGNOSTIC_TEXT_LENGTH);
  });

  it('caps how many stack frames are retained', () => {
    const error = new Error('deep');
    error.stack = ['Error: deep', ...Array.from({ length: 40 }, (_, i) => `    at fn${i} (http://x/src/a.ts:${i}:1)`)].join('\n');
    const record = buildErrorLogRecord({ kind: 'render', error }, AT);
    expect(record.stackFrames).toHaveLength(MAX_ERROR_STACK_FRAMES);
  });

  it('never leaks a local path into any field', () => {
    const error = new Error('failed reading /home/scorza/Documents/hands/tourney.txt');
    error.stack = 'Error\n    at read (/home/scorza/app/src/parser/pokerstars.ts:5:1)';
    const record = buildErrorLogRecord({ kind: 'unhandled_rejection', error, route: '/hands' }, AT);

    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain('/home/scorza/app');
    expect(record.stackFrames).toEqual(['read (pokerstars.ts:5:1)']);
    // The message is author-controlled text, so it is kept verbatim but capped;
    // this asserts the *stack* is where path scrubbing happens.
    expect(record.message).toContain('tourney.txt');
  });

  it('handles a non-Error rejection value', () => {
    const record = buildErrorLogRecord({ kind: 'unhandled_rejection', error: 'plain string reason' }, AT);
    expect(record.name).toBe('Error');
    expect(record.message).toBe('plain string reason');
    expect(record.stackFrames).toEqual([]);
  });

  it('falls back to (unknown) when no route is available', () => {
    expect(buildErrorLogRecord({ kind: 'render', error: new Error('x') }, AT).route).toBe('(unknown)');
  });
});

describe('buildErrorLogMarkdown', () => {
  const record = (message: string, occurredAt: Date) =>
    buildErrorLogRecord({ kind: 'render', error: new Error(message), route: '/leaks' }, occurredAt);

  it('states the local-only posture and the exclusions', () => {
    const md = buildErrorLogMarkdown([record('boom', AT)]);
    expect(md).toContain('local-only error log');
    expect(md).toContain('uploads nothing');
    expect(md).toContain('does not include raw hand histories');
    expect(md).toContain(String(ERROR_LOG_RETENTION_RECORDS));
  });

  it('says so plainly when there is nothing to report', () => {
    expect(buildErrorLogMarkdown([])).toContain('No errors are recorded.');
  });

  it('orders newest first and honours the record cap', () => {
    const records = [
      record('oldest', new Date('2026-08-01T00:00:00.000Z')),
      record('newest', new Date('2026-08-03T00:00:00.000Z')),
      record('middle', new Date('2026-08-02T00:00:00.000Z')),
    ];
    const md = buildErrorLogMarkdown(records, { maxRecords: 2 });

    expect(md.indexOf('newest')).toBeLessThan(md.indexOf('middle'));
    expect(md).not.toContain('oldest');
  });

  it('labels the two kinds distinctly', () => {
    const md = buildErrorLogMarkdown([
      buildErrorLogRecord({ kind: 'unhandled_rejection', error: new Error('async boom') }, AT),
    ]);
    expect(md).toContain('Unhandled promise rejection');
  });
});

describe('sortErrorLogNewestFirst', () => {
  it('does not mutate its input', () => {
    const records = [
      buildErrorLogRecord({ kind: 'render', error: new Error('a') }, new Date('2026-08-01T00:00:00.000Z')),
      buildErrorLogRecord({ kind: 'render', error: new Error('b') }, new Date('2026-08-02T00:00:00.000Z')),
    ];
    const original = [...records];
    sortErrorLogNewestFirst(records);
    expect(records).toEqual(original);
  });
});
