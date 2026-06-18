import { useState, useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import JSZip from 'jszip';
import { Upload as UploadIcon, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../data/appStore';
import {
  importHands,
  importTournamentSummaries,
  getTotalHandCount,
  getRecentImportRuns,
  saveImportRun,
  clearImportRuns,
} from '../../data/store';
import {
  CHIP_ACCOUNTING_FIX_DATE,
  IMPORT_DIAGNOSTICS_RETENTION_RUNS,
  buildImportDiagnosticsMarkdown,
  buildImportRunRecord,
  buildImportRunTimeline,
  hasPreFixImportRuns,
  summarizeDataHealth,
  type ImportDiagnosticsEnvironment,
  type ImportConfidenceLedger,
} from '../../data/importRuns';
import {
  clearLocalHeadsUpReferenceSet,
  getLocalHeadsUpReferenceSummary,
  saveLocalHeadsUpReferenceCsv,
} from '../../data/localHeadsUpReferences';
import type { HeadsUpReferenceKind } from '../../analysis/headsUpPushFoldReference';
import { formatImportSummary } from '../../parser/importSummary';
import type { ImportSummary, WorkerFilePayload, WorkerMessage } from '../../parser/workerProcessor';

const MB = 1024 * 1024;
export const MAX_TXT_BYTES = 15 * MB;
export const MAX_ZIP_BYTES = 50 * MB;
export const MAX_ZIP_DECOMPRESSED_BYTES = 150 * MB;
export const MAX_BATCH_BYTES = 200 * MB;
const formatMB = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`;
const formatDateTime = (date: Date | null) => date
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  : 'Never';

const analysisPostureLabels: Record<ImportConfidenceLedger['analysisPosture'], string> = {
  empty: 'No baseline',
  ready: 'Ready',
  directional: 'Directional',
  blocked: 'Needs review',
};

function formatLedgerRate(rate: number | null): string {
  return rate === null ? 'n/a' : `${Math.round(rate * 100)}%`;
}

function getBrowserFamily(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/OPR\//.test(userAgent)) return 'Opera';
  if (/Chrome\//.test(userAgent)) return 'Chrome';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return 'Other';
}

function getImportDiagnosticsEnvironment(): ImportDiagnosticsEnvironment {
  const viteEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;

  return {
    appVersion: viteEnv?.VITE_APP_VERSION ?? 'local',
    browserFamily: getBrowserFamily(navigator.userAgent),
    language: navigator.language,
    platform: navigator.platform,
  };
}

const confidenceBadgeClasses = {
  high: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  medium: 'border-warn/30 bg-warn/10 text-warn',
  low: 'border-red-400/30 bg-red-400/10 text-red-100',
};

type JSZipInternalEntry = { _data?: { uncompressedSize?: number } };

function isSupportedZipEntry(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith('.txt') || lowerName.endsWith('.json');
}

function getKnownZipEntrySize(entry: JSZip.JSZipObject): number | null {
  const internalSize = (entry as unknown as JSZipInternalEntry)._data?.uncompressedSize;
  return typeof internalSize === 'number' && Number.isFinite(internalSize) && internalSize >= 0
    ? internalSize
    : null;
}

export function HandsUpload({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState<Array<{
    name: string;
    parsed?: number;
    imported?: number;
    summaryDetail?: { updated: number; created: number; buyInPreserved: number };
    type: 'hand' | 'summary';
    error?: string;
  }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isImporting, setImporting, setTotalHands, heroName, strategyProfile } = useAppStore();

  const [importProgress, setImportProgress] = useState(0);
  const [currentImportFile, setCurrentImportFile] = useState('');
  const [statsFound, setStatsFound] = useState({ hands: 0, summaries: 0, deviations: 0 });
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [diagnosticsMessage, setDiagnosticsMessage] = useState<string | null>(null);
  const [localReferenceSummary, setLocalReferenceSummary] = useState(() => getLocalHeadsUpReferenceSummary());
  const [localReferenceMessage, setLocalReferenceMessage] = useState<string | null>(null);
  const pushReferenceRef = useRef<HTMLInputElement>(null);
  const callReferenceRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const mountedRef = useRef(true);
  const importSeqRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      importSeqRef.current += 1;
      workerRef.current?.terminate();
      workerRef.current = null;
      setImporting(false);
    };
  }, [setImporting]);

  const handleLocalReferenceFile = useCallback(async (kind: HeadsUpReferenceKind, file: File | null) => {
    if (!file) return;
    const csv = await file.text();
    const saved = saveLocalHeadsUpReferenceCsv(kind, csv, file.name);
    if (!saved.ok) {
      setLocalReferenceMessage(saved.message);
      return;
    }
    setLocalReferenceSummary(getLocalHeadsUpReferenceSummary());
    setLocalReferenceMessage(`${kind === 'push' ? 'Push' : 'Call'} reference saved locally from ${file.name}.`);
    onUploadSuccess();
  }, [onUploadSuccess]);

  const clearLocalReference = useCallback((kind?: HeadsUpReferenceKind) => {
    clearLocalHeadsUpReferenceSet(kind);
    setLocalReferenceSummary(getLocalHeadsUpReferenceSummary());
    setLocalReferenceMessage(kind ? `${kind === 'push' ? 'Push' : 'Call'} reference cleared.` : 'Local heads-up references cleared.');
    onUploadSuccess();
  }, [onUploadSuccess]);

  const processFiles = useCallback(async (files: FileList) => {
    const importSeq = importSeqRef.current + 1;
    importSeqRef.current = importSeq;
    const isCurrentImport = () => mountedRef.current && importSeqRef.current === importSeq;

    setImporting(true);
    setImportProgress(0);
    setStatsFound({ hands: 0, summaries: 0, deviations: 0 });
    setResults([]);
    setImportSummary(null);
    setDiagnosticsMessage(null);
    workerRef.current?.terminate();
    workerRef.current = null;

    // Convert FileList to serialized content for the worker
    const fileDataArr: WorkerFilePayload[] = [];
    let batchBytes = 0;
    const pushError = (name: string, error: string) => {
      setResults(prev => [...prev, { name, type: 'hand', error }]);
    };

    for (const file of Array.from(files)) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.txt') || lowerName.endsWith('.json')) {
        if (file.size > MAX_TXT_BYTES) {
          pushError(file.name, `File too large (${formatMB(file.size)}). Maximum ${formatMB(MAX_TXT_BYTES)} per hand-history file.`);
          continue;
        }
        if (batchBytes + file.size > MAX_BATCH_BYTES) {
          pushError(file.name, `Upload batch too large (limit ${formatMB(MAX_BATCH_BYTES)}). Select fewer files and try again.`);
          continue;
        }
        const content = await file.text();
        if (!isCurrentImport()) return;
        batchBytes += file.size;
        fileDataArr.push({ name: file.name, content });
      } else if (lowerName.endsWith('.zip')) {
        if (file.size > MAX_ZIP_BYTES) {
          pushError(file.name, `ZIP archive too large (${formatMB(file.size)}). Maximum ${formatMB(MAX_ZIP_BYTES)}.`);
          continue;
        }
        try {
          const zip = await JSZip.loadAsync(file);
          if (!isCurrentImport()) return;
          const zipFiles = Object.keys(zip.files);

          let plannedDecompressed = 0;
          let zipMetadataMissing = false;
          for (const zipFileName of zipFiles) {
            const entry = zip.files[zipFileName]!;
            if (entry.dir) continue;
            if (!isSupportedZipEntry(zipFileName)) continue;
            const internalSize = getKnownZipEntrySize(entry);
            if (internalSize === null) {
              pushError(`${file.name}/${zipFileName}`, 'ZIP entry size metadata is unavailable. Refusing to extract this archive safely.');
              zipMetadataMissing = true;
              break;
            }
            plannedDecompressed += internalSize;
          }
          if (zipMetadataMissing) continue;
          if (plannedDecompressed > MAX_ZIP_DECOMPRESSED_BYTES) {
            pushError(file.name, `ZIP would decompress to ${formatMB(plannedDecompressed)} (limit ${formatMB(MAX_ZIP_DECOMPRESSED_BYTES)}). Refusing to extract.`);
            continue;
          }

          let extractedBytes = 0;
          let zipAborted = false;
          for (const zipFileName of zipFiles) {
            const entry = zip.files[zipFileName]!;
            if (entry.dir) continue;
            if (!isSupportedZipEntry(zipFileName)) continue;

            const internalSize = getKnownZipEntrySize(entry);
            if (internalSize === null) {
              pushError(`${file.name}/${zipFileName}`, 'ZIP entry size metadata is unavailable. Refusing to extract this archive safely.');
              zipAborted = true;
              break;
            }
            if (internalSize > MAX_TXT_BYTES) {
              pushError(`${file.name}/${zipFileName}`, `Entry too large (${formatMB(internalSize)}). Maximum ${formatMB(MAX_TXT_BYTES)} per file inside ZIP.`);
              continue;
            }
            if (extractedBytes + internalSize > MAX_ZIP_DECOMPRESSED_BYTES) {
              pushError(file.name, `Aborting ZIP extraction: cumulative size passed ${formatMB(MAX_ZIP_DECOMPRESSED_BYTES)}.`);
              zipAborted = true;
              break;
            }
            if (batchBytes + internalSize > MAX_BATCH_BYTES) {
              pushError(file.name, `Upload batch too large (limit ${formatMB(MAX_BATCH_BYTES)}). Select fewer files and try again.`);
              zipAborted = true;
              break;
            }

            const content = await entry.async('string');
            if (!isCurrentImport()) return;
            // Final guard for entries where uncompressedSize was missing/lied:
            const contentBytes = new TextEncoder().encode(content).length;
            if (contentBytes > MAX_TXT_BYTES) {
              pushError(`${file.name}/${zipFileName}`, `Entry expanded to ${formatMB(contentBytes)}, exceeding ${formatMB(MAX_TXT_BYTES)}.`);
              continue;
            }
            extractedBytes += contentBytes;
            batchBytes += contentBytes;
            fileDataArr.push({ name: `${file.name}/${zipFileName}`, content });
          }
          if (zipAborted) continue;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not read this ZIP archive';
          pushError(file.name, `ZIP import failed: ${message}`);
        }
      } else {
        pushError(file.name, 'Unsupported file type. Upload PokerStars/GGPoker .txt files, Open Hand History .json files, or .zip archives.');
      }
    }

    if (fileDataArr.length === 0) {
      setImporting(false);
      setCurrentImportFile('');
      setResults(prev => prev.length > 0 ? prev : [{
        name: 'No parseable files found',
        type: 'hand',
        error: 'No .txt/.json hand histories or tournament summaries were found in the selected upload.',
      }]);
      return;
    }

    // Initialize Worker
    const worker = new Worker(new URL('../../parser/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = async (e: MessageEvent<WorkerMessage>) => {
      if (!isCurrentImport() || workerRef.current !== worker) return;
      const msg = e.data;

      if (msg.type === 'PROGRESS') {
        setImportProgress(msg.progress);
        setCurrentImportFile(msg.filename);
        setStatsFound(prev => ({
          hands: prev.hands + msg.handsFound,
          summaries: prev.summaries + msg.summariesFound,
          deviations: prev.deviations + msg.deviationsFound
        }));
      } else if (msg.type === 'FILE_ERROR') {
        setResults(prev => [...prev, {
          name: msg.filename || 'Unknown file',
          type: 'hand',
          error: msg.error || 'Parser failed on this file. Other files will continue importing.',
        }]);
      } else if (msg.type === 'COMPLETE') {
        setImportSummary(msg.importSummary);

        try {
          // Save results to DB
          const [handImported, summaryImported] = await Promise.all([
             importHands(msg.hands),
             importTournamentSummaries(msg.summaries)
          ]);
          if (!isCurrentImport() || workerRef.current !== worker) return;

          try {
            const importedAt = new Date();
            await saveImportRun(buildImportRunRecord(
              msg.importSummary,
              fileDataArr.map(file => file.name),
              {
                savedHands: handImported,
                savedSummaries: summaryImported.updated + summaryImported.created,
              },
              importedAt,
              { environment: getImportDiagnosticsEnvironment() },
            ));
          } catch (error) {
            console.warn('Import completed, but audit history could not be saved:', error);
          }
          if (!isCurrentImport() || workerRef.current !== worker) return;

          // Update store and UI
          const totalCount = await getTotalHandCount();
          if (!isCurrentImport() || workerRef.current !== worker) return;
          setTotalHands(totalCount);
          setImporting(false);
          setResults(prev => [
            ...prev,
            { name: `${fileDataArr.length} files`, type: 'hand', imported: handImported },
            {
              name: `${fileDataArr.length} files`,
              type: 'summary',
              imported: summaryImported.updated + summaryImported.created,
              summaryDetail: summaryImported,
            }
          ]);
          onUploadSuccess();
        } catch (error) {
          // Parsing succeeded but persisting to IndexedDB failed (quota,
          // private mode, etc.). Without this catch the async onmessage would
          // reject, setImporting(false) would never run, and the "Do not close
          // this page" overlay would wedge forever. Clear the overlay and tell
          // the user that re-importing is safe (dedup is by hand ID).
          if (!isCurrentImport() || workerRef.current !== worker) return;
          setImporting(false);
          setCurrentImportFile('');
          setResults(prev => [...prev, {
            name: 'Saving to local storage',
            type: 'hand',
            error: `Parsing succeeded but saving failed (${error instanceof Error ? error.message : String(error)}). This can happen when browser storage is full or in private mode. Re-importing is safe — already-saved hands are skipped by hand ID.`,
          }]);
        } finally {
          worker.terminate();
          if (workerRef.current === worker) workerRef.current = null;
        }
      } else if (msg.type === 'FATAL_ERROR') {
        setImporting(false);
        setCurrentImportFile('');
        setResults(prev => [...prev, {
          name: 'Parser worker',
          type: 'hand',
          error: msg.error || 'The background parser failed before completing the import.',
        }]);
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      }
    };

    worker.onerror = (event) => {
      if (!isCurrentImport() || workerRef.current !== worker) return;
      setImporting(false);
      setCurrentImportFile('');
      setResults(prev => [...prev, {
        name: 'Parser worker',
        type: 'hand',
        error: event.message || 'The background parser crashed before completing the import.',
      }]);
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };

    worker.postMessage({
      files: fileDataArr,
      heroName,
      profile: strategyProfile,
      icmStage: 'early' // Default for now
    });
  }, [heroName, strategyProfile, setImporting, setTotalHands, onUploadSuccess]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
  }, [processFiles]);

  const totalHandNodes = results.filter(r => r.type === 'hand' && !r.error);
  const totalSummaryNodes = results.filter(r => r.type === 'summary' && !r.error);
  const formattedImportSummary = importSummary ? formatImportSummary(importSummary) : null;
  const retainedImportRuns = useLiveQuery(() => getRecentImportRuns(IMPORT_DIAGNOSTICS_RETENTION_RUNS), [], []);
  const recentImportRuns = (retainedImportRuns ?? []).slice(0, 5);
  const dataHealth = summarizeDataHealth(recentImportRuns ?? []);
  const importRunTimeline = buildImportRunTimeline(recentImportRuns ?? []);
  const retainedImportRunCount = retainedImportRuns?.length ?? 0;
  const topWarningCategories = dataHealth.ledger.warningCategories.slice(0, 2);
  const showPreFixNotice = hasPreFixImportRuns(retainedImportRuns ?? []);

  function downloadImportDiagnostics() {
    const markdown = buildImportDiagnosticsMarkdown(retainedImportRuns ?? [], {
      maxRuns: IMPORT_DIAGNOSTICS_RETENTION_RUNS,
    });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `poker-import-diagnostics-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function clearLocalImportDiagnostics() {
    if (!window.confirm('Clear local import diagnostics? Parsed hands and tournament data will stay in place.')) {
      return;
    }

    try {
      await clearImportRuns();
      setShowHistory(false);
      setDiagnosticsMessage('Local import diagnostics cleared. Parsed hands were not deleted.');
    } catch (error) {
      console.warn('Local import diagnostics could not be cleared:', error);
      setDiagnosticsMessage('Local import diagnostics could not be cleared.');
    }
  }

  return (
    <div className="compartment p-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragOver
            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
            : 'border-[var(--hairline)] hover:border-[var(--hairline)] bg-[var(--bg)]',
        )}
      >
        <UploadIcon
          size={32}
          className={clsx('mx-auto mb-3', dragOver ? 'text-[var(--accent)]' : 'text-[var(--fg-dim)]')}
        />
        <p className="text-[var(--fg)] font-semibold mb-1">
          Drag and Drop Poker Files
        </p>
        <p className="text-xs text-[var(--fg-muted)]">
          Supports Hand Histories, Summaries, OHH JSON and ZIPs (.txt, .json, .zip)
        </p>
      </div>

      <input ref={fileRef} type="file" accept=".txt,.json,.zip" multiple onChange={onFileSelect} className="hidden" />
      <input
        ref={pushReferenceRef}
        type="file"
        accept=".csv,.txt"
        onChange={(event) => {
          void handleLocalReferenceFile('push', event.target.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
        className="hidden"
      />
      <input
        ref={callReferenceRef}
        type="file"
        accept=".csv,.txt"
        onChange={(event) => {
          void handleLocalReferenceFile('call', event.target.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
        className="hidden"
      />

      <div className="mt-4 rounded-lg border border-[var(--hairline)] bg-[var(--ink-1)] p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-[var(--fg)]">Data Health</div>
            <div className="mt-1 text-[var(--fg-muted)]">{dataHealth.message}</div>
          </div>
          <div className="flex items-center gap-2">
            {dataHealth.status === 'ready' && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImportDiagnostics();
                  }}
                  className="rounded border border-warn/20 bg-warn/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warn hover:bg-warn/15 transition-colors cursor-pointer"
                  title="Download source filenames, import counts, and parser warnings without raw hand histories."
                >
                  Export Diagnostics
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void clearLocalImportDiagnostics();
                  }}
                  className="rounded border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-100 hover:bg-red-400/15 transition-colors cursor-pointer"
                  title="Clear local import diagnostics without deleting parsed hands."
                >
                  Clear Diagnostics
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHistory(prev => !prev);
                  }}
                  className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {showHistory ? 'Hide Details' : 'Show History'}
                </button>
              </>
            )}
            {dataHealth.confidence ? (
              <span className={clsx(
                'rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider',
                confidenceBadgeClasses[dataHealth.confidence],
              )}>
                {dataHealth.confidence} confidence
              </span>
            ) : (
              <span className="rounded-full border border-[var(--hairline)] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                No imports yet
              </span>
            )}
          </div>
        </div>
        {showPreFixNotice && (
          <div className="mt-3 rounded border border-warn/30 bg-warn/10 p-3 text-[11px]">
            <div className="font-semibold text-warn">Some imports predate a chip-accounting fix</div>
            <div className="mt-1 text-[var(--fg-muted)]">
              Imports before {CHIP_ACCOUNTING_FIX_DATE.toISOString().slice(0, 10)} were parsed with a
              bug that mis-counted raises and uncalled bets, so their net P&amp;L and bb-denominated
              metrics may be wrong in contested pots. Re-import those hand-history files to correct
              them — duplicates are skipped by hand ID, so it&apos;s safe to drop the same files again.
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="mt-2 rounded border border-warn/30 bg-warn/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-warn hover:bg-warn/25 transition-colors cursor-pointer"
            >
              Re-import files
            </button>
          </div>
        )}
        {dataHealth.status === 'ready' && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[var(--fg-muted)] md:grid-cols-4">
              <div><span className="text-[var(--fg)]">Last:</span> {formatDateTime(dataHealth.lastImportedAt)}</div>
              <div><span className="text-[var(--fg)]">Files:</span> {dataHealth.recentFiles}</div>
              <div><span className="text-[var(--fg)]">Saved:</span> {dataHealth.recentSavedHands} hands / {dataHealth.recentSavedSummaries} summaries</div>
              <div><span className="text-[var(--fg)]">Failed:</span> {dataHealth.recentFailedFiles}</div>
            </div>
            <div className="mt-3 rounded border border-white/10 bg-white/5 p-2 text-[10px] text-[var(--fg-muted)]">
              <div>
                Local diagnostics: {retainedImportRunCount} retained import run{retainedImportRunCount === 1 ? '' : 's'}.
                Keeps the latest {IMPORT_DIAGNOSTICS_RETENTION_RUNS} locally and excludes raw hands, cards, actions, and local paths.
              </div>
              <div className="mt-1">
                Confidence ledger: {analysisPostureLabels[dataHealth.ledger.analysisPosture]}; {dataHealth.ledger.parsedFiles}/{dataHealth.ledger.totalFiles} files parsed ({formatLedgerRate(dataHealth.ledger.parsedFileRate)}); confidence mix H/M/L {dataHealth.ledger.confidenceCounts.high}/{dataHealth.ledger.confidenceCounts.medium}/{dataHealth.ledger.confidenceCounts.low}.
              </div>
              {topWarningCategories.length > 0 && (
                <div className="mt-1 text-[var(--fg-dim)]">
                  Top parser warning categories: {topWarningCategories.map(row => `${row.label} ${row.count}`).join(', ')}.
                </div>
              )}
            </div>
          </>
        )}
        {diagnosticsMessage && (
          <div className="mt-3 rounded border border-white/10 bg-white/5 p-2 text-[var(--fg-muted)]">
            {diagnosticsMessage}
          </div>
        )}
        {dataHealth.warnings.length > 0 && !showHistory && (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-[var(--fg-dim)]">
            {dataHealth.warnings.map((warning, i) => (
              <li key={`${warning}-${i}`}>{warning}</li>
            ))}
          </ul>
        )}

        {/* Collapsible Timeline Details */}
        {showHistory && importRunTimeline.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--hairline)] space-y-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-muted)] mb-2">
              Import History Timeline
            </div>
            <div className="relative pl-4 border-l border-white/10 space-y-4">
              {importRunTimeline.map((run) => (
                <div key={run.id} className="relative">
                  {/* Timeline bullet */}
                  <div className={clsx(
                    'absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-black',
                    run.confidence === 'high' && 'bg-emerald-400',
                    run.confidence === 'medium' && 'bg-warn',
                    run.confidence === 'low' && 'bg-red-400'
                  )} />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        {run.title.split(' · ')[0]}
                        <span className={clsx(
                          'rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider',
                          run.confidence === 'high' && 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
                          run.confidence === 'medium' && 'bg-warn/10 text-warn border border-warn/20',
                          run.confidence === 'low' && 'bg-red-400/10 text-red-300 border border-red-400/20'
                        )}>
                          {run.statusLabel}
                        </span>
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--fg-muted)]">
                      {run.parsedFilesLabel} &middot; <span className="text-white">{run.savedLabel}</span> &middot; <span className="text-[var(--warn)]">{run.failedFilesLabel}</span>
                    </p>
                    <div className="text-[9px] text-[var(--fg-muted)]">
                      Sources: {run.sourcePreview.join(', ')}
                    </div>
                    {run.warningPreview.length > 0 && (
                      <div className="mt-1 max-h-20 overflow-y-auto rounded bg-black/20 p-2 font-mono text-[9px] text-[var(--fg-dim)] scrollbar-thin">
                        <div className="font-bold text-[8px] uppercase tracking-widest text-[var(--fg-dim)] mb-1">
                          Warnings / Error logs
                        </div>
                        <ul className="list-disc pl-3 space-y-0.5">
                          {run.warningPreview.map((warning, i) => (
                            <li key={`${run.id}-${warning}-${i}`} className="leading-relaxed">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-[var(--hairline)] bg-[var(--ink-1)] p-4 text-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-[var(--fg)]">Local heads-up reference tables</div>
            <div className="mt-1 max-w-2xl text-[var(--fg-muted)]">
              Optional private CSV/table inputs for HU button push and BB call-vs-all-in checks. These stay in browser storage and only create rule-based study hints; no solver EV is inferred.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                pushReferenceRef.current?.click();
              }}
              className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
            >
              Import push CSV
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                callReferenceRef.current?.click();
              }}
              className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
            >
              Import call CSV
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-[var(--fg-muted)] md:grid-cols-2">
          {(['push', 'call'] as const).map((kind) => {
            const summary = localReferenceSummary[kind];
            return (
              <div key={kind} className="rounded border border-white/10 bg-black/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold uppercase tracking-wider text-[var(--fg)]">{kind === 'push' ? 'HU push' : 'BB call'}</div>
                  {summary && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        clearLocalReference(kind);
                      }}
                      className="text-[10px] font-bold uppercase tracking-wider text-red-200 hover:text-red-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {summary ? (
                  <div className="mt-1 space-y-0.5">
                    <div className="truncate text-[var(--fg)]">{summary.fileName}</div>
                    <div>{summary.rows} stacks · {summary.hands} hands · {summary.minStackBb}-{summary.maxStackBb}bb</div>
                  </div>
                ) : (
                  <div className="mt-1">No local {kind} reference loaded.</div>
                )}
              </div>
            );
          })}
        </div>
        {localReferenceMessage && (
          <div className="mt-3 rounded border border-white/10 bg-white/5 p-2 text-[var(--fg-muted)]">
            {localReferenceMessage}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isImporting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 space-y-4"
          >
            <div className="flex justify-between items-end mb-1">
              <div className="space-y-1">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                  Processing History...
                </div>
                <p className="text-[10px] text-[var(--fg-dim)] font-mono truncate max-w-[300px]">
                  File: {currentImportFile}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-mono font-bold text-[var(--accent)]">{Math.round(importProgress)}%</p>
              </div>
            </div>

            {/* Premium Progress Bar */}
            <div className="h-2 w-full bg-[var(--ink-2)] rounded-full overflow-hidden border border-[var(--hairline)] shadow-inner">
              <motion.div
                className="h-full bg-[var(--accent)]"
                initial={{ width: 0 }}
                animate={{ width: `${importProgress}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-[var(--fg-muted)] uppercase tracking-wider">
                <div className="flex gap-4">
                  <span>Hands: <span className="text-white">{statsFound.hands}</span></span>
                  <span>Summaries: <span className="text-white">{statsFound.summaries}</span></span>
                  <span>Deviations: <span className="text-[var(--loss)]">{statsFound.deviations}</span></span>
                </div>
               <span>Do not close this page</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {results.length > 0 && !isImporting && (
        <div className="mt-4 pt-4 border-t border-[var(--hairline)] text-sm space-y-2">
           <div className="flex items-center justify-between gap-2 font-semibold text-[var(--fg)]">
             <div className="flex items-center gap-2">
               <CheckCircle size={16} className="text-[var(--accent)]" />
               Processing Completed
             </div>
             {importSummary && (
               <span className={clsx(
                 'rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
                 importSummary.confidence === 'high' && 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
                 importSummary.confidence === 'medium' && 'bg-warn/10 text-warn border border-warn/20',
                 importSummary.confidence === 'low' && 'bg-red-400/10 text-red-300 border border-red-400/20'
               )}>
                 {importSummary.confidence === 'high' && 'Import Complete'}
                 {importSummary.confidence === 'medium' && 'Imported with Warnings'}
                 {importSummary.confidence === 'low' && 'Needs Review'}
               </span>
             )}
           </div>
           {results.some(r => r.error) && (
             <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs font-semibold text-red-200">
               Some files need attention. Valid files were still imported when possible.
             </div>
           )}
           {formattedImportSummary && (
             <div className={clsx(
               'rounded-lg border p-3 text-xs',
               formattedImportSummary.tone === 'success' && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
               formattedImportSummary.tone === 'warning' && 'border-warn/30 bg-warn/10 text-warn',
               formattedImportSummary.tone === 'danger' && 'border-red-400/30 bg-red-400/10 text-red-100',
             )}>
               <div className="font-bold">{formattedImportSummary.title}</div>
               <div className="mt-1 text-[var(--fg-muted)]">{formattedImportSummary.detail}</div>
               {formattedImportSummary.warningPreview.length > 0 && (
                 <ul className="mt-2 list-disc pl-4 space-y-1">
                   {formattedImportSummary.warningPreview.map((warning, i) => (
                     <li key={i}>{warning}</li>
                   ))}
                 </ul>
               )}
             </div>
           )}
           <div className="text-[var(--fg-dim)] text-xs space-y-1">
             <div>
               {totalHandNodes.reduce((acc, curr) => acc + (curr.imported ?? 0), 0)} New Hands
             </div>
             {totalSummaryNodes.map((r, i) => r.summaryDetail && (
               <div key={i}>
                 Summaries: {r.summaryDetail.updated} updated, {r.summaryDetail.created} created
                 {r.summaryDetail.buyInPreserved > 0 && (
                   <span className="text-[var(--warn)]">
                     {' '}({r.summaryDetail.buyInPreserved} buy-in{r.summaryDetail.buyInPreserved !== 1 ? 's' : ''} preserved from hand history)
                   </span>
                 )}
               </div>
             ))}
             {results.filter(r => r.error).map((r, i) => (
               <div key={`error-${i}`} className="text-red-300">
                 {r.name}: {r.error}
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
}
