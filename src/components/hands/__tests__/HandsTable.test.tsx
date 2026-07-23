import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import type { HeroDecision } from '../../../types/analysis';
import type { Hand } from '../../../types/hand';
import { HandsTable } from '../HandsTable';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 48,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({
      index,
      key: index,
      start: index * 48,
      size: 48,
    })),
  }),
}));

const decision: HeroDecision = {
  handId: 'hand-table-1',
  position: 'BTN',
  handKey: 'AKs',
  stackBb: 32.129999999999995,
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
  icmStage: 'early',
  netProfit: 0,
};

const hand: Hand = {
  id: decision.handId,
  tournamentId: 'tourney-1',
  date: new Date('2026-07-21T12:00:00Z'),
  level: 1,
  smallBlind: 10,
  bigBlind: 20,
  ante: 0,
  maxSeats: 9,
  activePlayers: 9,
  buttonSeat: 1,
  boardFlop: null,
  boardTurn: null,
  boardRiver: null,
  totalPot: 60,
  rake: 0,
  hasShowdown: false,
  isStarred: false,
  heroChipsBefore: 640,
  heroChipsAfter: 620,
  villainDeltas: [],
};

describe('HandsTable', () => {
  it('does not expose floating-point noise in stack bb values', () => {
    const { container } = render(
      <HandsTable
        decisions={[decision]}
        handsMap={new Map([[hand.id, hand]])}
        onToggleStar={vi.fn()}
        onReplayHand={vi.fn()}
        sorting={[]}
        onSortingChange={vi.fn()}
      />
    );

    expect(screen.getByText('32.13bb')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('32.129999999999995');
  });
});
