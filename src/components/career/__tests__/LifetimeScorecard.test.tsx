import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { LifetimeScorecard } from '../LifetimeScorecard';
import type { Tournament } from '../../../types/hand';
import type { HeroDecision } from '../../../types/analysis';
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

const mockDecisions: HeroDecision[] = [
  {
    handId: 'h1',
    position: 'BTN',
    handKey: 'AKs',
    stackBb: 40,
    scenario: 'RFI',
    action: 'raise',
    isCompliant: true,
    deviationType: null,
    sawFlop: false,
    wasPreFlopRaiser: true,
    cbetOpportunity: false,
    cbetMade: false,
    cbetHU: false,
    doubleBarrelOpportunity: false,
    doubleBarrelMade: false,
    wentToShowdown: false,
    wonAtShowdown: false,
    wonAmount: 0,
    netProfit: 0
  }
];

describe('LifetimeScorecard', () => {
  it('renders correctly with data', () => {
    const { container } = render(<LifetimeScorecard tournaments={mockTournaments} decisions={mockDecisions} />);
    expect(within(container).getByText('Efficiency Score')).toBeInTheDocument();
    expect(within(container).getByText('100')).toBeInTheDocument(); // 100% compliance
    expect(within(container).getByText('+$89')).toBeInTheDocument(); // 100 - 11 = 89 profit
  });

  it('returns null when no hands tracked', () => {
    const { container } = render(<LifetimeScorecard tournaments={[]} decisions={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
