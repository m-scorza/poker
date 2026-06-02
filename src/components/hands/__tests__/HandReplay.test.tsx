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
const postflopMocks = vi.hoisted(() => ({
  analyzePostflop: vi.fn(),
}));

vi.mock('../../../data/store', () => ({
  getPlayersForHand: storeMocks.getPlayersForHand,
  getActionsForHand: storeMocks.getActionsForHand,
  toggleStarHand: storeMocks.toggleStarHand,
}));

vi.mock('../../../analysis/postflopAnalyzer', async () => {
  const actual = await vi.importActual<typeof import('../../../analysis/postflopAnalyzer')>(
    '../../../analysis/postflopAnalyzer'
  );
  return {
    ...actual,
    analyzePostflop: postflopMocks.analyzePostflop,
  };
});

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
    postflopMocks.analyzePostflop.mockReturnValue([]);
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

  it('uses imported postflop analysis instead of recomputing replay spots', async () => {
    const decisionWithStoredPostflop: HeroDecision = {
      ...heroDecision,
      postflopActions: [
        {
          spot: 'CBET_HU',
          street: 'flop',
          sizing: 0.249,
          isCorrect: true,
          note: 'Stored import-time c-bet analysis',
        },
      ],
    };
    const { container } = render(
      <HandReplay hand={hand} heroDecision={decisionWithStoredPostflop} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(within(container).getByText('Stored import-time c-bet analysis')).toBeInTheDocument();
    });

    expect(postflopMocks.analyzePostflop).not.toHaveBeenCalled();
  });

  it('surfaces bounty and final-table contexts attached to the decision', async () => {
    const decisionWithTournamentContext: HeroDecision = {
      ...heroDecision,
      bountyContext: {
        tournamentType: 'progressive_ko',
        equityDrop: 8.5,
        heroCoversVillain: true,
        bountyRatio: 1,
        stageAdjustment: 'mid',
        note: 'Moderate bounty pressure widens profitable calls.',
      },
      fakeShoveSpot: {
        handId: hand.id,
        heroPosition: 'BTN',
        heroStackBb: 11.5,
        raiseSize: 575,
        isFakeShove: true,
        opponentsRemaining: 3,
        note: 'Fake shove keeps fold equity against multi-way action.',
      },
      restealSpot: {
        handId: hand.id,
        heroPosition: 'BB',
        heroStackBb: 18,
        villainPosition: 'BTN',
        villainStackType: 'chip_leader',
        heroAction: 'resteal',
        riskPremiumEstimate: 15,
        note: 'Resteal vs chip leader with controlled risk premium.',
      },
    };
    const { container } = render(
      <HandReplay hand={hand} heroDecision={decisionWithTournamentContext} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(within(container).getByText('Tournament Context')).toBeInTheDocument();
    });

    expect(within(container).getByText('Bounty Context')).toBeInTheDocument();
    expect(within(container).getByText('Progressive KO')).toBeInTheDocument();
    expect(within(container).getByText('Hero covers target')).toBeInTheDocument();
    expect(within(container).getByText('Fake Shove Spot')).toBeInTheDocument();
    expect(within(container).getByText('Fake shove keeps fold equity against multi-way action.')).toBeInTheDocument();
    expect(within(container).getByText('Resteal Spot')).toBeInTheDocument();
    expect(within(container).getByText('Chip Leader')).toBeInTheDocument();
    expect(within(container).getByText('Resteal vs chip leader with controlled risk premium.')).toBeInTheDocument();
  });
});
