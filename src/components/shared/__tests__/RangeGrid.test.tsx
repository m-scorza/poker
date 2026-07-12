import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, within } from '@testing-library/react';
import { RangeGrid } from '../RangeGrid';
import '@testing-library/jest-dom';

describe('RangeGrid', () => {
  it('renders 169 cells', () => {
    const { container } = render(<RangeGrid getCellStatus={() => 'out-of-range'} />);
    expect(within(container).getAllByRole('button')).toHaveLength(169);
  });

  it('highlights selected hands', () => {
    const mockRange = new Set(['AA']);
    const { container } = render(<RangeGrid getCellStatus={(handKey) => mockRange.has(handKey) ? 'in-range' : 'out-of-range'} />);

    const aaCell = within(container).getByRole('button', { name: 'AA' });
    expect(aaCell).toHaveClass('bg-[color-mix(in_srgb,var(--accent)_26%,var(--ink-2))]');
  });

  it('clears the hovered hand when leaving a cell', () => {
    const onCellHover = vi.fn();
    const { container } = render(
      <RangeGrid getCellStatus={() => 'out-of-range'} onCellHover={onCellHover} />
    );

    const aaCell = within(container).getByRole('button', { name: 'AA' });
    fireEvent.mouseEnter(aaCell);
    fireEvent.mouseLeave(aaCell);

    expect(onCellHover).toHaveBeenNthCalledWith(1, 'AA');
    expect(onCellHover).toHaveBeenNthCalledWith(2, null);
  });
});
