/**
 * Data Vault — full backup and restore of the local IndexedDB.
 *
 * Everything this app knows lives in the browser profile; a cache wipe or a
 * machine change destroys years of study history. The vault serializes every
 * Dexie table into one portable JSON file and restores it byte-honestly.
 *
 * Honesty rules:
 * - Dates are tagged (`{"$date": iso}`) at serialization and revived
 *   generically on parse — no per-table field lists to drift.
 * - Import refuses a backup whose `schemaVersion` differs from the running
 *   database version: rows written after `db.open()` bypass Dexie's upgrade
 *   hooks, so importing an old backup would silently skip migrations. The
 *   refusal message says exactly that instead of half-restoring.
 * - `restoreBackup` runs in a single transaction — a failed restore leaves
 *   the database untouched, never half-replaced.
 */

import { db } from './store';

export const BACKUP_FORMAT = 'poker-analyzer-backup';

export const BACKUP_TABLES = [
  'hands',
  'players',
  'actions',
  'tournaments',
  'heroDecisions',
  'villains',
  'sessions',
  'importRuns',
  'settings',
  'leakStatus',
  'srsReview',
] as const;

type BackupTableName = (typeof BACKUP_TABLES)[number];

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<BackupTableName, unknown[]>;
}

export type RestoreMode = 'merge' | 'replace';

export type BackupCounts = Record<BackupTableName, number>;

export function backupFileName(now: Date = new Date()): string {
  return `poker-analyzer-backup-${now.toISOString().slice(0, 10)}.json`;
}

export async function buildBackup(now: Date = new Date()): Promise<BackupFile> {
  const tables = {} as Record<BackupTableName, unknown[]>;
  for (const name of BACKUP_TABLES) {
    tables[name] = await db.table(name).toArray();
  }
  return {
    format: BACKUP_FORMAT,
    schemaVersion: db.verno,
    exportedAt: now.toISOString(),
    tables,
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, dateReplacer);
}

export function parseBackup(json: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json, dateReviver);
  } catch {
    throw new Error('This file is not valid JSON — it does not look like a vault backup.');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('This file is not a vault backup (no backup envelope found).');
  }
  const candidate = raw as Partial<BackupFile>;
  if (candidate.format !== BACKUP_FORMAT) {
    throw new Error('This file is not a vault backup (missing the poker-analyzer-backup marker).');
  }
  if (candidate.schemaVersion !== db.verno) {
    throw new Error(
      `This backup was made with database schema v${String(candidate.schemaVersion)}, but the app is running schema v${db.verno}. ` +
        'Restoring across schema versions would skip data migrations, so the vault refuses. ' +
        'Open the backup in the app version that created it, then re-export.',
    );
  }
  if (typeof candidate.tables !== 'object' || candidate.tables === null) {
    throw new Error('This backup has no tables section — the file is truncated or corrupted.');
  }
  const tables = candidate.tables as Record<string, unknown>;
  for (const name of BACKUP_TABLES) {
    if (!Array.isArray(tables[name])) {
      throw new Error(`This backup is missing the "${name}" table — the file is truncated or corrupted.`);
    }
  }
  return candidate as BackupFile;
}

export function backupCounts(backup: BackupFile): BackupCounts {
  const counts = {} as BackupCounts;
  for (const name of BACKUP_TABLES) {
    counts[name] = backup.tables[name].length;
  }
  return counts;
}

export async function liveCounts(): Promise<BackupCounts> {
  const counts = {} as BackupCounts;
  for (const name of BACKUP_TABLES) {
    counts[name] = await db.table(name).count();
  }
  return counts;
}

/**
 * Restore a parsed backup. `merge` upserts by primary key and keeps rows the
 * backup does not mention; `replace` clears every table first so the database
 * matches the backup exactly. Both run in one transaction.
 */
export async function restoreBackup(backup: BackupFile, mode: RestoreMode): Promise<BackupCounts> {
  const tables = BACKUP_TABLES.map((name) => db.table(name));
  await db.transaction('rw', tables, async () => {
    for (const name of BACKUP_TABLES) {
      const table = db.table(name);
      if (mode === 'replace') await table.clear();
      const rows = backup.tables[name];
      if (rows.length > 0) await table.bulkPut(rows);
    }
  });
  return liveCounts();
}

function dateReplacer(this: Record<string, unknown>, key: string, value: unknown): unknown {
  const raw = this[key];
  if (raw instanceof Date) return { $date: raw.toISOString() };
  return value;
}

function dateReviver(_key: string, value: unknown): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    '$date' in value &&
    typeof (value as { $date: unknown }).$date === 'string' &&
    Object.keys(value).length === 1
  ) {
    return new Date((value as { $date: string }).$date);
  }
  return value;
}
