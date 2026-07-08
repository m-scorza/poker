import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export const dossierClasses = {
  wrap: 'bk-dossier',
  table: 'bk-dossier-table',
  headRow: 'bk-dossier-head',
  headCell: 'bk-dossier-th',
  numeric: 'bk-dossier-num',
  sortButton: 'bk-dossier-sortbtn',
  sortTick: 'bk-dossier-sort',
  row: 'bk-dossier-row',
  cell: 'bk-dossier-td',
} as const;

export type SortDirection = 'asc' | 'desc';

export interface DossierSort {
  columnId: string;
  direction: SortDirection;
}

export interface DossierColumn<T> {
  id: string;
  header: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
  sortable?: boolean;
  width?: string;
}

export interface DossierTableProps<T> {
  columns: DossierColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: DossierSort | null;
  onSort?: (columnId: string) => void;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
}

function sortTick(active: boolean, direction: SortDirection): string {
  if (!active) return '';
  return direction === 'asc' ? '▲' : '▼';
}

export function DossierTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  onRowClick,
  emptyLabel = 'Nothing filed.',
}: DossierTableProps<T>) {
  return (
    <div className={dossierClasses.wrap}>
      <table className={dossierClasses.table}>
        <thead>
          <tr className={dossierClasses.headRow}>
            {columns.map((col) => {
              const active = sort?.columnId === col.id;
              return (
                <th
                  key={col.id}
                  scope="col"
                  className={clsx(dossierClasses.headCell, col.numeric && dossierClasses.numeric)}
                  style={col.width ? { width: col.width } : undefined}
                  aria-sort={
                    active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      className={dossierClasses.sortButton}
                      onClick={() => onSort(col.id)}
                    >
                      {col.header}
                      <span
                        className={clsx(dossierClasses.sortTick, active && 'is-active')}
                        aria-hidden="true"
                      >
                        {sortTick(active, sort?.direction ?? 'asc')}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className={dossierClasses.row}>
              <td className={dossierClasses.cell} colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={dossierClasses.row}
                data-clickable={onRowClick ? '' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={clsx(dossierClasses.cell, col.numeric && dossierClasses.numeric)}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
