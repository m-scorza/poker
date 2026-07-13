/**
 * Data Vault — export and restore the entire local database.
 *
 * Everything the app knows lives in this browser profile; this page makes
 * that portable. Export writes one JSON file with every table; restore
 * either merges it in (upsert by key) or replaces the database with it.
 * Replace is guarded by the shared ConfirmDialog, and a schema-version
 * mismatch is refused with the reason spelled out.
 */

import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Database, Download, Upload, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import {
  BACKUP_TABLES,
  backupCounts,
  backupFileName,
  buildBackup,
  liveCounts,
  parseBackup,
  restoreBackup,
  serializeBackup,
  type BackupCounts,
  type BackupFile,
  type RestoreMode,
} from '../data/backup';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { SettingsCard } from '../components/settings/SettingsCard';

const TABLE_LABELS: Record<(typeof BACKUP_TABLES)[number], string> = {
  hands: 'Hands',
  players: 'Players in hands',
  actions: 'Actions',
  tournaments: 'Tournaments',
  heroDecisions: 'Hero decisions',
  villains: 'Villain profiles',
  sessions: 'Session records',
  importRuns: 'Import runs',
  settings: 'Settings',
  leakStatus: 'Leak lifecycle',
  srsReview: 'SRS reviews',
};

function totalRows(counts: BackupCounts): number {
  return BACKUP_TABLES.reduce((sum, name) => sum + counts[name], 0);
}

interface StagedBackup {
  backup: BackupFile;
  counts: BackupCounts;
  fileName: string;
}

export function DataVaultPage() {
  const counts = useLiveQuery(() => liveCounts(), [], undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<StagedBackup | null>(null);
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState<BackupCounts | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setError(null);
    setBusy(true);
    try {
      const backup = await buildBackup();
      const blob = new Blob([serializeBackup(backup)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backupFileName();
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setRestored(null);
    setStaged(null);
    try {
      const backup = parseBackup(await file.text());
      setStaged({ backup, counts: backupCounts(backup), fileName: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this file.');
    }
  };

  const runRestore = async () => {
    if (!staged) return;
    setConfirmOpen(false);
    setBusy(true);
    setError(null);
    try {
      const after = await restoreBackup(staged.backup, mode);
      setRestored(after);
      setStaged(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed — the database was left unchanged.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black text-[var(--fg)]">
          <Database size={22} className="text-[var(--accent)]" /> Data Vault
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Your entire study history lives in this browser. Back it up to a file you own; restore it anywhere.
        </p>
      </header>

      <SettingsCard />

      <section className="compartment p-6">
        <div className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-muted)]">What&apos;s in the vault</div>
        {counts === undefined ? (
          <p className="mt-2 text-sm text-[var(--fg-muted)]">Counting…</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
              {BACKUP_TABLES.map((name) => (
                <div key={name} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-[var(--fg-muted)]">{TABLE_LABELS[name]}</span>
                  <span className="font-mono text-[var(--fg)]">{counts[name].toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--fg-dim)]">
              {totalRows(counts).toLocaleString('en-US')} rows total · all local, nothing leaves this machine unless you export it.
            </p>
          </>
        )}
        <button
          onClick={handleExport}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-2 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-3 py-2 text-sm font-semibold text-[var(--accent)] disabled:opacity-50"
        >
          <Download size={16} /> Export backup file
        </button>
      </section>

      <section className="compartment p-6">
        <div className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-muted)]">Restore</div>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Load a vault backup file, review what it contains, then merge it in or replace everything.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-2 rounded border border-[var(--hairline)] bg-[var(--ink-1)] px-3 py-2 text-sm font-semibold text-[var(--fg)] disabled:opacity-50"
        >
          <Upload size={16} /> Choose backup file
        </button>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded border border-[var(--loss)]/40 bg-[var(--loss-soft)] p-3 text-sm text-[var(--fg)]">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--loss)]" />
            <span>{error}</span>
          </div>
        )}

        {staged && (
          <div className="mt-4 rounded border border-[var(--hairline)] bg-[var(--ink-1)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--fg)]">
              <ShieldCheck size={16} className="text-[var(--money)]" />
              <span className="font-mono">{staged.fileName}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--fg-dim)]">
              Exported {new Date(staged.backup.exportedAt).toLocaleString('en-US')} · schema v{staged.backup.schemaVersion} ·{' '}
              {totalRows(staged.counts).toLocaleString('en-US')} rows ({staged.counts.hands.toLocaleString('en-US')} hands,{' '}
              {staged.counts.heroDecisions.toLocaleString('en-US')} decisions, {staged.counts.villains.toLocaleString('en-US')} villains)
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Restore mode">
              {(['merge', 'replace'] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={clsx(
                    'rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide',
                    mode === m
                      ? 'border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]'
                      : 'border-[var(--hairline)] text-[var(--fg-muted)]',
                  )}
                >
                  {m === 'merge' ? 'Merge into current data' : 'Replace everything'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--fg-dim)]">
              {mode === 'merge'
                ? 'Adds and updates rows by ID; keeps current rows the backup does not mention.'
                : 'Clears every table first — the database will exactly match the backup.'}
            </p>
            <button
              onClick={() => (mode === 'replace' ? setConfirmOpen(true) : void runRestore())}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-2 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-3 py-2 text-sm font-semibold text-[var(--accent)] disabled:opacity-50"
            >
              <Upload size={16} /> Restore ({mode})
            </button>
          </div>
        )}

        {restored && (
          <div className="mt-4 flex items-start gap-2 rounded border border-[var(--money-line)] bg-[var(--ink-1)] p-3 text-sm">
            <CheckCircle size={16} className="mt-0.5 shrink-0 text-[var(--money)]" />
            <span className="text-[var(--fg)]">
              Restore complete — the vault now holds {totalRows(restored).toLocaleString('en-US')} rows.
            </span>
          </div>
        )}
      </section>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Replace all data?"
        description="Every table will be cleared and refilled from the backup. Current data not in the backup is gone for good. Consider exporting a backup of the current state first."
        confirmLabel="Replace everything"
        onConfirm={() => void runRestore()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
