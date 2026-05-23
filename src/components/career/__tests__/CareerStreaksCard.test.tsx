import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { CareerStreaksCard } from '../CareerStreaksCard';
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

describe('CareerStreaksCard', () => {
  it('renders streak metrics with data', () => {
    const { container } = render(<CareerStreaksCard tournaments={mockTournaments} />);
    expect(within(container).getByText('Streaks & Form')).toBeInTheDocument();
    expect(within(container).getByText('Longest Win Streak')).toBeInTheDocument();
    expect(within(container).getByText('Longest Cashless Run')).toBeInTheDocument();
  });

  it('returns null when no tournaments', () => {
    const { container } = render(<CareerStreaksCard tournaments={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
