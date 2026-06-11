import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
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
    expect(aaCell).toHaveClass('bg-[color-mix(in_srgb,#C9CDD6_26%,#111114)]');
  });
});
