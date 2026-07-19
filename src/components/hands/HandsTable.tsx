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
  VS3BET_OVERFOLD: 'vs 3-Bet Overfold',
  VS3BET_LOOSE_CONTINUE: 'vs 3-Bet Loose Continue',
  VS3BET_WRONG_CONTINUE: 'vs 3-Bet Wrong Continue',
  ALLIN_OVERFOLD: 'vs All-In Overfold',
  ALLIN_LOOSE_CALL: 'vs All-In Loose Call',
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
      cell: info => <span className="text-[var(--fg-muted)]">{info.getValue().slice(-8)}</span>
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
      cell: info => <span className="text-[var(--fg-dim)]">{info.getValue()}</span>
    }),
    columnHelper.accessor(row => row.d.action, {
      id: 'action',
      header: 'Action',
      cell: info => {
        const action = info.getValue();
        return (
          <span className={clsx(
            'text-xs px-1.5 py-0.5 rounded font-mono uppercase tracking-wider',
            action === 'raise' && 'bg-[var(--money-soft)] text-[var(--money)] border border-[var(--money-line)]',
            action === 'fold' && 'bg-[var(--ink-3)] text-[var(--fg-dim)] border border-[var(--hairline)]',
            action === 'call' && 'bg-[var(--sig-soft)] text-[var(--sig)] border border-[var(--sig-line)]',
            action === 'check' && 'bg-[var(--ink-3)] text-[var(--fg-dim)] border border-[var(--hairline)]',
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
            bb < 20 && 'text-[var(--loss)] font-bold',
            bb >= 20 && bb <= 40 && 'text-[var(--warn)] font-bold',
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
            <span className="whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded bg-[var(--loss-soft)] text-[var(--loss)] uppercase tracking-wider border border-[var(--loss-line)]">
              {DEVIATION_LABELS[d.deviationType] || d.deviationType}
            </span>
          );
        }
        if (d.isCompliant) {
          return (
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--money-soft)] text-[var(--money)] uppercase tracking-wider border border-[var(--money-line)]">
              COMPLIANT
            </span>
          );
        }
        return <span className="text-xs text-[var(--fg-muted)]">—</span>;
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
                  ? "bg-[var(--warn)] text-[var(--ink-1)] ring-[var(--warn)] shadow-[0_0_10px_var(--warn-soft)]"
                  : "text-[var(--fg-dim)] hover:text-[var(--warn)] ring-[var(--hairline)] hover:ring-[var(--warn-line)]"
              )}
              title={h?.isStarred ? "Featured Hand" : "Star for Review"}
              aria-label={h?.isStarred ? `Unstar hand ${d.handId}` : `Star hand ${d.handId} for review`}
            >
              <Star size={12} fill={h?.isStarred ? "currentColor" : "none"} />
            </button>
            {h && (
              <button
                onClick={() => onReplayHand(d.handId)}
                className="bg-[var(--ink-3)] hover:bg-[var(--accent)]/20 ring-1 ring-[var(--hairline)] hover:ring-[var(--accent)]/50 p-1.5 rounded-full text-[var(--fg-muted)] hover:text-[var(--accent)] transition-all"
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
      <div className="compartment border-[var(--hairline)] overflow-hidden p-8 text-center text-[var(--fg-muted)] text-sm">
        No hands found.
      </div>
    );
  }

  return (
    <div className="compartment p-0 border-[var(--hairline)] overflow-hidden flex flex-col h-[600px]">
      {/* Table Header (Fixed) */}
      <div className="flex-none overflow-hidden pr-[15px] border-b border-[var(--hairline)] bg-[var(--ink-2)]">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="text-left flex w-full">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={clsx(
                      "px-3 py-2.5 text-xs text-[var(--fg-dim)] uppercase tracking-wide",
                      header.column.getCanSort() ? "cursor-pointer hover:text-[var(--fg)]" : "",
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
                    className="border-b border-[var(--hairline)] hover:bg-[var(--ink-2)] transition-colors flex w-full absolute top-0 left-0"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      height: `${virtualRow.size}px`
                    }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className={clsx("px-3 py-2 font-mono text-xs flex items-center", cell.column.id === 'actions' ? 'flex-1 justify-end' : 'w-[12%]')}>
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
