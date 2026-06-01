import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { act } from 'react';
import type { HeroDecision } from '../../../types/analysis';
import type { Action, Hand, PlayerInHand } from '../../../types/hand';
import { HandReplay } from '../HandReplay';
import '@testing-library/jest-dom';

const storeMocks = vi.hoisted(() => ({
  getPlayersForHand: vi.fn(),
  getActionsForHand: vi.fn(),
  toggleStarHand: vi.fn(),
}));

vi.mock('../../../data/store', () => ({
  getPlayersForHand: storeMocks.getPlayersForHand,
  getActionsForHand: storeMocks.getActionsForHand,
  toggleStarHand: storeMocks.toggleStarHand,
}));

vi.mock('poker-odds-calculator', () => ({
  CardGroup: {
    fromString: vi.fn((cards: string) => cards),
  },
  OddsCalculator: {
    calculate: vi.fn(() => ({
      equities: [{ getEquity: () => 55 }],
    })),
  },
}));

const hand: Hand = {
  id: 'hand-12345678',
  tournamentId: 'tourney-1',
  date: new Date('2026-05-01T12:00:00Z'),
  level: 3,
  smallBlind: 25,
  bigBlind: 50,
  ante: 5,
  maxSeats: 9,
  activePlayers: 3,
  buttonSeat: 1,
  boardFlop: ['As', 'Kh', 'Qd'],
  boardTurn: 'Jc',
  boardRiver: 'Th',
  totalPot: 477,
  rake: 0,
  hasShowdown: true,
  isStarred: false,
  heroChipsBefore: 1600,
  heroChipsAfter: 1800,
  villainDeltas: [],
};

const players: PlayerInHand[] = [
  {
    handId: hand.id,
    seatNumber: 1,
    playerName: 'player1',
    chipsBefore: 1500,
    position: 'BTN',
    isHero: false,
    holeCards: ['2s', '3s'],
  },
  {
    handId: hand.id,
    seatNumber: 2,
    playerName: 'player2',
    chipsBefore: 1500,
    position: 'SB',
    isHero: false,
    holeCards: null,
  },
  {
    handId: hand.id,
    seatNumber: 3,
    playerName: 'scorza23',
    chipsBefore: 1600,
    position: 'BB',
    isHero: true,
    holeCards: ['Ah', 'Kd'],
  },
];

const actions: Action[] = [
  {
    handId: hand.id,
    street: 'preflop',
    playerName: 'player1',
    actionType: 'fold',
    amount: null,
    isAllIn: false,
    sequence: 1,
  },
  {
    handId: hand.id,
    street: 'preflop',
    playerName: 'player2',
    actionType: 'post_sb',
    amount: 25,
    isAllIn: false,
    sequence: 2,
  },
  {
    handId: hand.id,
    street: 'preflop',
    playerName: 'scorza23',
    actionType: 'post_bb',
    amount: 50,
    isAllIn: false,
    sequence: 3,
  },
  {
    handId: hand.id,
    street: 'flop',
    playerName: 'player2',
    actionType: 'check',
    amount: null,
    isAllIn: false,
    sequence: 4,
  },
  {
    handId: hand.id,
    street: 'flop',
    playerName: 'scorza23',
    actionType: 'bet',
    amount: 50,
    isAllIn: false,
    sequence: 5,
  },
];

const heroDecision: HeroDecision = {
  handId: hand.id,
  position: 'BB',
  handKey: 'AKo',
  stackBb: 32,
  scenario: 'BB_VS_RAISE',
  action: 'call',
  isCompliant: true,
  deviationType: null,
  sawFlop: true,
  wasPreFlopRaiser: false,
  cbetOpportunity: false,
  cbetMade: false,
  cbetHU: false,
  doubleBarrelOpportunity: false,
  doubleBarrelMade: false,
  wentToShowdown: true,
  wonAtShowdown: true,
  wonAmount: 477,
  icmStage: 'mid',
  netProfit: 200,
};

describe('HandReplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.getPlayersForHand.mockResolvedValue(players);
    storeMocks.getActionsForHand.mockResolvedValue(actions);
    storeMocks.toggleStarHand.mockResolvedValue(true);
  });

  it('loads hand details and renders the modal header', async () => {
    const onClose = vi.fn();
    const { container } = render(<HandReplay hand={hand} heroDecision={heroDecision} onClose={onClose} />);

    await waitFor(() => {
      expect(within(container).getByText('Hand #12345678')).toBeInTheDocument();
    });

    expect(within(container).getByText(/9-max \| Level 3/i)).toBeInTheDocument();
    expect(within(container).getAllByText(/Pot: 477/i).length).toBeGreaterThan(0);
  });

  it('displays hero cards and position details', async () => {
    const { container } = render(<HandReplay hand={hand} heroDecision={heroDecision} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(within(container).getAllByText('scorza23').length).toBeGreaterThan(0);
    });

    expect(within(container).getAllByText('A').length).toBeGreaterThan(0);
    expect(within(container).getAllByText('K').length).toBeGreaterThan(0);
    expect(within(container).getAllByText('BB').length).toBeGreaterThan(0);
  });

  it('toggles the starred state through the store', async () => {
    const { container } = render(<HandReplay hand={hand} heroDecision={heroDecision} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(within(container).getAllByText('scorza23').length).toBeGreaterThan(0);
    });

    const starButton = await within(container).findByRole('button', { name: /Star hand for review/i });
    await act(async () => {
      fireEvent.click(starButton);
    });

    expect(storeMocks.toggleStarHand).toHaveBeenCalledWith(hand.id);
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const { container } = render(<HandReplay hand={hand} heroDecision={heroDecision} onClose={onClose} />);

    await waitFor(() => {
      expect(within(container).getAllByText('scorza23').length).toBeGreaterThan(0);
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders preflop actions and can switch to flop actions', async () => {
    const { container } = render(<HandReplay hand={hand} heroDecision={heroDecision} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(within(container).getAllByText('player1').length).toBeGreaterThan(0);
    });

    expect(within(container).getByText('Fold')).toBeInTheDocument();

    fireEvent.click(within(container).getByRole('button', { name: 'Flop' }));

    expect(within(container).getByText('Check')).toBeInTheDocument();
    expect(within(container).getByText('Bet')).toBeInTheDocument();
    expect(within(container).getAllByText('50').length).toBeGreaterThan(0);
  });
});
