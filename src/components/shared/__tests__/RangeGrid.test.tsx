import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RangeGrid } from '../RangeGrid';
import '@testing-library/jest-dom';

describe('RangeGrid', () => {
  it('renders 169 cells', () => {
    render(<RangeGrid getCellStatus={() => 'out-of-range'} />);
    expect(screen.getAllByRole('button')).toHaveLength(169);
  });

  it('highlights selected hands', () => {
    const mockRange = new Set(['AA']);
    render(<RangeGrid getCellStatus={(handKey) => mockRange.has(handKey) ? 'in-range' : 'out-of-range'} />);

    const aaCell = screen.getByRole('button', { name: 'AA' });
    expect(aaCell).toHaveClass('bg-[var(--color-range-in)]');
  });
});
