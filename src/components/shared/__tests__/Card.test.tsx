import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { PokerCard } from '../Card';
import '@testing-library/jest-dom';

describe('PokerCard', () => {
  it('renders rank and suit correctly', () => {
    const { container } = render(<PokerCard card="Ah" />);
    expect(within(container).getByText('A')).toBeInTheDocument();
    expect(within(container).getByText('♥')).toBeInTheDocument();
  });

  it('applies red color for hearts', () => {
    const { container } = render(<PokerCard card="Ah" />);
    expect(container.firstChild).toHaveClass('text-heart');
  });

  it('renders back of card correctly', () => {
    const { container } = render(<PokerCard card="back" />);
    expect(container.firstChild).toHaveClass('bg-slate-800');
  });
});
