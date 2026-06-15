/**
 * 13x13 range grid (GTO Wizard style).
 *
 * Rows = first card rank (A..2), Columns = second card rank (A..2).
 * Diagonal = pairs, above = suited, below = offsuit.
 */

import { clsx } from 'clsx';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export type CellStatus = 'in-range' | 'out-of-range' | 'played-correct' | 'played-deviation' | 'not-dealt';

interface RangeGridProps {
  /** Returns the status for a given hand key */
  getCellStatus: (handKey: string) => CellStatus;
  /** Optional click handler */
  onCellClick?: (handKey: string) => void;
  /** Optional hover handlers */
  onCellHover?: (handKey: string | null) => void;
}

function getHandKey(row: number, col: number): string {
  const r1 = RANKS[row]!;
  const r2 = RANKS[col]!;
  if (row === col) return r1 + r2;
  if (row < col) return r1 + r2 + 's'; // Above diagonal = suited
  return r2 + r1 + 'o'; // Below diagonal = offsuit (higher rank first)
}

const STATUS_CLASSES: Record<CellStatus, string> = {
  'in-range': 'bg-[color-mix(in_srgb,#C9CDD6_26%,#111114)] border-[var(--accent-line)]',
  'out-of-range': 'bg-white/[0.015] border-transparent',
  'played-correct': 'bg-[var(--money-soft)] border-[var(--money-line)]',
  'played-deviation': 'bg-[var(--loss-soft)] border-[var(--loss)]',
  'not-dealt': 'bg-white/[0.015] border-transparent opacity-50',
};

export function RangeGrid({ getCellStatus, onCellClick, onCellHover }: RangeGridProps) {
  return (
    <div 
      className="inline-grid gap-[2px]" 
      style={{ gridTemplateColumns: `repeat(13, 1fr)` }}
    >
      {RANKS.map((_, row) =>
        RANKS.map((_, col) => {
          const handKey = getHandKey(row, col);
          const status = getCellStatus(handKey);

          return (
            <button
              key={handKey}
              onClick={() => onCellClick?.(handKey)}
              onMouseEnter={() => onCellHover?.(handKey)}
              onMouseLeave={() => onCellHover?.(null)}
              className={clsx(
                'w-10 h-8 text-[10px] font-data font-medium border rounded-sm',
                'transition-colors hover:brightness-125 cursor-pointer',
                STATUS_CLASSES[status],
              )}
            >
              {handKey}
            </button>
          );
        }),
      )}
    </div>
  );
}
