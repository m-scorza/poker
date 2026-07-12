import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { useAppStore } from '../../data/appStore';
import {
  importHands,
  importTournamentSummaries,
  getTotalHandCount,
  saveImportRun,
  reconcileLeakStatusesOnImport,
} from '../../data/store';
import {
  buildImportRunRecord,
  type ImportDiagnosticsEnvironment,
} from '../../data/importRuns';
import type { ImportSummary, WorkerFilePayload, WorkerMessage } from '../../parser/workerProcessor';

const MB = 1024 * 1024;
const MAX_TXT_BYTES = 15 * MB;
const MAX_ZIP_BYTES = 50 * MB;
const MAX_ZIP_DECOMPRESSED_BYTES = 150 * MB;
const MAX_BATCH_BYTES = 200 * MB;
const IMPORT_INACTIVITY_TIMEOUT_MS = 60_000;

export type ImportPhase = 'reading' | 'parsing' | 'saving' | 'analysing';

export const IMPORT_PHASE_LABELS: Record<ImportPhase, string> = {
  reading: 'Reading files',
  parsing: 'Parsing hands',
  saving: 'Saving locally',
  analysing: 'Updating analysis',
};

export interface ImportResultRow {
  name: string;
  parsed?: number;
  imported?: number;
  summaryDetail?: { updated: number; created: number; buyInPreserved: number };
  type: 'hand' | 'summary';
  error?: string;
}

export interface ImportStats {
  hands: number;
  summaries: number;
  deviations: number;
}

const formatMB = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`;

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

export interface ImportPipeline {
  isImporting: boolean;
  results: ImportResultRow[];
  importProgress: number;
  importPhase: ImportPhase;
  currentImportFile: string;
  statsFound: ImportStats;
  importSummary: ImportSummary | null;
  processFiles: (files: FileList) => Promise<void>;
  cancelImport: () => void;
}

export function useImportPipeline({ onUploadSuccess }: { onUploadSuccess: () => void }): ImportPipeline {
  const { isImporting, setImporting, setTotalHands, heroName, strategyProfile } = useAppStore();

  const [results, setResults] = useState<ImportResultRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhase, setImportPhase] = useState<ImportPhase>('reading');
  const [currentImportFile, setCurrentImportFile] = useState('');
  const [statsFound, setStatsFound] = useState<ImportStats>({ hands: 0, summaries: 0, deviations: 0 });
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const importWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const importSeqRef = useRef(0);

  const clearImportWatchdog = useCallback(() => {
    if (importWatchdogRef.current !== null) {
      clearTimeout(importWatchdogRef.current);
      importWatchdogRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      importSeqRef.current += 1;
      clearImportWatchdog();
      workerRef.current?.terminate();
      workerRef.current = null;
      setImporting(false);
    };
  }, [clearImportWatchdog, setImporting]);

  const processFiles = useCallback(async (files: FileList) => {
    const importSeq = importSeqRef.current + 1;
    importSeqRef.current = importSeq;
    const isCurrentImport = () => mountedRef.current && importSeqRef.current === importSeq;
    const failImport = (name: string, error: string) => {
      if (!isCurrentImport()) return;
      clearImportWatchdog();
      workerRef.current?.terminate();
      workerRef.current = null;
      setImporting(false);
      setCurrentImportFile('');
      setResults(prev => [...prev, { name, type: 'hand', error }]);
    };

    clearImportWatchdog();
    setImporting(true);
    setImportPhase('reading');
    setImportProgress(0);
    setStatsFound({ hands: 0, summaries: 0, deviations: 0 });
    setResults([]);
    setImportSummary(null);
    workerRef.current?.terminate();
    workerRef.current = null;

    // Convert FileList to serialized content for the worker
    const fileDataArr: WorkerFilePayload[] = [];
    let batchBytes = 0;
    const pushError = (name: string, error: string) => {
      setResults(prev => [...prev, { name, type: 'hand', error }]);
    };

    for (const file of Array.from(files)) {
      setCurrentImportFile(file.name);
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
        let content: string;
        try {
          content = await file.text();
        } catch (error) {
          pushError(file.name, `Could not read this file (${error instanceof Error ? error.message : String(error)}).`);
          continue;
        }
        if (!isCurrentImport()) return;
        batchBytes += file.size;
        fileDataArr.push({ name: file.name, content, accessMethod: 'local_file' });
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
            fileDataArr.push({ name: `${file.name}/${zipFileName}`, content, accessMethod: 'local_folder' });
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
    setImportPhase('parsing');
    let worker: Worker;
    try {
      worker = new Worker(new URL('../../parser/worker.ts', import.meta.url), { type: 'module' });
    } catch (error) {
      failImport('Parser worker', `The background parser could not start (${error instanceof Error ? error.message : String(error)}).`);
      return;
    }
    workerRef.current = worker;

    const armImportWatchdog = () => {
      clearImportWatchdog();
      importWatchdogRef.current = setTimeout(() => {
        failImport(
          'Parser worker',
          'The import stopped responding. It was cancelled safely; select the files and try again.',
        );
      }, IMPORT_INACTIVITY_TIMEOUT_MS);
    };

    worker.onmessage = async (e: MessageEvent<WorkerMessage>) => {
      if (!isCurrentImport() || workerRef.current !== worker) return;
      const msg = e.data;

      if (msg.type === 'PROGRESS') {
        armImportWatchdog();
        setImportPhase('parsing');
        setImportProgress(msg.progress);
        setCurrentImportFile(msg.filename);
        setStatsFound(prev => ({
          hands: prev.hands + msg.handsFound,
          summaries: prev.summaries + msg.summariesFound,
          deviations: prev.deviations + msg.deviationsFound
        }));
      } else if (msg.type === 'FILE_ERROR') {
        armImportWatchdog();
        setResults(prev => [...prev, {
          name: msg.filename || 'Unknown file',
          type: 'hand',
          error: msg.error || 'Parser failed on this file. Other files will continue importing.',
        }]);
      } else if (msg.type === 'COMPLETE') {
        clearImportWatchdog();
        setImportPhase('saving');
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

          // Advance the leak lifecycle (resolved / regressed) at this re-measure.
          // Non-fatal: a failure here must not wedge the import.
          setImportPhase('analysing');
          try {
            await reconcileLeakStatusesOnImport(strategyProfile);
          } catch (error) {
            console.warn('Import completed, but the leak lifecycle could not be updated:', error);
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
        clearImportWatchdog();
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
      clearImportWatchdog();
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

    try {
      armImportWatchdog();
      worker.postMessage({
        files: fileDataArr,
        heroName,
        profile: strategyProfile,
        icmStage: 'early' // Default for now
      });
    } catch (error) {
      failImport('Parser worker', `The import could not be sent to the background parser (${error instanceof Error ? error.message : String(error)}).`);
    }
  }, [clearImportWatchdog, heroName, strategyProfile, setImporting, setTotalHands, onUploadSuccess]);

  const cancelImport = useCallback(() => {
    importSeqRef.current += 1;
    clearImportWatchdog();
    workerRef.current?.terminate();
    workerRef.current = null;
    setImporting(false);
    setCurrentImportFile('');
    setResults(prev => [...prev, {
      name: 'Import cancelled',
      type: 'hand',
      error: 'The import was cancelled safely. Select files to try again.',
    }]);
  }, [clearImportWatchdog, setImporting]);

  return {
    isImporting,
    results,
    importProgress,
    importPhase,
    currentImportFile,
    statsFound,
    importSummary,
    processFiles,
    cancelImport,
  };
}
