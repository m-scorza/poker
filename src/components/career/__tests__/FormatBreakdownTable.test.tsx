import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { FormatBreakdownTable } from '../FormatBreakdownTable';
import type { Tournament } from '../../../types/hand';
import '@testing-library/jest-dom';

const mockTournaments: Tournament[] = [
  {
    id: '1',
    buyIn: 10,
    fee: 1,
    format: 'MTT',
    finishPosition: 1,
    prize: 100,
    bounty: 0,
    handsPlayed: 50,
    startDate: new Date('2024-01-01')
  }
];

describe('FormatBreakdownTable', () => {
  it('renders a row per played format', () => {
    const { container } = render(<FormatBreakdownTable tournaments={mockTournaments} />);
    expect(within(container).getByText('Format Breakdown')).toBeInTheDocument();
    expect(within(container).getByText('MTT')).toBeInTheDocument();
  });

  it('returns null when no tournaments', () => {
    const { container } = render(<FormatBreakdownTable tournaments={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
