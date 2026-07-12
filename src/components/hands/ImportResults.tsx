import { clsx } from 'clsx';
import { CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatImportSummary } from '../../parser/importSummary';
import type { ImportSummary } from '../../parser/workerProcessor';
import {
  IMPORT_PHASE_LABELS,
  type ImportPhase,
  type ImportResultRow,
  type ImportStats,
} from './useImportPipeline';

export const confidencePillClasses: Record<ImportSummary['confidence'], string> = {
  high: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
  medium: 'bg-warn/10 text-warn border border-warn/20',
  low: 'bg-red-400/10 text-red-300 border border-red-400/20',
};

const importSummaryBadgeLabels: Record<ImportSummary['confidence'], string> = {
  high: 'Import Complete',
  medium: 'Imported with Warnings',
  low: 'Needs Review',
};

export function ImportResults({
  isImporting,
  importPhase,
  importProgress,
  currentImportFile,
  statsFound,
  importSummary,
  results,
  onCancel,
}: {
  isImporting: boolean;
  importPhase: ImportPhase;
  importProgress: number;
  currentImportFile: string;
  statsFound: ImportStats;
  importSummary: ImportSummary | null;
  results: ImportResultRow[];
  onCancel: () => void;
}) {
  const importPhaseDetail = importPhase === 'reading' || importPhase === 'parsing'
    ? currentImportFile || 'Preparing files'
    : importPhase === 'saving'
      ? 'Writing results to this device'
      : 'Refreshing totals and leak status';

  const totalHandNodes = results.filter(r => r.type === 'hand' && !r.error);
  const totalSummaryNodes = results.filter(r => r.type === 'summary' && !r.error);
  const formattedImportSummary = importSummary ? formatImportSummary(importSummary) : null;

  return (
    <>
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
                  <span data-testid="import-phase">{IMPORT_PHASE_LABELS[importPhase]}</span>
                </div>
                <p className="text-[10px] text-[var(--fg-dim)] font-mono truncate max-w-[300px]">
                  {importPhaseDetail}
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
               <button
                 type="button"
                 onClick={onCancel}
                 className="rounded border border-[var(--hairline)] px-2 py-1 text-[var(--fg-muted)] transition-colors hover:border-[var(--loss-line)] hover:text-[var(--loss)]"
               >
                 Cancel import
               </button>
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
                 confidencePillClasses[importSummary.confidence],
               )}>
                 {importSummaryBadgeLabels[importSummary.confidence]}
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
    </>
  );
}
