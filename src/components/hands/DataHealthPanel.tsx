import { useState } from 'react';
import { clsx } from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { getRecentImportRuns, clearImportRuns } from '../../data/store';
import {
  CHIP_ACCOUNTING_FIX_DATE,
  IMPORT_DIAGNOSTICS_RETENTION_RUNS,
  buildImportDiagnosticsMarkdown,
  buildImportRunTimeline,
  hasPreFixImportRuns,
  summarizeDataHealth,
  type ImportConfidenceLedger,
} from '../../data/importRuns';
import { confidencePillClasses } from './ImportResults';

const confidenceBadgeClasses = {
  high: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  medium: 'border-warn/30 bg-warn/10 text-warn',
  low: 'border-red-400/30 bg-red-400/10 text-red-100',
};

const analysisPostureLabels: Record<ImportConfidenceLedger['analysisPosture'], string> = {
  empty: 'No baseline',
  ready: 'Ready',
  directional: 'Directional',
  blocked: 'Needs review',
};

function formatLedgerRate(rate: number | null): string {
  return rate === null ? 'n/a' : `${Math.round(rate * 100)}%`;
}

const formatDateTime = (date: Date | null) => date
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  : 'Never';

export function DataHealthPanel({ onReimport }: { onReimport: () => void }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showClearDiagnosticsConfirm, setShowClearDiagnosticsConfirm] = useState(false);
  const [diagnosticsMessage, setDiagnosticsMessage] = useState<string | null>(null);

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
    <div data-testid="hands-upload-data-health-entry">
      <div id="data-health" data-testid="import-data-health-panel" className="mt-4 rounded-lg border border-[var(--hairline)] bg-[var(--ink-1)] p-4 text-xs">
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
                  setShowClearDiagnosticsConfirm(true);
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
            onClick={(e) => { e.stopPropagation(); onReimport(); }}
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
                        confidencePillClasses[run.confidence],
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

      <ConfirmDialog
        isOpen={showClearDiagnosticsConfirm}
        title="Clear local import diagnostics?"
        description="Parsed hands and tournament data will stay in place; only the local import history and warnings are removed."
        confirmLabel="Clear diagnostics"
        cancelLabel="Keep them"
        onConfirm={() => {
          setShowClearDiagnosticsConfirm(false);
          void clearLocalImportDiagnostics();
        }}
        onCancel={() => setShowClearDiagnosticsConfirm(false)}
        variant="danger"
      />
    </div>
  );
}
