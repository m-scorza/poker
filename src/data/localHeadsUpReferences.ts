import {
  parseHeadsUpFrequencyCsv,
  type HeadsUpFrequencyTable,
  type HeadsUpReferenceKind,
  type HeadsUpReferenceSet,
} from '../analysis/headsUpPushFoldReference';
import { safeGet, safeRemove, safeSet } from './localStorage';

const LOCAL_HU_REFERENCE_KEY = 'poker:local-hu-push-fold-reference:v1';
const CURRENT_VERSION = 1;

interface StoredLocalHeadsUpReferenceTable {
  kind: HeadsUpReferenceKind;
  fileName: string;
  csv: string;
  importedAt: string;
}

interface StoredLocalHeadsUpReferenceEnvelope {
  version: 1;
  push?: StoredLocalHeadsUpReferenceTable;
  call?: StoredLocalHeadsUpReferenceTable;
}

interface LocalHeadsUpReferenceTableSummary {
  fileName: string;
  hands: number;
  rows: number;
  minStackBb: number;
  maxStackBb: number;
}

export type LocalHeadsUpReferenceSummary = Partial<Record<HeadsUpReferenceKind, LocalHeadsUpReferenceTableSummary>>;

export type SaveLocalHeadsUpReferenceResult =
  | { ok: true }
  | { ok: false; message: string; reason: 'invalid_csv' | 'quota' | 'unknown' };

export function saveLocalHeadsUpReferenceCsv(
  kind: HeadsUpReferenceKind,
  csv: string,
  fileName: string,
  importedAt = new Date(),
): SaveLocalHeadsUpReferenceResult {
  try {
    parseHeadsUpFrequencyCsv(csv, kind);
  } catch (error) {
    return {
      ok: false,
      reason: 'invalid_csv',
      message: error instanceof Error ? error.message : 'Could not parse local heads-up reference CSV.',
    };
  }

  const current = loadStoredEnvelope();
  const next: StoredLocalHeadsUpReferenceEnvelope = {
    ...current,
    version: CURRENT_VERSION,
    [kind]: {
      kind,
      fileName: fileName.trim() || `${kind}-reference.csv`,
      csv,
      importedAt: importedAt.toISOString(),
    },
  };

  const saved = safeSet(LOCAL_HU_REFERENCE_KEY, next);
  if (saved.ok) return { ok: true };

  const failedSave = saved as { ok: false; reason: 'quota' | 'unknown' };
  return {
    ok: false,
    reason: failedSave.reason,
    message: failedSave.reason === 'quota'
      ? 'Browser storage is full; remove old local data before saving this reference table.'
      : 'Could not save this local reference table in browser storage.',
  };
}

export function loadLocalHeadsUpReferenceSet(): HeadsUpReferenceSet {
  const stored = loadStoredEnvelope();
  return {
    push: parseStoredTable(stored.push),
    call: parseStoredTable(stored.call),
  };
}

export function getLocalHeadsUpReferenceSummary(): LocalHeadsUpReferenceSummary {
  const stored = loadStoredEnvelope();
  return {
    push: summarizeStoredTable(stored.push),
    call: summarizeStoredTable(stored.call),
  };
}

export function clearLocalHeadsUpReferenceSet(kind?: HeadsUpReferenceKind): void {
  if (!kind) {
    safeRemove(LOCAL_HU_REFERENCE_KEY);
    return;
  }

  const current = loadStoredEnvelope();
  const next: StoredLocalHeadsUpReferenceEnvelope = { version: CURRENT_VERSION };
  if (kind !== 'push' && current.push) next.push = current.push;
  if (kind !== 'call' && current.call) next.call = current.call;

  if (!next.push && !next.call) {
    safeRemove(LOCAL_HU_REFERENCE_KEY);
    return;
  }

  safeSet(LOCAL_HU_REFERENCE_KEY, next);
}

function parseStoredTable(stored: StoredLocalHeadsUpReferenceTable | undefined): HeadsUpFrequencyTable | undefined {
  if (!stored) return undefined;
  try {
    return parseHeadsUpFrequencyCsv(stored.csv, stored.kind);
  } catch {
    return undefined;
  }
}

function summarizeStoredTable(
  stored: StoredLocalHeadsUpReferenceTable | undefined,
): LocalHeadsUpReferenceTableSummary | undefined {
  const parsed = parseStoredTable(stored);
  if (!stored || !parsed) return undefined;
  return {
    fileName: stored.fileName,
    hands: parsed.handKeys.length,
    rows: parsed.rows.length,
    minStackBb: parsed.minStackBb,
    maxStackBb: parsed.maxStackBb,
  };
}

function loadStoredEnvelope(): StoredLocalHeadsUpReferenceEnvelope {
  return safeGet(
    LOCAL_HU_REFERENCE_KEY,
    validateStoredEnvelope,
    { version: CURRENT_VERSION },
  );
}

function validateStoredEnvelope(raw: unknown): StoredLocalHeadsUpReferenceEnvelope | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<StoredLocalHeadsUpReferenceEnvelope>;
  if (candidate.version !== CURRENT_VERSION) return null;

  const push = validateStoredTable(candidate.push, 'push');
  const call = validateStoredTable(candidate.call, 'call');
  if (candidate.push && !push) return null;
  if (candidate.call && !call) return null;

  return {
    version: CURRENT_VERSION,
    ...(push ? { push } : {}),
    ...(call ? { call } : {}),
  };
}

function validateStoredTable(raw: unknown, kind: HeadsUpReferenceKind): StoredLocalHeadsUpReferenceTable | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<StoredLocalHeadsUpReferenceTable>;
  if (candidate.kind !== kind) return null;
  if (typeof candidate.csv !== 'string' || candidate.csv.trim().length === 0) return null;
  if (typeof candidate.fileName !== 'string' || candidate.fileName.trim().length === 0) return null;
  if (typeof candidate.importedAt !== 'string' || isNaN(Date.parse(candidate.importedAt))) return null;
  return {
    kind,
    csv: candidate.csv,
    fileName: candidate.fileName,
    importedAt: candidate.importedAt,
  };
}
