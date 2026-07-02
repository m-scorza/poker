import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom';
import { buildSpotPacketFromParsedHand } from '../../../analysis/spotPacket';
import type { ParsedHand } from '../../../parser/pokerstars';
import type { HeroDecision } from '../../../types/analysis';
import { TrainerSpotCard } from '../TrainerSpotCard';

const parsedHand: ParsedHand = {
  hand: {
    id: 'trainer-card-1',
    tournamentId: 'T-TRAINER',
    date: new Date('2026-06-29T13:00:00Z'),
    level: 18,
    smallBlind: 100,
    bigBlind: 200,
    ante: 25,
    maxSeats: 8,
    activePlayers: 4,
    buttonSeat: 2,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 1_350,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: 5_000,
    heroChipsAfter: 4_500,
    villainDeltas: [],
    importSource: {
      site: 'pokerstars',
      fileType: 'hand_history',
      accessMethod: 'local_file',
      parserConfidence: 'high',
    },
  },
  players: [
    { handId: 'trainer-card-1', seatNumber: 1, playerName: 'VillainA', chipsBefore: 8_000, position: 'CO', isHero: false, holeCards: null },
    { handId: 'trainer-card-1', seatNumber: 2, playerName: 'VillainB', chipsBefore: 2_000, position: 'BTN', isHero: false, holeCards: null },
    { handId: 'trainer-card-1', seatNumber: 3, playerName: 'Hero', chipsBefore: 5_000, position: 'SB', isHero: true, holeCards: ['Ah', 'Kh'] },
    { handId: 'trainer-card-1', seatNumber: 4, playerName: 'VillainC', chipsBefore: 1_500, position: 'BB', isHero: false, holeCards: null },
  ],
  actions: [
    { handId: 'trainer-card-1', street: 'preflop', playerName: 'VillainA', actionType: 'raise', amount: 500, isAllIn: false, sequence: 1 },
    { handId: 'trainer-card-1', street: 'preflop', playerName: 'VillainB', actionType: 'call', amount: 500, isAllIn: false, sequence: 2 },
    { handId: 'trainer-card-1', street: 'preflop', playerName: 'Hero', actionType: 'call', amount: 400, isAllIn: false, sequence: 3 },
  ],
  tournament: { id: 'T-TRAINER', handsPlayed: 1 },
  collectedAmounts: new Map(),
  showdownWinners: new Set(),
};

const decision: HeroDecision = {
  handId: 'trainer-card-1',
  position: 'SB',
  handKey: 'AKs',
  stackBb: 25,
  scenario: 'FACING_RAISE',
  action: 'call',
  isCompliant: false,
  deviationType: null,
  sawFlop: false,
  wasPreFlopRaiser: false,
  cbetOpportunity: false,
  cbetMade: false,
  cbetHU: false,
  doubleBarrelOpportunity: false,
  doubleBarrelMade: false,
  wentToShowdown: false,
  wonAtShowdown: false,
  wonAmount: 0,
  icmStage: 'final_table',
  openerPosition: 'CO',
  netProfit: -500,
};

describe('TrainerSpotCard', () => {
  it('renders a sanitized full decision state and legal action menu without scoring controls', () => {
    const packet = buildSpotPacketFromParsedHand(parsedHand, decision, {
      createdAt: '2026-06-29T13:00:00.000Z',
    });

    render(<TrainerSpotCard packet={packet} />);

    const card = screen.getByRole('region', { name: /trainer spot card/i });
    expect(card).toHaveAttribute('data-testid', 'trainer-spot-card');
    expect(within(card).getByText('Trainer Spot Card')).toBeInTheDocument();
    expect(within(card).getByText('Local drill prompt')).toBeInTheDocument();
    expect(within(card).getByText('No trainer scoring')).toBeInTheDocument();
    expect(screen.getByTestId('trainer-spot-card-source')).toHaveTextContent('pokerstars / high');

    const stateGrid = screen.getByTestId('trainer-spot-card-state-grid');
    expect(stateGrid).toHaveTextContent('AKs · SB · 25bb');
    expect(stateGrid).toHaveTextContent('FACING RAISE');
    expect(stateGrid).toHaveTextContent('6.8bb');
    expect(screen.getByTestId('trainer-spot-card-seat-map')).toHaveTextContent('Hero · SB · 25bb');

    const actionPath = screen.getByTestId('trainer-spot-card-action-path');
    expect(actionPath).toHaveTextContent('CO raise 2.5bb');
    expect(actionPath).toHaveTextContent('BTN call 2.5bb');
    expect(actionPath).toHaveTextContent('Hero SB call 2bb');

    const legalActions = screen.getByTestId('trainer-spot-card-legal-actions');
    expect(legalActions).toHaveTextContent('Fold');
    expect(legalActions).toHaveTextContent('Call 2 BB');
    expect(legalActions).toHaveTextContent('Raise');
    expect(screen.getByTestId('trainer-spot-action-call-2bb')).toBeInTheDocument();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(card).toHaveTextContent(/No answer button is wired/i);

    expect(card).not.toHaveTextContent('VillainA');
    expect(card).not.toHaveTextContent('VillainB');
    expect(card).not.toHaveTextContent('VillainC');
  });

  it('truncates long preflop action paths without dropping the packet boundary', () => {
    const packet = buildSpotPacketFromParsedHand(parsedHand, decision, {
      createdAt: '2026-06-29T13:00:00.000Z',
    });

    render(<TrainerSpotCard packet={packet} maxActionPathItems={1} />);

    expect(screen.getByTestId('trainer-spot-card-action-path')).toHaveTextContent('+2 more');
    expect(screen.getByText('study packet only')).toBeInTheDocument();
  });
});
