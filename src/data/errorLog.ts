import {
  sanitizeDiagnosticText,
  sanitizeDiagnosticSourceFile,
  type ImportDiagnosticsEnvironment,
} from './importDiagnosticsPolicy';

export const ERROR_LOG_RETENTION_RECORDS = 25;
export const MAX_ERROR_STACK_FRAMES = 6;

const ERROR_LOG_EXPORT_RECORDS = 10;

/**
 * Where the failure surfaced. `render` comes from ErrorBoundary; async failures
 * never reach an ErrorBoundary at all, which is why `unhandled_rejection`
 * exists as a separate kind.
 */
type ErrorLogKind = 'render' | 'unhandled_rejection';

export interface ErrorLogRecord {
  id: string;
  occurredAt: Date;
  kind: ErrorLogKind;
  name: string;
  message: string;
  /** Sanitized frames: function name plus file basename and position, no origin. */
  stackFrames: string[];
  /** Route path only — never the query string, which can carry user input. */
  route: string;
  /** React component stack, render errors only. */
  componentStack: string[];
  environment?: ImportDiagnosticsEnvironment;
}

export interface ErrorLogInput {
  kind: ErrorLogKind;
  error: unknown;
  componentStack?: string | null;
  route?: string;
  environment?: ImportDiagnosticsEnvironment;
}

export interface ErrorLogMarkdownOptions {
  generatedAt?: Date;
  maxRecords?: number;
}

/**
 * A stack line carries an absolute URL or filesystem path. Keep the callable's
 * name and the file's basename with its line/column, drop everything that
 * identifies the machine.
 */
export function sanitizeStackFrame(frame: string): string {
  const collapsed = sanitizeDiagnosticText(frame).replace(/^at\s+/, '');
  if (collapsed === '(blank)') return collapsed;

  const located = collapsed.match(/^(.*?)\s*\((.+)\)$/);
  const callee = located ? located[1]!.trim() : '';
  const location = located ? located[2]!.trim() : collapsed;

  const positioned = location.match(/^(.*?)(:\d+:\d+|:\d+)$/);
  const rawPath = (positioned ? positioned[1]! : location).replace(/^[a-z]+:\/\/[^/]+/i, '');
  const position = positioned ? positioned[2]! : '';

  const file = sanitizeDiagnosticSourceFile(rawPath.replace(/\?.*$/, ''));
  const where = `${file}${position}`;

  return callee ? `${callee} (${where})` : where;
}

function toErrorParts(error: unknown): { name: string; message: string; stack: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack ?? '' };
  }
  if (typeof error === 'string') {
    return { name: 'Error', message: error, stack: '' };
  }
  return { name: 'Error', message: String(error), stack: '' };
}

function parseStackFrames(stack: string): string[] {
  return stack
    .split('\n')
    .slice(1)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, MAX_ERROR_STACK_FRAMES)
    .map(sanitizeStackFrame);
}

function parseComponentStack(componentStack: string | null | undefined): string[] {
  if (!componentStack) return [];
  return componentStack
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, MAX_ERROR_STACK_FRAMES)
    .map(line => sanitizeDiagnosticText(line.replace(/^at\s+/, '').replace(/\s*\(.*\)$/, '')));
}

/** Route path only — the query string can carry user input, so it is dropped. */
function sanitizeRoute(route: string | undefined): string {
  if (!route) return '(unknown)';
  const pathOnly = route.split(/[?#]/)[0] ?? '';
  const sanitized = sanitizeDiagnosticText(pathOnly);
  return sanitized === '(blank)' ? '(unknown)' : sanitized;
}

export function buildErrorLogRecord(input: ErrorLogInput, occurredAt = new Date()): ErrorLogRecord {
  const { name, message, stack } = toErrorParts(input.error);

  return {
    id: `error-${occurredAt.toISOString()}-${input.kind}`,
    occurredAt,
    kind: input.kind,
    name: sanitizeDiagnosticText(name),
    message: sanitizeDiagnosticText(message),
    stackFrames: parseStackFrames(stack),
    route: sanitizeRoute(input.route),
    componentStack: parseComponentStack(input.componentStack),
    environment: input.environment,
  };
}

const KIND_LABELS: Record<ErrorLogKind, string> = {
  render: 'Render error',
  unhandled_rejection: 'Unhandled promise rejection',
};

export function sortErrorLogNewestFirst(records: ErrorLogRecord[]): ErrorLogRecord[] {
  return [...records].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

export function buildErrorLogMarkdown(
  records: ErrorLogRecord[],
  options: ErrorLogMarkdownOptions = {},
): string {
  const generatedAt = options.generatedAt ?? new Date();
  const maxRecords = options.maxRecords ?? ERROR_LOG_EXPORT_RECORDS;
  const sorted = sortErrorLogNewestFirst(records).slice(0, maxRecords);

  const lines = [
    '# Poker Analyzer Error Report',
    '',
    `Generated: ${generatedAt.toISOString()}`,
    '',
    `Collection: automatic local-only error log. The app keeps the latest ${ERROR_LOG_RETENTION_RECORDS} errors in browser storage and uploads nothing.`,
    '',
    'Privacy note: this report contains error messages, sanitized stack frames (file basenames only), and the route where the error occurred. It does not include raw hand histories, hole cards, board cards, actions, player-level hand data, or local paths.',
    '',
  ];

  if (sorted.length === 0) {
    lines.push('No errors are recorded.');
    return `${lines.join('\n')}\n`;
  }

  sorted.forEach((record, index) => {
    lines.push(
      `## ${index + 1}. ${KIND_LABELS[record.kind]} — ${record.name}`,
      '',
      `- Time: ${record.occurredAt.toISOString()}`,
      `- Route: ${record.route}`,
      `- Message: ${record.message}`,
    );

    if (record.environment?.appVersion) {
      lines.push(`- App version: ${record.environment.appVersion}`);
    }
    if (record.environment?.browserFamily) {
      lines.push(`- Browser: ${record.environment.browserFamily}`);
    }

    if (record.stackFrames.length > 0) {
      lines.push('', 'Stack:');
      record.stackFrames.forEach(frame => lines.push(`- ${frame}`));
    }

    if (record.componentStack.length > 0) {
      lines.push('', 'Component stack:');
      record.componentStack.forEach(frame => lines.push(`- ${frame}`));
    }

    lines.push('');
  });

  return `${lines.join('\n')}\n`;
}
