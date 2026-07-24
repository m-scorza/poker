import { MemoryRouter } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArenaPage } from '../ArenaPage';
import { getDrillPool, isCbetActionCorrect } from '../arena/drillPool';
import { getDisplayCards } from '../arena/actionOptions';
import { STARTER_DIAGNOSTIC_PACK, curriculumSpotBadge, curriculumSpotStage } from '../arena/curriculumSeeds';
import { CURRICULUM_SEED_PACKS } from '../../data/curriculumSeedPacks.generated';
import { getAllHeroDecisions, getParsedHandForHandId, getSrsReviews, recordSrsReview } from '../../data/store';
import { STARTER_DIAGNOSTIC_STORAGE_KEY } from '../../data/starterDiagnostic';
import { CURRICULUM_PROGRESS_STORAGE_KEY } from '../../data/curriculumProgress';
import { STUDY_PACKET_PROGRESS_STORAGE_KEY, buildStudyPacketArenaPathFromIds } from '../../analysis/studyPacketProgress';
import type { HeroDecision } from '../../types/analysis';
import type { ParsedHand } from '../../parser/pokerstars';

vi.mock('../../data/appStore', () => ({
  useAppStore: () => ({ strategyProfile: 'game_plan' }),
}));

vi.mock('../../data/store', () => ({
  getAllHeroDecisions: vi.fn(),
  getParsedHandForHandId: vi.fn(),
  getSrsReviews: vi.fn(() => Promise.resolve([])),
  recordSrsReview: vi.fn(() => Promise.resolve()),
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

  it('draws the starter diagnostic from every curriculum category, not just the first packs', () => {
    const sourceSlugs = new Set(
      STARTER_DIAGNOSTIC_PACK.spots.map(
        (spot) => CURRICULUM_SEED_PACKS.find((pack) => pack.spots.some((s) => s.id === spot.id))!.slug,
      ),
    );
    // Every pack contributes exactly once -> no category silently dropped.
    expect(sourceSlugs.size).toBe(CURRICULUM_SEED_PACKS.length);
    expect(sourceSlugs.has('open-raise-fundamentals')).toBe(true); // RFI fundamentals
    expect(sourceSlugs.has('versus-bb-cbet')).toBe(true); // a postflop pack
  });

  it('badges curriculum spots by their source-pack stage, incl. postflop seeds inside the starter diagnostic', () => {
    const postflopPack = CURRICULUM_SEED_PACKS.find((pack) => pack.slug === 'in-position-cbet-vs-bb')!;
    const preflopPack = CURRICULUM_SEED_PACKS.find((pack) => pack.slug === 'open-raise-fundamentals')!;

    expect(curriculumSpotStage(postflopPack.spots[0])).toBe('postflop');
    expect(curriculumSpotBadge(postflopPack.spots[0])).toBe('Postflop');
    expect(curriculumSpotStage(preflopPack.spots[0])).toBe('preflop');

    // A postflop seed pulled into the starter diagnostic keeps its postflop badge
    // instead of falling through to the wrapper's preflop default.
    const starterPostflopSpot = STARTER_DIAGNOSTIC_PACK.spots.find((spot) => curriculumSpotStage(spot) === 'postflop');
    expect(starterPostflopSpot).toBeDefined();
    expect(curriculumSpotBadge(starterPostflopSpot!)).toBe('Postflop');
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

  it('starts a curriculum seed pack as practice-only content without imported hands', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([]);

    render(<ArenaPage />);

    expect(await screen.findByText('Curriculum drills')).toBeInTheDocument();
    expect(screen.getByText('Preflop foundations')).toBeInTheDocument();
    expect(screen.getByText('Blind defense')).toBeInTheDocument();
    expect(screen.getByText('Postflop play')).toBeInTheDocument();
    expect(screen.getByText('Facing 3-bet frontier')).toBeInTheDocument();
    expect(screen.getByText('Versus open raise')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Start Facing 3-bet frontier/i }));

    expect(await screen.findByTestId('arena-curriculum-source')).toHaveTextContent('Curriculum practice');
    expect(screen.getAllByText(/practice-only seed/i).length).toBeGreaterThan(0);
    expect(screen.getByText('FACING 3BET')).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId(/^arena-action-/)[0]!);

    expect(await screen.findByText(/Curriculum answer:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/not imported-hand evidence/i).length).toBeGreaterThan(0);

    const stored = JSON.parse(window.localStorage.getItem(CURRICULUM_PROGRESS_STORAGE_KEY) ?? '{}') as Record<string, Record<string, unknown>>;
    const progress = stored['facing-3bet-frontier'];
    expect(progress).toMatchObject({
      packSlug: 'facing-3bet-frontier',
      attempts: 1,
      totalSpots: 25,
      isComplete: false,
    });
    expect(progress!.reviewedSpotIds).toEqual([expect.stringContaining('facing-3bet-frontier')]);
    expect(JSON.stringify(progress)).not.toContain('Villain');
    expect(JSON.stringify(progress)).not.toContain('trainer answer');
  });

  it('renders board context on postflop curriculum drills', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([]);

    render(<ArenaPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Start In-position c-bet vs BB/i }));

    const board = await screen.findByTestId('arena-curriculum-board');
    expect(within(board).getByText(/Villain:/)).toBeInTheDocument();
    expect(await screen.findByText('Stage: Postflop')).toBeInTheDocument();
    expect(screen.getAllByText(/practice-only seed/i).length).toBeGreaterThan(0);
  });

  it('starts a board-aware postflop deal-from-range pack', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([]);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<ArenaPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Start 3-bet pot: BTN vs SB - Flop (40bb) - Variant 1' }));

    const board = await screen.findByTestId('arena-curriculum-board');
    expect(within(board).getByText('Villain: SB')).toBeInTheDocument();
    expect(within(board).getByText(/preflop: BTN raises 2\.3bb, SB raises 8\.6bb; flop: SB checks/i)).toBeInTheDocument();
    expect(screen.getByText('Stage: Postflop')).toBeInTheDocument();
    expect(screen.getByTestId('arena-action-bet_25pct')).toBeInTheDocument();
    expect(screen.getByTestId('arena-action-bet_50pct')).toBeInTheDocument();
    expect(screen.getByTestId('arena-action-check')).toBeInTheDocument();
  });

  it('shows browser-local curriculum pack progress on Drills cards', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([]);
    window.localStorage.setItem(CURRICULUM_PROGRESS_STORAGE_KEY, JSON.stringify({
      'facing-3bet-frontier': {
        packSlug: 'facing-3bet-frontier',
        reviewedSpotIds: ['facing-3bet-frontier-0', 'facing-3bet-frontier-1'],
        attempts: 2,
        correct: 1,
        totalSpots: 25,
        isComplete: false,
        updatedAt: '2026-07-05T15:00:00.000Z',
      },
    }));

    render(<ArenaPage />);

    const card = await screen.findByRole('button', { name: /Start Facing 3-bet frontier/i });
    expect(card).toHaveTextContent('2/25 locally reviewed');
    expect(card).toHaveTextContent('1/2 seed answers');
    expect(card).toHaveTextContent('browser-local progress');
  });

  it('offers a starter diagnostic when no imported hands exist', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([]);

    render(<ArenaPage />);

    expect(await screen.findByText('No hand history yet?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Start starter diagnostic/i }));

    expect(await screen.findByTestId('arena-curriculum-source')).toHaveTextContent('Starter diagnostic');
    expect(screen.getByText(/lower-confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/not leak grading/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId(/^arena-action-/)[0]!);
    const stored = JSON.parse(window.localStorage.getItem(STARTER_DIAGNOSTIC_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(stored.packTitle).toBe('Starter diagnostic');
    expect(stored.total).toBe(1);
    expect(stored.reviewAreas).toEqual([{ label: 'Big blind defense', misses: 1, attempts: 1 }]);
    expect(stored.recommendedPackTitle).toBe('Big blind defense');
  });

  it('spotlights the starter diagnostic recommended pack without mixing it into imported evidence', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([]);
    window.localStorage.setItem(STARTER_DIAGNOSTIC_STORAGE_KEY, JSON.stringify({
      packTitle: 'Starter diagnostic',
      correct: 5,
      total: 8,
      isComplete: true,
      updatedAt: '2026-07-05T13:00:00.000Z',
      reviewAreas: [{ label: 'Versus open raise', misses: 2, attempts: 3 }],
      recommendedPackTitle: 'Versus open raise',
    }));

    render(<ArenaPage />);

    const recommendation = await screen.findByTestId('arena-diagnostic-recommendation');
    expect(recommendation).toHaveTextContent('Recommended next');
    expect(recommendation).toHaveTextContent('Versus open raise');
    expect(recommendation).toHaveTextContent('2 misses across 3 diagnostic spots');
    expect(recommendation).toHaveTextContent('not imported-hand evidence');

    fireEvent.click(screen.getByRole('button', { name: /Start recommended Versus open raise/i }));

    expect(await screen.findByTestId('arena-curriculum-source')).toHaveTextContent('Versus open raise');
    expect(screen.getAllByText(/practice-only seed/i).length).toBeGreaterThan(0);
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

  it('drills spaced review from real misplays: counts, persistence, completion', async () => {
    // A UTG 72o open is out of range -> a graded fault, never reviewed before.
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'f1', position: 'UTG', handKey: '72o', action: 'raise', stackBb: 30 }),
    ]);
    vi.mocked(getSrsReviews).mockResolvedValue([]);

    render(<ArenaPage />);

    // The Spaced Review card surfaces it as one "new" pattern, nothing due.
    const newLabel = await screen.findByText('New');
    expect(newLabel.previousElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Due').previousElementSibling).toHaveTextContent('0');

    // Start the review and answer the single card. Folding a 72o open is correct.
    fireEvent.click(screen.getByText(/Drill your real mistakes/i).closest('button')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Fold' }));

    // The outcome is persisted against the abstract pattern key.
    expect(recordSrsReview).toHaveBeenCalledWith('RFI|UTG|72o|ge10|-', true);

    // It was the last card, so the session completes after the advance delay.
    expect(
      await screen.findByText('Session complete.', undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it('requeues a lapsed spaced-review card so it reappears within the same session', async () => {
    // Same single 72o UTG fault, but answered WRONG (raising an out-of-range open).
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'f1', position: 'UTG', handKey: '72o', action: 'raise', stackBb: 30 }),
    ]);
    vi.mocked(getSrsReviews).mockResolvedValue([]);

    render(<ArenaPage />);

    fireEvent.click((await screen.findByText(/Drill your real mistakes/i)).closest('button')!);
    const raiseButton = await screen.findByRole('button', { name: 'Raise' });

    vi.useFakeTimers();
    fireEvent.click(raiseButton);

    // The miss is graded and persisted as a lapse.
    expect(recordSrsReview).toHaveBeenCalledWith('RFI|UTG|72o|ge10|-', false);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();

    // A compliant single-card session would end here; instead the lapse was
    // requeued, so the drill stays active and the card returns as review 2 of 2.
    expect(screen.queryByText('Session complete.')).not.toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Raise' })).toBeInTheDocument();
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
    expect(screen.getByTestId('arena-session-coach-link')).toHaveAttribute('href', '/');
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

  it('surfaces SRS-due imported packets and starts the most overdue one the scheduler selects', async () => {
    // Two reviewed packets in browser-local progress: hand-b is past its SRS
    // date (due), hand-a's next repeat is far in the future (not due). Both hands
    // still exist in the Arena decision store.
    window.localStorage.setItem(STUDY_PACKET_PROGRESS_STORAGE_KEY, JSON.stringify({
      'spot-a': {
        packetId: 'spot-a', handId: 'hand-a',
        reviewedAt: '2026-07-08T12:00:00.000Z', nextDueAt: '2099-01-01T00:00:00.000Z',
        repetitionCount: 1, intervalDays: 30, starred: false, updatedAt: '2026-07-08T12:00:00.000Z',
      },
      'spot-b': {
        packetId: 'spot-b', handId: 'hand-b',
        reviewedAt: '2026-06-01T12:00:00.000Z', nextDueAt: '2026-06-02T12:00:00.000Z',
        repetitionCount: 1, intervalDays: 1, starred: false, updatedAt: '2026-06-01T12:00:00.000Z',
      },
    }));
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'hand-a', handKey: 'AKs', scenario: 'RFI' }),
      decision({ handId: 'hand-b', handKey: 'QJs', position: 'BB', scenario: 'BB_VS_RAISE', action: 'fold' }),
    ]);

    render(<ArenaPage />);

    const cta = await screen.findByTestId('arena-study-due-cta');
    expect(cta).toHaveTextContent('due for review');
    // isStudyPacketSrsDue gates the count: only hand-b is due.
    expect(within(cta).getByText('Due').previousElementSibling).toHaveTextContent('1');

    fireEvent.click(cta);

    // buildStudyPacketArenaPath + selectNextActionableStudyPacket routed to the
    // due hand-b spot, not the not-yet-due hand-a spot.
    expect(await screen.findByTestId('arena-study-queue-source')).toBeInTheDocument();
    expect(screen.getByText('BB_VS_RAISE'.replace('_', ' '))).toBeInTheDocument();
    expect(screen.queryByText('RFI')).not.toBeInTheDocument();
  });

  it('fault_fixer grades a compliant fold as correct and advances to a new pool spot', async () => {
    // Both spots are out-of-range opens, so both land in the fault_fixer pool.
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'f1', position: 'UTG', handKey: '72o', scenario: 'RFI', action: 'raise', stackBb: 30, isCompliant: false }),
      decision({ handId: 'f2', position: 'CO', handKey: '32o', scenario: 'RFI', action: 'raise', stackBb: 30, isCompliant: false }),
    ]);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Fault Fixer/i }));

    expect(await screen.findByText('UTG')).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Fold' }));

    expect(screen.getByText('CORRECT')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();

    randomSpy.mockReturnValue(0.9);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();

    await waitFor(() => expect(screen.getByText('CO')).toBeInTheDocument());
  });

  it('fault_fixer flags an out-of-range raise as a deviation naming the correct action', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'f1', position: 'UTG', handKey: '72o', scenario: 'RFI', action: 'raise', stackBb: 30, isCompliant: false }),
    ]);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Fault Fixer/i }));
    expect(await screen.findByText('UTG')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));

    expect(await screen.findByText('DEVIATION')).toBeInTheDocument();
    expect(screen.getByText(/prefers FOLD/i)).toBeInTheDocument();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
  });

  it('rfi_master grades a compliant open as correct and advances to a new pool spot', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'r1', position: 'UTG', handKey: 'AKs', scenario: 'RFI', action: 'raise', stackBb: 30, isCompliant: true }),
      decision({ handId: 'r2', position: 'SB', handKey: 'AKs', scenario: 'BLIND_WAR', action: 'raise', stackBb: 30, isCompliant: true }),
    ]);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /RFI Master/i }));

    expect(await screen.findByText('UTG')).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));

    expect(screen.getByText('CORRECT')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();

    randomSpy.mockReturnValue(0.9);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();

    await waitFor(() => expect(screen.getByText('SB')).toBeInTheDocument());
  });

  it('rfi_master flags an out-of-range open as a deviation naming the correct action', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'r1', position: 'UTG', handKey: '72o', scenario: 'RFI', action: 'raise', stackBb: 30, isCompliant: false }),
    ]);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /RFI Master/i }));
    expect(await screen.findByText('UTG')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Raise' }));

    expect(await screen.findByText('DEVIATION')).toBeInTheDocument();
    expect(screen.getByText(/prefers FOLD/i)).toBeInTheDocument();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
  });

  it('opens the not-enough-data dialog when Fault Fixer has no eligible deviations', async () => {
    // A compliant CO AKs open is not a fault, so the fault_fixer pool is empty.
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'ok', position: 'CO', handKey: 'AKs', scenario: 'RFI', action: 'raise', isCompliant: true }),
    ]);

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Fault Fixer/i }));

    expect(await screen.findByRole('dialog', { name: 'Not enough data' })).toBeInTheDocument();
    expect(screen.getByText(/No Fault Fixer spots are available yet/i)).toBeInTheDocument();
  });

  it('opens the not-enough-data dialog when RFI Master has no RFI or blind-war spots', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'facing', position: 'BB', handKey: 'QJs', scenario: 'BB_VS_RAISE', action: 'fold' }),
    ]);

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /RFI Master/i }));

    expect(await screen.findByRole('dialog', { name: 'Not enough data' })).toBeInTheDocument();
    expect(screen.getByText(/No RFI Master spots are available yet/i)).toBeInTheDocument();
  });
});
