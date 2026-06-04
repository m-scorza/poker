export const IMPORT_DIAGNOSTICS_SCHEMA_VERSION = 1;
export const IMPORT_DIAGNOSTICS_RETENTION_RUNS = 50;
export const IMPORT_DIAGNOSTICS_EXPORT_RUNS = 5;
export const MAX_DIAGNOSTIC_TEXT_LENGTH = 240;

export interface ImportDiagnosticsEnvironment {
  appVersion?: string;
  browserFamily?: string;
  language?: string;
  platform?: string;
}

export interface ImportDiagnosticsSnapshot {
  schemaVersion: typeof IMPORT_DIAGNOSTICS_SCHEMA_VERSION;
  collectedAutomatically: true;
  storage: 'local-only';
  sourceFilePolicy: 'basename-only';
  warningPolicy: 'single-line-truncated';
  excludes: string[];
  retentionRuns: typeof IMPORT_DIAGNOSTICS_RETENTION_RUNS;
  environment?: ImportDiagnosticsEnvironment;
}

const EXCLUDED_DIAGNOSTIC_FIELDS = [
  'raw hand histories',
  'hole cards',
  'board cards',
  'actions',
  'player-level hand data',
  'local paths',
];

function truncateDiagnosticText(value: string): string {
  if (value.length <= MAX_DIAGNOSTIC_TEXT_LENGTH) return value;
  return `${value.slice(0, MAX_DIAGNOSTIC_TEXT_LENGTH - 3)}...`;
}

export function sanitizeDiagnosticText(value: string): string {
  const withoutControlCharacters = Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : char;
    })
    .join('');

  const singleLine = withoutControlCharacters
    .replace(/\s+/g, ' ')
    .trim();

  return truncateDiagnosticText(singleLine.length > 0 ? singleLine : '(blank)');
}

export function sanitizeDiagnosticSourceFile(value: string): string {
  const singleLine = sanitizeDiagnosticText(value);
  if (singleLine === '(blank)') return singleLine;

  const parts = singleLine.split(/[\\/]+/).map(part => part.trim()).filter(Boolean);
  if (parts.length === 0) return '(blank)';
  if (parts.length === 1) return parts[0]!;

  const archiveIndex = parts.findIndex(part => part.toLowerCase().endsWith('.zip'));
  if (archiveIndex >= 0 && archiveIndex < parts.length - 1) {
    return `${parts[archiveIndex]}/${parts[parts.length - 1]}`;
  }

  return parts[parts.length - 1]!;
}

function cleanEnvironmentValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const sanitized = sanitizeDiagnosticText(value);
  return sanitized === '(blank)' ? undefined : sanitized;
}

export function sanitizeDiagnosticsEnvironment(
  environment: ImportDiagnosticsEnvironment | undefined,
): ImportDiagnosticsEnvironment | undefined {
  if (!environment) return undefined;

  const sanitized: ImportDiagnosticsEnvironment = {
    appVersion: cleanEnvironmentValue(environment.appVersion),
    browserFamily: cleanEnvironmentValue(environment.browserFamily),
    language: cleanEnvironmentValue(environment.language),
    platform: cleanEnvironmentValue(environment.platform),
  };

  return Object.values(sanitized).some(Boolean) ? sanitized : undefined;
}

export function buildImportDiagnosticsSnapshot(
  environment?: ImportDiagnosticsEnvironment,
): ImportDiagnosticsSnapshot {
  const sanitizedEnvironment = sanitizeDiagnosticsEnvironment(environment);
  const snapshot: ImportDiagnosticsSnapshot = {
    schemaVersion: IMPORT_DIAGNOSTICS_SCHEMA_VERSION,
    collectedAutomatically: true,
    storage: 'local-only',
    sourceFilePolicy: 'basename-only',
    warningPolicy: 'single-line-truncated',
    excludes: [...EXCLUDED_DIAGNOSTIC_FIELDS],
    retentionRuns: IMPORT_DIAGNOSTICS_RETENTION_RUNS,
  };

  if (sanitizedEnvironment) {
    snapshot.environment = sanitizedEnvironment;
  }

  return snapshot;
}
