import { MemoryRouter } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArenaPage, getDisplayCards, getDrillPool, isCbetActionCorrect } from '../ArenaPage';
import { getAllHeroDecisions, getParsedHandForHandId } from '../../data/store';
import { buildStudyPacketArenaPathFromIds } from '../../analysis/studyPacketProgress';
import type { HeroDecision } from '../../types/analysis';
import type { ParsedHand } from '../../parser/pokerstars';

vi.mock('../../data/appStore', () => ({
  useAppStore: () => ({ strategyProfile: 'game_plan' }),
}));

vi.mock('../../data/store', () => ({
  getAllHeroDecisions: vi.fn(),
  getParsedHandForHandId: vi.fn(),
}));

function decision(overrides: Partial<HeroDecision> = {}): HeroDecision {
  return {
    handId: 'h1',
    position: 'CO',
    handKey: 'AKs',
    stackBb: 30,
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
    netProfit: 0,
    ...overrides,
  };
}

function parsedStudyHand(handId: string): ParsedHand {
  return {
    hand: {
      id: handId,
      tournamentId: 'T-study',
      date: new Date('2026-06-30T12:00:00.000Z'),
      level: 8,
      smallBlind: 50,
      bigBlind: 100,
      ante: 12,
      maxSeats: 6,
      activePlayers: 3,
      buttonSeat: 1,
      boardFlop: null,
      boardTurn: null,
      boardRiver: null,
      totalPot: 650,
      rake: 0,
      hasShowdown: false,
      heroChipsBefore: 2_500,
      heroChipsAfter: 2_300,
      villainDeltas: [],
      importSource: {
        site: 'pokerstars',
        fileType: 'hand_history',
        accessMethod: 'local_file',
        parserConfidence: 'high',
      },
    },
    players: [
      { handId, seatNumber: 1, playerName: 'VillainA', chipsBefore: 4_000, position: 'CO', isHero: false, holeCards: null },
      { handId, seatNumber: 2, playerName: 'Hero', chipsBefore: 2_500, position: 'SB', isHero: true, holeCards: ['Qs', 'Js'] },
      { handId, seatNumber: 3, playerName: 'VillainB', chipsBefore: 1_800, position: 'BB', isHero: false, holeCards: null },
    ],
    actions: [
      { handId, street: 'preflop', playerName: 'VillainA', actionType: 'raise', amount: 250, isAllIn: false, sequence: 1 },
      { handId, street: 'preflop', playerName: 'Hero', actionType: 'call', amount: 200, isAllIn: false, sequence: 2 },
    ],
    tournament: { id: 'T-study', handsPlayed: 1 },
    collectedAmounts: new Map(),
    showdownWinners: new Set(),
  };
}

function installMemoryStorage(): void {
  const backing = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return backing.size;
    },
    clear: () => backing.clear(),
    getItem: (key) => backing.get(key) ?? null,
    key: (index) => Array.from(backing.keys())[index] ?? null,
    removeItem: (key) => {
      backing.delete(key);
    },
    setItem: (key, value) => {
      backing.set(key, value);
    },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: memoryStorage });
}

describe('ArenaPage drill helpers', () => {
  it('filters C-bet Clinic to actual c-bet opportunities', () => {
    const cbetSpot = decision({ handId: 'cbet', cbetOpportunity: true, sawFlop: true });
    const rfiSpot = decision({ handId: 'rfi', cbetOpportunity: false });

    expect(getDrillPool('cbet_clinic', [rfiSpot, cbetSpot], 'game_plan')).toEqual([cbetSpot]);
  });

  it('grades C-bet Clinic actions from postflop flags', () => {
    const missedCbet = decision({
      cbetOpportunity: true,
      cbetMade: false,
      postflopActions: [{
        spot: 'MISSED_CBET',
        street: 'flop',
        sizing: null,
        isCorrect: false,
        note: 'Missed c-bet',
      }],
    });
    const acceptableCheck = decision({ cbetOpportunity: true, cbetMade: false, postflopActions: [] });
    const madeCbet = decision({ cbetOpportunity: true, cbetMade: true });

    expect(isCbetActionCorrect(missedCbet, 'bet')).toBe(true);
    expect(isCbetActionCorrect(missedCbet, 'check')).toBe(false);
    expect(isCbetActionCorrect(acceptableCheck, 'check')).toBe(true);
    expect(isCbetActionCorrect(madeCbet, 'bet')).toBe(true);
  });

  it('filters Study Queue drills to the requested imported hand sequence', () => {
    const requested = decision({ handId: 'srs-hand', handKey: 'QJs' });
    const second = decision({ handId: 'second-hand', handKey: 'T9s' });
    const other = decision({ handId: 'other-hand', handKey: 'AKs' });

    expect(getDrillPool('study_queue', [other, requested, second], 'game_plan', { handId: 'srs-hand' })).toEqual([requested]);
    expect(getDrillPool('study_queue', [other, requested, second], 'game_plan', { handIds: ['second-hand', 'srs-hand'] })).toEqual([second, requested]);
    expect(getDrillPool('study_queue', [other, requested], 'game_plan')).toEqual([]);
  });

  it('maps hand keys to display cards without duplicate branch logic', () => {
    expect(getDisplayCards('AA')).toEqual(['As', 'Ah']);
    expect(getDisplayCards('AKs')).toEqual(['As', 'Ks']);
    expect(getDisplayCards('AKo')).toEqual(['As', 'Kh']);
  });
});

describe('ArenaPage drill start behavior', () => {
  beforeEach(() => {
    installMemoryStorage();
    vi.mocked(getParsedHandForHandId).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('opens the shared dialog instead of window.alert when a drill has no pool', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([decision({ cbetOpportunity: false })]);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /C-bet Clinic/i }));

    expect(await screen.findByRole('dialog', { name: 'Not enough data' })).toBeInTheDocument();
    expect(screen.getByText(/No C-bet Clinic spots are available yet/i)).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('starts C-bet Clinic on flop-stage controls', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'cbet', cbetOpportunity: true, cbetMade: true, sawFlop: true }),
    ]);

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /C-bet Clinic/i }));

    await waitFor(() => expect(screen.getByText('Stage: Flop')).toBeInTheDocument());
    expect(screen.getByText('BASE')).toBeInTheDocument();
    expect(screen.queryByText('GTO')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C-bet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fold' })).not.toBeInTheDocument();
  });

  it('auto-starts an imported Study Queue hand from the Arena route query', async () => {
    window.history.pushState({}, '', '/arena?drill=study-queue&handId=srs1#study-packet-drill');
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'other', handKey: 'AKs' }),
      decision({ handId: 'srs1', handKey: 'QJs', position: 'BB', scenario: 'BB_VS_RAISE', action: 'fold' }),
    ]);

    render(<ArenaPage />);

    expect(await screen.findByTestId('arena-study-queue-source')).toHaveTextContent('Imported Study Queue packet');
    expect(screen.getByText('Study Queue spot')).toBeInTheDocument();
    expect(screen.getByText('BB_VS_RAISE'.replace('_', ' '))).toBeInTheDocument();
    expect(screen.getByText('Stage: Pre-flop')).toBeInTheDocument();
    expect(screen.getByText('STUDY')).toBeInTheDocument();
  });

  it('preserves delimiter-sensitive Study Queue hand IDs when parsing Arena routes', async () => {
    const firstHandId = 'srs,comma';
    const secondHandId = 'srs/with space';
    const route = buildStudyPacketArenaPathFromIds(
      [firstHandId, secondHandId],
      ['spot,comma', 'spot/with space'],
    );
    expect(route).toBe('/arena?drill=study-queue&handId=srs%2Ccomma&handIds=srs%2Ccomma,srs%2Fwith%20space&packetIds=spot%2Ccomma,spot%2Fwith%20space#study-packet-drill');
    window.history.pushState({}, '', route!);
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: secondHandId, handKey: 'T9s', position: 'BB', scenario: 'BB_VS_RAISE', action: 'fold' }),
      decision({ handId: firstHandId, handKey: 'QJs', position: 'SB', scenario: 'FACING_RAISE', action: 'call', openerPosition: 'CO' }),
    ]);
    vi.mocked(getParsedHandForHandId).mockImplementation(async (handId) => parsedStudyHand(handId));

    render(<ArenaPage />);

    expect(await screen.findByTestId('arena-study-queue-source')).toHaveTextContent('packet 1/2');
    expect(screen.getByText('FACING_RAISE'.replace('_', ' '))).toBeInTheDocument();
    await waitFor(() => expect(getParsedHandForHandId).toHaveBeenCalledWith(firstHandId));
  });

  it('uses the sanitized SpotPacket legal-action menu and caveats in Study Queue drills', async () => {
    window.history.pushState({}, '', '/arena?drill=study-queue&handId=packet-menu#study-packet-drill');
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'packet-menu', handKey: 'QJs', position: 'SB', scenario: 'FACING_RAISE', action: 'call', openerPosition: 'CO' }),
    ]);
    vi.mocked(getParsedHandForHandId).mockResolvedValue(parsedStudyHand('packet-menu'));

    render(<ArenaPage />);

    expect(await screen.findByTestId('arena-study-packet-menu')).toHaveTextContent('SpotPacket legal menu');
    expect(screen.getByTestId('arena-study-packet-menu')).toHaveTextContent('legal menu inferred');
    expect(screen.getByRole('button', { name: /Call 2 BB observed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All-in inferred/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /All-in inferred/i }));

    expect(await screen.findByText('REVIEW ONLY')).toBeInTheDocument();
    expect(screen.getByText(/does not grade all-in ranges/i)).toBeInTheDocument();
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });

  it('advances multi-packet Study Queue Arena sessions in route order and stores local SRS progress after prompts', async () => {
    window.history.pushState({}, '', '/arena?drill=study-queue&handId=first&handIds=first,second&packetIds=spot-first,spot-second#study-packet-drill');
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'second', handKey: 'T9s', position: 'BB', scenario: 'BB_VS_RAISE', action: 'fold' }),
      decision({ handId: 'first', handKey: 'QJs', position: 'SB', scenario: 'FACING_RAISE', action: 'call', openerPosition: 'CO' }),
    ]);
    vi.mocked(getParsedHandForHandId).mockImplementation(async (handId) => parsedStudyHand(handId));

    render(
      <MemoryRouter>
        <ArenaPage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('arena-study-queue-source')).toHaveTextContent('packet 1/2');
    expect(screen.getByText('FACING_RAISE'.replace('_', ' '))).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /All-in inferred/i }));

    const firstStored = JSON.parse(window.localStorage.getItem('poker-hermes.studyPacketProgress.v1') ?? '{}') as Record<string, Record<string, unknown>>;
    const firstEntries = Object.values(firstStored);
    expect(firstEntries).toHaveLength(1);
    expect(firstEntries[0]).toMatchObject({ handId: 'first', repetitionCount: 1, intervalDays: 1, starred: false });
    expect(firstEntries[0]?.reviewedAt).toEqual(expect.any(String));
    expect(JSON.stringify(firstStored)).not.toContain('VillainA');

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();

    await waitFor(() => expect(screen.getByTestId('arena-study-queue-source')).toHaveTextContent('packet 2/2'));
    expect(screen.getByText('BB_VS_RAISE'.replace('_', ' '))).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /All-in inferred/i }));

    const secondStored = JSON.parse(window.localStorage.getItem('poker-hermes.studyPacketProgress.v1') ?? '{}') as Record<string, Record<string, unknown>>;
    const secondEntries = Object.values(secondStored);
    expect(secondEntries).toHaveLength(2);
    expect(secondEntries.some((entry) => entry.handId === 'first')).toBe(true);
    expect(secondEntries.some((entry) => entry.handId === 'second')).toBe(true);
    expect(JSON.stringify(secondStored)).not.toContain('VillainA');
    expect(JSON.stringify(secondStored)).not.toContain('VillainB');

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();

    const completion = await screen.findByTestId('arena-study-session-complete');
    expect(completion).toHaveTextContent('Study Queue session complete');
    expect(completion).toHaveTextContent('2/2 packets reviewed');
    expect(completion).toHaveTextContent('Next local SRS repeat in 1 day');
    expect(completion).toHaveTextContent('Graded score: 0/0');
    expect(screen.getByTestId('arena-session-dashboard-link')).toHaveAttribute('href', '/');
    expect(screen.getByTestId('arena-session-hand-replay-link')).toHaveAttribute('href', '/hands?panel=spot-packet&reviewHand=second#spot-packet');
  });

  it('encodes delimiter-sensitive last-packet Hand Replay links after Study Queue completion', async () => {
    const firstHandId = 'first,with/ä';
    const secondHandId = 'second hand/ß';
    const route = buildStudyPacketArenaPathFromIds(
      [firstHandId, secondHandId],
      ['packet,with/ä', 'packet two/ß'],
    );
    window.history.pushState({}, '', route!);
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: secondHandId, handKey: 'T9s', position: 'BB', scenario: 'BB_VS_RAISE', action: 'fold' }),
      decision({ handId: firstHandId, handKey: 'QJs', position: 'SB', scenario: 'FACING_RAISE', action: 'call', openerPosition: 'CO' }),
    ]);
    vi.mocked(getParsedHandForHandId).mockImplementation(async (handId) => parsedStudyHand(handId));

    render(
      <MemoryRouter>
        <ArenaPage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('arena-study-queue-source')).toHaveTextContent('packet 1/2');
    expect(screen.getByText('FACING_RAISE'.replace('_', ' '))).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /All-in inferred/i }));
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();

    await waitFor(() => expect(screen.getByTestId('arena-study-queue-source')).toHaveTextContent('packet 2/2'));
    expect(screen.getByText('BB_VS_RAISE'.replace('_', ' '))).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /All-in inferred/i }));
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();

    expect(await screen.findByTestId('arena-study-session-complete')).toHaveTextContent('2/2 packets reviewed');
    expect(screen.getByTestId('arena-session-hand-replay-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=second%20hand%2F%C3%9F#spot-packet',
    );
  });

  it('keeps ungraded Study Queue spots review-only instead of recording a score', async () => {
    window.history.pushState({}, '', '/arena?drill=study-queue&handId=allin-review#study-packet-drill');
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'allin-review', scenario: 'FACING_ALL_IN', action: 'fold', isCompliant: false }),
    ]);

    render(<ArenaPage />);

    await screen.findByTestId('arena-study-queue-source');
    fireEvent.click(screen.getByRole('button', { name: 'Call' }));

    expect(await screen.findByText('REVIEW ONLY')).toBeInTheDocument();
    expect(screen.getByText(/no local range rule grades this exact action/i)).toBeInTheDocument();
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
  });
});
