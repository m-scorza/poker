import { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import JSZip from 'jszip';
import { Upload as UploadIcon, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../data/appStore';
import { importHands, importTournamentSummaries, getTotalHandCount } from '../../data/store';
import { formatImportSummary } from '../../parser/importSummary';
import type { ImportSummary } from '../../parser/workerProcessor';

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

  const processFiles = useCallback(async (files: FileList) => {
    setImporting(true);
    setImportProgress(0);
    setStatsFound({ hands: 0, summaries: 0, deviations: 0 });
    setResults([]);
    setImportSummary(null);

    // Convert FileList to serialized content for the worker
    const fileDataArr: any[] = [];
    for (const file of Array.from(files)) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.txt') || lowerName.endsWith('.json')) {
        const content = await file.text();
        fileDataArr.push({ name: file.name, content });
      } else if (lowerName.endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipFiles = Object.keys(zip.files);

          for (const zipFileName of zipFiles) {
            const entry = zip.files[zipFileName]!;
            if (!entry.dir && (zipFileName.toLowerCase().endsWith('.txt') || zipFileName.toLowerCase().endsWith('.json'))) {
              const content = await entry.async('string');
              fileDataArr.push({ name: `${file.name}/${zipFileName}`, content });
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not read this ZIP archive';
          setResults(prev => [...prev, {
            name: file.name,
            type: 'hand',
            error: `ZIP import failed: ${message}`,
          }]);
        }
      } else {
        setResults(prev => [...prev, {
          name: file.name,
          type: 'hand',
          error: 'Unsupported file type. Upload PokerStars/GGPoker .txt files, Open Hand History .json files, or .zip archives.',
        }]);
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

    worker.onmessage = async (e: MessageEvent) => {
      const { type, progress, filename, handsFound, summariesFound, deviationsFound, hands, error, importSummary: completedImportSummary } = e.data;

      if (type === 'PROGRESS') {
        setImportProgress(progress);
        setCurrentImportFile(filename);
        setStatsFound(prev => ({
          hands: prev.hands + (handsFound || 0),
          summaries: prev.summaries + (summariesFound || 0),
          deviations: prev.deviations + (deviationsFound || 0)
        }));
      } else if (type === 'FILE_ERROR') {
        setResults(prev => [...prev, {
          name: filename || 'Unknown file',
          type: 'hand',
          error: error || 'Parser failed on this file. Other files will continue importing.',
        }]);
      } else if (type === 'COMPLETE') {
        if (completedImportSummary) {
          setImportSummary(completedImportSummary);
        }

        // Save results to DB
        const [handImported, summaryImported] = await Promise.all([
           importHands(hands),
           importTournamentSummaries(e.data.summaries || [])
        ]);

        // Update store and UI
        const totalCount = await getTotalHandCount();
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

        worker.terminate();
      }
    };

    worker.onerror = (event) => {
      setImporting(false);
      setCurrentImportFile('');
      setResults(prev => [...prev, {
        name: 'Parser worker',
        type: 'hand',
        error: event.message || 'The background parser crashed before completing the import.',
      }]);
      worker.terminate();
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

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-active)] bg-[var(--color-bg-base)]',
        )}
      >
        <UploadIcon
          size={32}
          className={clsx('mx-auto mb-3', dragOver ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-dim)]')}
        />
        <p className="text-[var(--color-text)] font-semibold mb-1">
          Drag and Drop Poker Files
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Supports Hand Histories, Summaries, OHH JSON and ZIPs (.txt, .json, .zip)
        </p>
      </div>

      <input ref={fileRef} type="file" accept=".txt,.json,.zip" multiple onChange={onFileSelect} className="hidden" />

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
                  <div className="w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                  Processing History...
                </div>
                <p className="text-[10px] text-[var(--color-text-dim)] font-data truncate max-w-[300px]">
                  File: {currentImportFile}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-data font-bold text-[var(--color-accent)]">{Math.round(importProgress)}%</p>
              </div>
            </div>

            {/* Premium Progress Bar */}
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[#4ade80] shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                initial={{ width: 0 }}
                animate={{ width: `${importProgress}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-data text-[var(--color-text-muted)] uppercase tracking-wider">
                <div className="flex gap-4">
                  <span>Hands: <span className="text-white">{statsFound.hands}</span></span>
                  <span>Summaries: <span className="text-white">{statsFound.summaries}</span></span>
                  <span>Deviations: <span className="text-[var(--color-danger)]">{statsFound.deviations}</span></span>
                </div>
               <span>Do not close this page</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {results.length > 0 && !isImporting && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-sm space-y-2">
           <div className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
             <CheckCircle size={16} className="text-[var(--color-accent)]" />
             Processing Completed
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
               formattedImportSummary.tone === 'warning' && 'border-yellow-400/30 bg-yellow-400/10 text-yellow-100',
               formattedImportSummary.tone === 'danger' && 'border-red-400/30 bg-red-400/10 text-red-100',
             )}>
               <div className="font-bold">{formattedImportSummary.title}</div>
               <div className="mt-1 text-[var(--color-text-muted)]">{formattedImportSummary.detail}</div>
               {formattedImportSummary.warningPreview.length > 0 && (
                 <ul className="mt-2 list-disc pl-4 space-y-1">
                   {formattedImportSummary.warningPreview.map((warning, i) => (
                     <li key={i}>{warning}</li>
                   ))}
                 </ul>
               )}
             </div>
           )}
           <div className="text-[var(--color-text-dim)] text-xs space-y-1">
             <div>
               {totalHandNodes.reduce((acc, curr) => acc + (curr.imported ?? 0), 0)} New Hands
             </div>
             {totalSummaryNodes.map((r, i) => r.summaryDetail && (
               <div key={i}>
                 Summaries: {r.summaryDetail.updated} updated, {r.summaryDetail.created} created
                 {r.summaryDetail.buyInPreserved > 0 && (
                   <span className="text-[var(--color-warning,#ffaa00)]">
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
