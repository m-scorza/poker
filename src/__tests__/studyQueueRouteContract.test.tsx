/**
 * Route contract for the Study Queue / SpotPacket loop (salvaged from the
 * Hermes worktree, adapted to the "port pieces" steer: the Arena routed-drill
 * and Hand-Replay packet-handoff contracts are kept; the StudyPlanCard /
 * CoachsNote packet CTAs were not ported (dashboard demoted in #109).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import type { HeroDecision } from '../types/analysis';
import type { Action, Hand, PlayerInHand } from '../types/hand';
import type { ParsedHand } from '../parser/pokerstars';
import { ArenaPage } from '../pages/ArenaPage';
import { HandsPage } from '../pages/HandsPage';

const storeMocks = vi.hoisted(() => ({
  getAllHeroDecisions: vi.fn(),
  getParsedHandForHandId: vi.fn(),
  getPlayersForHand: vi.fn(),
  getActionsForHand: vi.fn(),
  getHands: vi.fn(),
  clearAllData: vi.fn(),
  toggleStarHand: vi.fn(),
  getTournaments: vi.fn(),
  getSrsReviews: vi.fn(),
  recordSrsReview: vi.fn(),
}));

vi.mock('../data/appStore', () => ({
  useAppStore: () => ({
    heroName: 'Hero',
    isImporting: false,
    strategyProfile: 'game_plan',
    activeSessionId: 'all',
    setImporting: vi.fn(),
    setTotalHands: vi.fn(),
    setDemoSeedProgress: vi.fn(),
  }),
}));

vi.mock('../data/store', () => ({
  getAllHeroDecisions: storeMocks.getAllHeroDecisions,
  getParsedHandForHandId: storeMocks.getParsedHandForHandId,
  getPlayersForHand: storeMocks.getPlayersForHand,
  getActionsForHand: storeMocks.getActionsForHand,
  getHands: storeMocks.getHands,
  clearAllData: storeMocks.clearAllData,
  toggleStarHand: storeMocks.toggleStarHand,
  getSrsReviews: storeMocks.getSrsReviews,
  recordSrsReview: storeMocks.recordSrsReview,
  db: {
    heroDecisions: {},
    hands: {},
    tournaments: { toArray: storeMocks.getTournaments },
    players: {},
    actions: {},
  },
}));

vi.mock('../components/hands/HandsFilters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/hands/HandsFilters')>();
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    HandsFilters: () => ReactActual.createElement('div', { 'data-testid': 'mock-hands-filters' }, 'Filters'),
  };
});

vi.mock('../components/hands/HandsTable', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    HandsTable: () => ReactActual.createElement('div', { 'data-testid': 'mock-hands-table' }, 'Hands table'),
  };
});

const STUDY_PACKET_PROGRESS_STORAGE_KEY = 'poker-hermes.studyPacketProgress.v1';

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
  if (!window.requestAnimationFrame) {
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 0),
    });
  }
}

function decision(overrides: Partial<HeroDecision> = {}): HeroDecision {
  return {
    handId: 'route-hand',
    position: 'SB',
    handKey: 'QJs',
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
    openerPosition: 'CO',
    icmStage: 'final_table',
    netProfit: -200,
    ...overrides,
  };
}

function hand(overrides: Partial<Hand> = {}): Hand {
  return {
    id: 'route-hand',
    tournamentId: 'T-route',
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
    isStarred: false,
    heroChipsBefore: 2_500,
    heroChipsAfter: 2_300,
    villainDeltas: [],
    importSource: {
      site: 'pokerstars',
      fileType: 'hand_history',
      accessMethod: 'local_file',
      parserConfidence: 'high',
    },
    ...overrides,
  };
}

function parsedStudyHand(handId = 'route-hand'): ParsedHand {
  return {
    hand: hand({ id: handId }),
    players: [
      { handId, seatNumber: 1, playerName: 'VillainA', chipsBefore: 4_000, position: 'CO', isHero: false, holeCards: null },
      { handId, seatNumber: 2, playerName: 'Hero', chipsBefore: 2_500, position: 'SB', isHero: true, holeCards: ['Qs', 'Js'] },
      { handId, seatNumber: 3, playerName: 'VillainB', chipsBefore: 1_800, position: 'BB', isHero: false, holeCards: null },
    ],
    actions: [
      { handId, street: 'preflop', playerName: 'VillainA', actionType: 'raise', amount: 250, isAllIn: false, sequence: 1 },
      { handId, street: 'preflop', playerName: 'Hero', actionType: 'call', amount: 200, isAllIn: false, sequence: 2 },
    ],
    tournament: { id: 'T-route', handsPlayed: 1 },
    collectedAmounts: new Map(),
    showdownWinners: new Set(),
  };
}

function routeReplayPlayers(handId = 'route-hand'): PlayerInHand[] {
  return [
    { handId, seatNumber: 1, playerName: 'Seat CO', chipsBefore: 4_000, position: 'CO', isHero: false, holeCards: null },
    { handId, seatNumber: 2, playerName: 'Hero', chipsBefore: 2_500, position: 'SB', isHero: true, holeCards: ['Qs', 'Js'] },
    { handId, seatNumber: 3, playerName: 'Seat BB', chipsBefore: 1_800, position: 'BB', isHero: false, holeCards: null },
  ];
}

function routeReplayActions(handId = 'route-hand'): Action[] {
  return [
    { handId, street: 'preflop', playerName: 'Seat CO', actionType: 'raise', amount: 250, isAllIn: false, sequence: 1 },
    { handId, street: 'preflop', playerName: 'Hero', actionType: 'call', amount: 200, isAllIn: false, sequence: 2 },
  ];
}

beforeEach(() => {
  installMemoryStorage();
  vi.clearAllMocks();
  storeMocks.getAllHeroDecisions.mockResolvedValue([]);
  storeMocks.getParsedHandForHandId.mockResolvedValue(null);
  storeMocks.getPlayersForHand.mockImplementation((handId: string) => Promise.resolve(routeReplayPlayers(handId)));
  storeMocks.getActionsForHand.mockImplementation((handId: string) => Promise.resolve(routeReplayActions(handId)));
  storeMocks.getHands.mockResolvedValue([]);
  storeMocks.getTournaments.mockResolvedValue([]);
  storeMocks.clearAllData.mockResolvedValue(undefined);
  storeMocks.toggleStarHand.mockResolvedValue(true);
  storeMocks.getSrsReviews.mockResolvedValue([]);
  storeMocks.recordSrsReview.mockResolvedValue(undefined);
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.pushState({}, '', '/');
  vi.useRealTimers();
});

describe('Study Queue route contract', () => {
  it('opens a routed Study Queue packet in Arena as review-only practice without score or private names', async () => {
    window.history.pushState({}, '', '/arena?drill=study-queue&handId=route-hand#study-packet-drill');
    storeMocks.getAllHeroDecisions.mockResolvedValue([decision()]);
    storeMocks.getParsedHandForHandId.mockResolvedValue(parsedStudyHand('route-hand'));

    render(
      <MemoryRouter>
        <ArenaPage />
      </MemoryRouter>,
    );

    const packetMenu = await screen.findByTestId('arena-study-packet-menu');
    expect(packetMenu).toHaveTextContent('SpotPacket legal menu');
    expect(packetMenu).toHaveTextContent('no solver EV, answer bucket, trainer score, raw hand text, or villain name is stored');
    expect(packetMenu).not.toHaveTextContent(/VillainA|VillainB/i);
    expect(screen.getByTestId('arena-study-queue-source')).toHaveTextContent('Imported Study Queue packet · study-only');

    fireEvent.click(screen.getByRole('button', { name: /All-in inferred/i }));

    expect(await screen.findByText('REVIEW ONLY')).toBeInTheDocument();
    expect(screen.getByText(/does not grade all-in ranges, solver EV, or trainer answer buckets/i)).toBeInTheDocument();
    expect(screen.getByText('0 / 0')).toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(STUDY_PACKET_PROGRESS_STORAGE_KEY) ?? '{}') as Record<string, Record<string, unknown>>;
    const entries = Object.values(stored);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ handId: 'route-hand', repetitionCount: 1, intervalDays: 1, starred: false });
    expect(JSON.stringify(stored)).not.toMatch(/VillainA|VillainB|raw hand|solver EV|trainer score/i);
  });

  it('hands off SpotPacket review routes to Hand Replay and opens Data Health as the importer fallback', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn((_blob: Blob | MediaSource) => 'blob:route-spot-packet');
    const revokeObjectURL = vi.fn((_url: string) => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    try {
      storeMocks.getAllHeroDecisions.mockResolvedValue([decision()]);
      storeMocks.getHands.mockResolvedValue([hand()]);

      render(
        <MemoryRouter initialEntries={['/hands?panel=spot-packet&reviewHand=route-hand#spot-packet']}>
          <HandsPage />
        </MemoryRouter>,
      );

      expect(await screen.findByTestId('hand-replay-dialog')).toBeInTheDocument();
      const packetReview = await screen.findByTestId('hand-replay-study-packet-review');
      expect(packetReview).toHaveTextContent('Study packet only');
      expect(packetReview).toHaveTextContent(/solver EV/i);
      expect(screen.getByTestId('spot-source-panel')).toBeInTheDocument();
      expect(screen.getByTestId('trainer-spot-card')).toBeInTheDocument();
      expect(screen.getByTestId('spot-source-panel-target-hints')).toHaveTextContent('HoldemResources Calculator (HRC) / ICMIZER');
      expect(screen.getByTestId('spot-source-panel-target-hints')).toHaveTextContent('Suggested only');
      expect(screen.getByTestId('spot-source-panel-target-hints')).toHaveTextContent('do not upload this hand');
      expect(screen.getByTestId('hand-replay-dialog')).not.toHaveTextContent(/VillainA|VillainB|EV loss|chipEV|correct answer|trainer score:/i);

      fireEvent.click(screen.getByRole('button', { name: /download spot packet json/i }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0]![0] as Blob;
      expect(blob.type).toBe('application/json');
      const json = await blob.text();
      const exported = JSON.parse(json) as {
        externalReview?: {
          targetHints?: Array<{
            reason: string;
            status: string;
            targets: string[];
          }>;
          result?: { status: string; solverBacked: boolean };
        };
        trainerPrompt?: { scoring?: { status: string } };
      };

      expect(exported.externalReview?.targetHints).toEqual(expect.arrayContaining([
        expect.objectContaining({
          reason: 'icm_pko_or_all_in_preflop',
          status: 'suggested_only',
          targets: ['hrc', 'icmizer'],
        }),
      ]));
      expect(exported.externalReview?.result).toMatchObject({ status: 'not_attached', solverBacked: false });
      expect(exported.trainerPrompt?.scoring).toMatchObject({ status: 'not_included' });
      expect(json).not.toMatch(/VillainA|VillainB|Seat CO|Seat BB|PokerStars Hand|rawHandHistory|rawHandText|C:\\\\Users|\/Users\/|OneDrive|Documentos|filename|localPath|solverEV|evChips|evBb|frequency|frequencies|trainerAnswer|correctAnswer|answerBucket|trainerScore|scoreValue/i);
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:route-spot-packet');

      cleanup();
      storeMocks.getAllHeroDecisions.mockResolvedValue([]);
      storeMocks.getHands.mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/hands?panel=data-health#data-health']}>
          <HandsPage />
        </MemoryRouter>,
      );

      expect(await screen.findByTestId('hands-upload-root')).toBeInTheDocument();
      expect(screen.getByTestId('hands-upload-data-health-entry')).toBeInTheDocument();
      expect(screen.getByTestId('import-data-health-panel')).toHaveAttribute('id', 'data-health');
      await waitFor(() => expect(screen.queryByTestId('hand-replay-dialog')).not.toBeInTheDocument());
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
      click.mockRestore();
    }
  });
});
