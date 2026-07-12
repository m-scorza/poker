import { useCallback, useRef, useState } from 'react';
import {
  clearLocalHeadsUpReferenceSet,
  getLocalHeadsUpReferenceSummary,
  saveLocalHeadsUpReferenceCsv,
} from '../../data/localHeadsUpReferences';
import type { HeadsUpReferenceKind } from '../../analysis/headsUpPushFoldReference';

export function HeadsUpReferencePanel({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [localReferenceSummary, setLocalReferenceSummary] = useState(() => getLocalHeadsUpReferenceSummary());
  const [localReferenceMessage, setLocalReferenceMessage] = useState<string | null>(null);
  const pushReferenceRef = useRef<HTMLInputElement>(null);
  const callReferenceRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="mt-4 rounded-lg border border-[var(--hairline)] bg-[var(--ink-1)] p-4 text-xs">
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
  );
}
