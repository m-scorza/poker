import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { buildSpotPacketFromParsedHand } from '../../../analysis/spotPacket';
import type { ParsedHand } from '../../../parser/pokerstars';
import type { HeroDecision } from '../../../types/analysis';
import { SpotSourcePanel } from '../SpotSourcePanel';

const parsedHand: ParsedHand = {
  hand: {
    id: 'spot-ui-1',
    tournamentId: 'T-UI',
    date: new Date('2026-06-29T12:00:00Z'),
    level: 12,
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
  },
  players: [
    { handId: 'spot-ui-1', seatNumber: 1, playerName: 'VillainA', chipsBefore: 8_000, position: 'CO', isHero: false, holeCards: null },
    { handId: 'spot-ui-1', seatNumber: 2, playerName: 'VillainB', chipsBefore: 2_000, position: 'BTN', isHero: false, holeCards: null },
    { handId: 'spot-ui-1', seatNumber: 3, playerName: 'Hero', chipsBefore: 5_000, position: 'SB', isHero: true, holeCards: ['Ah', 'Kh'] },
    { handId: 'spot-ui-1', seatNumber: 4, playerName: 'VillainC', chipsBefore: 1_500, position: 'BB', isHero: false, holeCards: null },
  ],
  actions: [
    { handId: 'spot-ui-1', street: 'preflop', playerName: 'VillainA', actionType: 'raise', amount: 500, isAllIn: false, sequence: 1 },
    { handId: 'spot-ui-1', street: 'preflop', playerName: 'Hero', actionType: 'call', amount: 400, isAllIn: false, sequence: 2 },
  ],
  tournament: { id: 'T-UI', handsPlayed: 1 },
  collectedAmounts: new Map(),
  showdownWinners: new Set(),
};

const multiwayParsedHand: ParsedHand = {
  ...parsedHand,
  players: [
    { handId: 'spot-ui-1', seatNumber: 1, playerName: 'VillainA', chipsBefore: 8_000, position: 'CO', isHero: false, holeCards: null },
    { handId: 'spot-ui-1', seatNumber: 2, playerName: 'VillainB', chipsBefore: 2_000, position: 'BTN', isHero: false, holeCards: null },
    { handId: 'spot-ui-1', seatNumber: 3, playerName: 'VillainC', chipsBefore: 3_500, position: 'SB', isHero: false, holeCards: null },
    { handId: 'spot-ui-1', seatNumber: 4, playerName: 'Hero', chipsBefore: 5_000, position: 'BB', isHero: true, holeCards: ['7s', '2s'] },
  ],
  actions: [
    { handId: 'spot-ui-1', street: 'preflop', playerName: 'VillainA', actionType: 'raise', amount: 500, isAllIn: false, sequence: 1 },
    { handId: 'spot-ui-1', street: 'preflop', playerName: 'VillainB', actionType: 'call', amount: 500, isAllIn: false, sequence: 2 },
    { handId: 'spot-ui-1', street: 'preflop', playerName: 'VillainC', actionType: 'fold', amount: null, isAllIn: false, sequence: 3 },
    { handId: 'spot-ui-1', street: 'preflop', playerName: 'Hero', actionType: 'fold', amount: null, isAllIn: false, sequence: 4 },
  ],
};

const decision: HeroDecision = {
  handId: 'spot-ui-1',
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

const pkoBountyContext: NonNullable<HeroDecision['bountyContext']> = {
  tournamentType: 'progressive_ko',
  equityDrop: 9,
  heroCoversVillain: true,
  bountyRatio: 0.5,
  stageAdjustment: 'late',
  note: 'Directional BPWR estimate only.',
};

describe('SpotSourcePanel', () => {
  it('renders a no-solver study packet boundary and anonymized legal action menu', () => {
    const packet = buildSpotPacketFromParsedHand(parsedHand, decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file', parserConfidence: 'high' },
    });

    render(<SpotSourcePanel packet={packet} />);

    const panel = screen.getByRole('region', { name: /spot study packet/i });
    expect(within(panel).getByText('Study Packet')).toBeInTheDocument();
    expect(within(panel).getByText('Study packet only')).toBeInTheDocument();
    expect(within(panel).getByText('Local only')).toBeInTheDocument();
    expect(within(panel).getAllByText('Not solver-backed').length).toBeGreaterThan(0);
    expect(within(panel).getByText('Call 2 BB')).toBeInTheDocument();
    expect(within(panel).getAllByText('inferred').length).toBeGreaterThan(0);
    expect(within(panel).getByText('observed')).toBeInTheDocument();
    expect(within(panel).getByText(/Trainer scoring is not included/i)).toBeInTheDocument();

    expect(panel).not.toHaveTextContent('VillainA');
    expect(panel).not.toHaveTextContent('VillainB');
    expect(panel).not.toHaveTextContent('VillainC');
  });

  it('exposes stable selectors for browser automation and regression tests', () => {
    const packet = buildSpotPacketFromParsedHand(parsedHand, decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file', parserConfidence: 'high' },
    });

    render(<SpotSourcePanel packet={packet} />);

    expect(screen.getByTestId('spot-source-panel')).toBeInTheDocument();
    expect(screen.getByTestId('spot-source-panel-download-json')).toBeInTheDocument();
    expect(screen.getByTestId('spot-source-panel-legal-menu')).toBeInTheDocument();
    expect(screen.getByTestId('spot-source-panel-caveats')).toBeInTheDocument();
    expect(screen.getByTestId('spot-source-panel-risk-context')).toHaveTextContent('opener covers hero');
  });

  it('surfaces estimated ICM risk context without exact EV claims', () => {
    const packet = buildSpotPacketFromParsedHand(parsedHand, decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file', parserConfidence: 'high' },
    });

    render(<SpotSourcePanel packet={packet} />);

    expect(screen.getByText('ICM risk context is estimated')).toBeInTheDocument();
    expect(screen.getByText('table-stack estimate')).toBeInTheDocument();
    expect(screen.getByText('25bb')).toBeInTheDocument();
    expect(screen.getByText('opener covers hero')).toBeInTheDocument();
    expect(screen.getByText(/Exact risk premium and solver EV are not included/i)).toBeInTheDocument();
  });

  it('surfaces PKO missing-context taxonomy without solver or trainer-answer claims', () => {
    const packet = buildSpotPacketFromParsedHand(parsedHand, {
      ...decision,
      bountyContext: pkoBountyContext,
    }, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file', parserConfidence: 'high' },
    });

    render(<SpotSourcePanel packet={packet} />);

    expect(screen.getByText('Opponent bounty values are unknown')).toBeInTheDocument();
    expect(screen.getByText('Bounty/PKO coverage context is partial')).toBeInTheDocument();
    expect(screen.getByText('PKO pay-jump context is missing')).toBeInTheDocument();
    expect(screen.getAllByText('Not solver-backed').length).toBeGreaterThan(0);
    expect(screen.getByText(/answer buckets are intentionally absent/i)).toBeInTheDocument();
    expect(screen.getByText(/Exact risk premium and solver EV are not included/i)).toBeInTheDocument();
  });

  it('keeps concrete ICM payout/player caveats visible when warning chips overflow', () => {
    const packet = buildSpotPacketFromParsedHand(parsedHand, {
      ...decision,
      scenario: 'FACING_ALL_IN',
      action: 'call',
      bountyContext: pkoBountyContext,
    }, {
      target: 'hrc',
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file', parserConfidence: 'high' },
    });

    expect(packet.warnings.length).toBeGreaterThan(8);

    render(<SpotSourcePanel packet={packet} />);

    const caveats = screen.getByTestId('spot-source-panel-caveats');
    expect(caveats).toHaveTextContent('Payouts are missing');
    expect(caveats).toHaveTextContent('Players remaining is missing');
    expect(caveats).toHaveTextContent('Paid places is missing');
    expect(caveats).toHaveTextContent('Full field stack distribution is missing');
    const overflowToggle = within(caveats).getByText(/\+\d+ more/);
    fireEvent.click(overflowToggle);
    const hiddenCaveats = screen.getByTestId('spot-source-panel-hidden-caveats');
    expect(hiddenCaveats).toHaveTextContent('ICM risk context is estimated');
    expect(hiddenCaveats).toHaveTextContent('Not solver-backed');
    expect(hiddenCaveats).toHaveTextContent('Legal action menu is inferred');
    expect(hiddenCaveats).toHaveTextContent('External tool required for exact output');
    expect(caveats).not.toHaveTextContent(/EV loss|chipEV|correct answer|trainer score:/i);
  });

  it('surfaces an external-review setup checklist without solver results', () => {
    const packet = buildSpotPacketFromParsedHand(parsedHand, decision, {
      target: 'hrc',
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file', parserConfidence: 'high' },
    });

    render(<SpotSourcePanel packet={packet} />);

    const review = screen.getByTestId('spot-source-panel-external-review');
    expect(review).toHaveTextContent('External review target');
    expect(review).toHaveTextContent('HoldemResources Calculator (HRC)');
    expect(review).toHaveTextContent(packet.inputHash);
    expect(review).toHaveTextContent('payout table');
    expect(review).toHaveTextContent('range assumptions');
    expect(review).toHaveTextContent('tree configuration');
    expect(screen.getByTestId('spot-source-panel-target-hints')).toHaveTextContent('HoldemResources Calculator (HRC) / ICMIZER');
    expect(screen.getByTestId('spot-source-panel-target-hints')).toHaveTextContent('ICM/PKO/all-in preflop review');
    expect(screen.getByTestId('spot-source-panel-target-hints')).toHaveTextContent('Suggested only');
    expect(screen.getByTestId('spot-source-panel-target-hints')).toHaveTextContent('do not upload this hand');
    expect(review).toHaveTextContent('not attached');
    expect(review).toHaveTextContent(/no solver result, EV, frequency, or trainer answer is attached/i);
    expect(review).not.toHaveTextContent('VillainA');
  });

  it('surfaces suggested-only postflop target hints for selected-hand packet export', () => {
    const postflopPacket = buildSpotPacketFromParsedHand({
      ...parsedHand,
      hand: { ...parsedHand.hand, boardFlop: ['Qs', '7d', '2c'] },
      actions: [
        ...parsedHand.actions,
        { handId: 'spot-ui-1', street: 'flop', playerName: 'Hero', actionType: 'bet', amount: 600, isAllIn: false, sequence: 3 },
      ],
    }, {
      ...decision,
      icmStage: 'early',
      sawFlop: true,
      cbetOpportunity: true,
      cbetMade: true,
    }, {
      externalReview: { enabled: true },
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file', parserConfidence: 'high' },
    });

    render(<SpotSourcePanel packet={postflopPacket} />);

    const hints = screen.getByTestId('spot-source-panel-target-hints');
    expect(hints).toHaveTextContent('GTO Wizard / Postflopizer');
    expect(hints).toHaveTextContent('postflop tree/line review');
    expect(hints).toHaveTextContent('Suggested only');
    expect(hints).toHaveTextContent(/do not upload this hand/i);
    expect(hints).toHaveTextContent(/solver EV/i);
    expect(JSON.stringify(postflopPacket)).toContain('"targetHints"');
    expect(JSON.stringify(postflopPacket)).not.toContain('solverEV');
    expect(JSON.stringify(postflopPacket)).not.toContain('VillainA');
  });

  it('surfaces BB multiway defense context caveats', () => {
    const packet = buildSpotPacketFromParsedHand(multiwayParsedHand, {
      ...decision,
      position: 'BB',
      handKey: '72s',
      scenario: 'BB_VS_RAISE_MULTIWAY',
      action: 'fold',
      deviationType: null,
    }, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file', parserConfidence: 'high' },
    });

    render(<SpotSourcePanel packet={packet} />);

    expect(screen.getByText('BB multiway defense context needs review')).toBeInTheDocument();
    const preflopContext = screen.getByTestId('spot-source-panel-preflop-context');
    expect(preflopContext).toHaveTextContent('squeeze / iso review');
    expect(preflopContext).toHaveTextContent('BTN after open 2.5bb');
    expect(preflopContext).toHaveTextContent('squeeze candidate');
  });

  it('downloads sanitized SpotPacket JSON without raw hand text or villain names', async () => {
    const packet = buildSpotPacketFromParsedHand(parsedHand, decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file', parserConfidence: 'high' },
      createdAt: '2026-06-29T12:00:00.000Z',
    });
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn((_blob: Blob | MediaSource) => 'blob:spot-packet');
    const revokeObjectURL = vi.fn((_url: string) => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    try {
      render(<SpotSourcePanel packet={packet} />);

      fireEvent.click(screen.getByRole('button', { name: /download spot packet json/i }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0]![0] as Blob;
      expect(blob.type).toBe('application/json');
      const json = await blob.text();
      expect(json).toContain('"schemaVersion": "spot-packet/v1"');
      expect(json).toContain('"evidenceLabel": "study_packet_only"');
      expect(json).not.toContain('VillainA');
      expect(json).not.toContain('VillainB');
      expect(json).not.toContain('VillainC');
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:spot-packet');
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
      click.mockRestore();
    }
  });
});
