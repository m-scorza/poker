import { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { Upload as UploadIcon } from 'lucide-react';
import { DataHealthPanel } from './DataHealthPanel';
import { HeadsUpReferencePanel } from './HeadsUpReferencePanel';
import { ImportResults } from './ImportResults';
import { useImportPipeline } from './useImportPipeline';

type ImportSourceGuideTone = 'high' | 'medium' | 'neutral' | 'blocked';

const importSourceGuideToneClasses: Record<ImportSourceGuideTone, string> = {
  high: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  medium: 'border-warn/25 bg-warn/10 text-warn',
  neutral: 'border-sky-400/25 bg-sky-400/10 text-sky-100',
  blocked: 'border-red-400/25 bg-red-400/10 text-red-100',
};

const IMPORT_SOURCE_GUIDES: Array<{
  title: string;
  status: string;
  tone: ImportSourceGuideTone;
  detail: string;
  caveat: string;
}> = [
  {
    title: 'PokerStars',
    status: 'Native parser',
    tone: 'high',
    detail: 'Import local hand-history .txt files and tournament-summary .txt files together for the cleanest MTT context.',
    caveat: 'Best confidence: hand histories plus summaries; UTF-8 BOM is supported.',
  },
  {
    title: 'GGPoker / PokerCraft',
    status: 'Caveated parser',
    tone: 'medium',
    detail: 'Import PokerCraft hand-history and summary exports from the client. The app treats GG confidence as directional until broader fixtures land.',
    caveat: 'Remember PokerCraft retention and rake/accounting caveats when reviewing ROI or exported packets.',
  },
  {
    title: 'Open Hand History JSON',
    status: 'Standard export',
    tone: 'neutral',
    detail: 'Use OHH JSON when a room or tracker can export standardized hands instead of a proprietary text format.',
    caveat: 'Good bridge for iPoker/888-style samples, but tournament summaries and payouts may still be missing.',
  },
  {
    title: 'Known unsupported rooms',
    status: 'Sample needed',
    tone: 'blocked',
    detail: 'WPN/ACR, iPoker text, 888 text, PartyPoker, Chico, and Winamax are recognized so they do not silently parse as GG.',
    caveat: 'Convert/export as OHH JSON or provide sanitized raw samples before native parser claims are added.',
  },
];

export function HandsUpload({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    isImporting,
    results,
    importProgress,
    importPhase,
    currentImportFile,
    statsFound,
    importSummary,
    processFiles,
    cancelImport,
  } = useImportPipeline({ onUploadSuccess });

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
  }, [processFiles]);

  return (
    <div className="compartment p-6" data-testid="hands-upload-root">
      <button
        type="button"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        data-testid="hands-upload-dropzone"
        className={clsx(
          'block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
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
      </button>

      <input ref={fileRef} type="file" accept=".txt,.json,.zip" multiple onChange={onFileSelect} className="hidden" />

      <section className="mt-4 rounded-lg border border-[var(--hairline)] bg-[var(--ink-1)] p-4 text-xs" aria-label="Import source guide">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-[var(--fg)]">Source-aware import guide</div>
            <div className="mt-1 max-w-2xl text-[var(--fg-muted)]">
              Pick the safest local export path first. Import source labels carry through to SpotPackets, so unsupported rooms remain study prompts instead of fake solver-ready data.
            </div>
          </div>
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-violet-100">
            Local only
          </span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {IMPORT_SOURCE_GUIDES.map((guide) => (
            <div key={guide.title} className={clsx('rounded-lg border p-3', importSourceGuideToneClasses[guide.tone])}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-data text-[11px] font-black uppercase tracking-tight text-white">{guide.title}</div>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/60">
                  {guide.status}
                </span>
              </div>
              <p className="mt-2 leading-relaxed text-white/70">{guide.detail}</p>
              <p className="mt-2 leading-relaxed text-white/45">{guide.caveat}</p>
            </div>
          ))}
        </div>
      </section>

      <DataHealthPanel onReimport={() => fileRef.current?.click()} />

      <HeadsUpReferencePanel onUploadSuccess={onUploadSuccess} />

      <ImportResults
        isImporting={isImporting}
        importPhase={importPhase}
        importProgress={importProgress}
        currentImportFile={currentImportFile}
        statsFound={statsFound}
        importSummary={importSummary}
        results={results}
        onCancel={cancelImport}
      />
    </div>
  );
}
