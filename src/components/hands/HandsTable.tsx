import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type OnChangeFn,
  type SortingState
} from '@tanstack/react-table';
import { clsx } from 'clsx';
import { Eye, Star, ChevronUp, ChevronDown } from 'lucide-react';
import type { Hand } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';

export interface HandsTableProps {
  decisions: HeroDecision[];
  handsMap: Map<string, Hand>;
  onToggleStar: (handId: string) => void;
  onReplayHand: (handId: string) => void;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}

const columnHelper = createColumnHelper<{ d: HeroDecision; h: Hand | undefined }>();

const DEVIATION_LABELS: Record<string, string> = {
  OVERFOLD: 'Overfold',
  OPENED_OUT_OF_RANGE: 'Out of Range',
  LIMPED: 'Limp',
  SB_OVERFOLD: 'SB Overfold',
  SB_LIMPED: 'SB Limp',
  SB_OUT_OF_RANGE: 'SB Out of Range',
  COLD_CALL: 'Cold Call',
  BB_FOLD_SUITED: 'BB Fold Suited',
  SB_COLD_CALL: 'SB Cold Call',
  FOLD_VS_LIMP: 'Fold vs Limp',
  LIMP_BEHIND: 'Limp Behind',
  HU_BTN_FOLD: 'HU BTN Fold',
};

function formatTableDate(date: Date | undefined): string {
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

export function HandsTable({
  decisions,
  handsMap,
  onToggleStar,
  onReplayHand,
  sorting,
  onSortingChange
}: HandsTableProps) {
  const data = useMemo(() => {
    return decisions.map(d => ({ d, h: handsMap.get(d.handId) }));
  }, [decisions, handsMap]);

  const columns = useMemo(() => [
    columnHelper.accessor(row => row.h?.date.getTime() ?? 0, {
      id: 'date',
      header: 'Date',
      cell: info => {
        const h = info.row.original.h;
        return (
          <span className="whitespace-nowrap text-[11px]">
            {formatTableDate(h?.date)}
          </span>
        );
      }
    }),
    columnHelper.accessor(row => row.d.handId, {
      id: 'handId',
      header: 'Hand ID',
      cell: info => <span className="text-[var(--color-text-muted)]">{info.getValue().slice(-8)}</span>
    }),
    columnHelper.accessor(row => row.d.position, {
      id: 'position',
      header: 'Position',
      cell: info => <span className="text-blue-400 font-bold">{info.getValue()}</span>
    }),
    columnHelper.accessor(row => row.d.handKey, {
      id: 'handKey',
      header: 'Hand',
      cell: info => <span className="font-bold tracking-wider">{info.getValue()}</span>
    }),
    columnHelper.accessor(row => row.d.scenario, {
      id: 'scenario',
      header: 'Scenario',
      cell: info => <span className="text-[var(--color-text-dim)]">{info.getValue()}</span>
    }),
    columnHelper.accessor(row => row.d.action, {
      id: 'action',
      header: 'Action',
      cell: info => {
        const action = info.getValue();
        return (
          <span className={clsx(
            'text-xs px-1.5 py-0.5 rounded font-data uppercase tracking-wider',
            action === 'raise' && 'bg-emerald-900/40 text-[var(--color-accent)] border border-[var(--color-accent)]/20',
            action === 'fold' && 'bg-gray-800 text-[var(--color-text-dim)] border border-gray-700',
            action === 'call' && 'bg-blue-900/40 text-[var(--color-info)] border border-[var(--color-info)]/20',
            action === 'check' && 'bg-gray-800 text-[var(--color-text-dim)] border border-gray-700',
          )}>
            {action}
          </span>
        );
      }
    }),
    columnHelper.accessor(row => row.d.stackBb, {
      id: 'stack',
      header: 'Stack',
      cell: info => {
        const bb = info.getValue();
        return (
          <span className={clsx(
            bb < 20 && 'text-[var(--color-danger)] font-bold',
            bb >= 20 && bb <= 40 && 'text-[var(--color-warning)] font-bold',
          )}>
            {bb.toFixed(0)}bb
          </span>
        );
      }
    }),
    columnHelper.display({
      id: 'review',
      header: 'Review',
      cell: info => {
        const d = info.row.original.d;
        if (d.deviationType) {
          return (
            <span className="whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded bg-red-900/30 text-[var(--color-danger)] uppercase tracking-wider border border-[var(--color-danger)]/30">
              {DEVIATION_LABELS[d.deviationType] || d.deviationType}
            </span>
          );
        }
        if (d.isCompliant) {
          return (
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-900/30 text-[var(--color-accent)] uppercase tracking-wider border border-[var(--color-accent)]/30">
              COMPLIANT
            </span>
          );
        }
        return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: info => {
        const { d, h } = info.row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onToggleStar(d.handId)}
              className={clsx(
                  "p-1.5 rounded-full transition-all ring-1",
                  h?.isStarred
                  ? "bg-amber-400 text-black ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                  : "text-[var(--color-text-dim)] hover:text-amber-400 ring-white/5 hover:ring-amber-400/50"
              )}
              title={h?.isStarred ? "Featured Hand" : "Star for Review"}
              aria-label={h?.isStarred ? `Unstar hand ${d.handId}` : `Star hand ${d.handId} for review`}
            >
              <Star size={12} fill={h?.isStarred ? "currentColor" : "none"} />
            </button>
            {h && (
              <button
                onClick={() => onReplayHand(d.handId)}
                className="bg-white/5 hover:bg-[var(--color-accent)]/20 ring-1 ring-white/5 hover:ring-[var(--color-accent)]/50 p-1.5 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all"
                title="In-depth analysis"
                aria-label={`Open in-depth analysis for hand ${d.handId}`}
              >
                <Eye size={12} />
              </button>
            )}
          </div>
        );
      }
    })
  ], [onReplayHand, onToggleStar]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 20,
  });

  if (data.length === 0) {
    return (
      <div className="glass-card border border-[var(--color-border)] rounded-xl overflow-hidden p-8 text-center text-[var(--color-text-muted)] text-sm">
        No hands found.
      </div>
    );
  }

  return (
    <div className="glass-card border border-[var(--color-border)] rounded-xl overflow-hidden flex flex-col h-[600px]">
      {/* Table Header (Fixed) */}
      <div className="flex-none overflow-hidden pr-[15px] border-b border-[var(--color-border)] bg-[var(--color-bg-hover)]">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="text-left flex w-full">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={clsx(
                      "px-3 py-2.5 text-xs text-[var(--color-text-dim)] uppercase tracking-wide",
                      header.column.getCanSort() ? "cursor-pointer hover:text-[var(--color-text)]" : "",
                      header.id === 'actions' ? 'flex-1 text-right' : 'w-[12%]'
                    )}
                  >
                    <span className="flex items-center gap-1 justify-start">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ChevronUp size={12} />,
                        desc: <ChevronDown size={12} />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        </table>
      </div>

      {/* Table Body (Virtual) */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          <table className="w-full text-sm absolute top-0 left-0">
            <tbody>
              {virtualizer.getVirtualItems().map(virtualRow => {
                const row = rows[virtualRow.index]!;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-hover)] transition-colors flex w-full absolute top-0 left-0"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`
                    }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className={clsx("px-3 py-2 font-data text-xs flex items-center", cell.column.id === 'actions' ? 'flex-1 justify-end' : 'w-[12%]')}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
