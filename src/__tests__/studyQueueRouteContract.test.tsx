import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import type { CoachsNote, CoachStudyPacketFocus } from '../analysis/coachsNote';
import type { SpotPacket, SpotPacketBundle } from '../analysis/spotPacket';
import type { StudyQueueItem } from '../analysis/studyPlan';
import type { DataHealthSummary } from '../data/importRuns';
import type { ParsedHand } from '../parser/pokerstars';
import type { HeroDecision } from '../types/analysis';
import type { Action, Hand, PlayerInHand } from '../types/hand';
import { StudyPlanCard } from '../components/dashboard/StudyPlanCard';
import { CoachsNotePage } from '../pages/CoachsNotePage';
import { ArenaPage } from '../pages/ArenaPage';
import { HandsPage } from '../pages/HandsPage';

const liveQueryMock = vi.hoisted(() => ({
  value: undefined as CoachsNote | undefined,
}));

const storeMocks = vi.hoisted(() => ({
  getAllHeroDecisions: vi.fn(),
  getParsedHandForHandId: vi.fn(),
  getPlayersForHand: vi.fn(),
  getActionsForHand: vi.fn(),
  getHands: vi.fn(),
  clearAllData: vi.fn(),
  toggleStarHand: vi.fn(),
  getTournaments: vi.fn(),
  importHands: vi.fn(),
  importTournamentSummaries: vi.fn(),
  getTotalHandCount: vi.fn(),
  getRecentImportRuns: vi.fn(),
  saveImportRun: vi.fn(),
  clearImportRuns: vi.fn(),
  reconcileLeakStatusesOnImport: vi.fn(),
}));

const rangeMocks = vi.hoisted(() => ({
  batchCheckCompliance: vi.fn((decisions: HeroDecision[]) => decisions),
  checkCompliance: vi.fn((decision: HeroDecision) => {
    if (decision.scenario === 'FACING_ALL_IN') return null;
    return { ...decision, isCompliant: decision.isCompliant };
  }),
}));

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => liveQueryMock.value,
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
  importHands: storeMocks.importHands,
  importTournamentSummaries: storeMocks.importTournamentSummaries,
  getTotalHandCount: storeMocks.getTotalHandCount,
  getRecentImportRuns: storeMocks.getRecentImportRuns,
  saveImportRun: storeMocks.saveImportRun,
  clearImportRuns: storeMocks.clearImportRuns,
  reconcileLeakStatusesOnImport: storeMocks.reconcileLeakStatusesOnImport,
  db: {
    heroDecisions: {},
    hands: {},
    tournaments: { toArray: storeMocks.getTournaments },
    players: {},
    actions: {},
  },
}));

vi.mock('../analysis/rangeChecker', async () => {
  const actual = await vi.importActual<typeof import('../analysis/rangeChecker')>('../analysis/rangeChecker');
  return {
    ...actual,
    batchCheckCompliance: rangeMocks.batchCheckCompliance,
    checkCompliance: rangeMocks.checkCompliance,
  };
});

vi.mock('../components/hands/HandsFilters', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
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

function packet(overrides: { packetId?: string; handId?: string; handKey?: string } = {}): SpotPacket {
  const handId = overrides.handId ?? 'route-hand';
  return {
    packetId: overrides.packetId ?? 'route-spot',
    source: {
      handId,
      site: 'pokerstars',
      fileType: 'hand_history',
      accessMethod: 'local_file',
      parserConfidence: 'high',
      localOnly: true,
    },
    evidenceLabel: 'study_packet_only',
    target: 'generic',
    warnings: ['not_solver_backed', 'trainer_scoring_not_included', 'legal_action_menu_inferred'],
    hero: {
      handKey: overrides.handKey ?? 'QJs',
      position: 'SB',
      scenario: 'FACING_RAISE',
      action: 'call',
      stackBb: 25,
      deviationType: null,
    },
    trainerPrompt: {
      source: 'parsed_hand',
      legalActions: [
        { id: 'fold', action: 'fold', label: 'Fold', amountChips: null, amountBb: null, source: 'scenario_inferred' },
        { id: 'call-2bb', action: 'call', label: 'Call 2 BB', amountChips: 200, amountBb: 2, source: 'observed_hero_action' },
        { id: 'raise', action: 'raise', label: 'Raise', amountChips: null, amountBb: null, source: 'scenario_inferred' },
        { id: 'all-in', action: 'all_in', label: 'All-in', amountChips: null, amountBb: null, source: 'scenario_inferred' },
      ],
      scoring: { status: 'not_included', supportsMixedActions: true },
    },
    reviewQuestion: {
      scenario: 'FACING_RAISE',
      heroAction: 'call',
      heroHand: overrides.handKey ?? 'QJs',
      ask: 'external_review',
    },
  } as unknown as SpotPacket;
}

const studyItem: StudyQueueItem = {
  id: 'deviation-BB_FOLD_SUITED',
  title: 'Folded suited BB defense',
  source: 'deviation',
  severity: 'high',
  priorityScore: 92,
  sampleSize: 3,
  estimatedBbLoss: 12,
  confidence: 'low',
  evidence: {
    kind: 'tagged_decisions',
    label: 'Tagged decision cluster',
    details: ['3 tagged decisions'],
    trust: { kind: 'unsupported', citations: [] },
  },
  handIds: ['route-hand'],
  cta: 'Review hand queue',
  explanation: 'Review this as a local study packet bundle.',
};

const dataHealthItem: StudyQueueItem = {
  ...studyItem,
  id: 'data-health-source-context',
  title: 'Data Health source/context review',
  source: 'data_health',
  severity: 'medium',
  estimatedBbLoss: null,
  cta: 'Review source caveats',
  explanation: 'Review retained parser warnings before relying on the queue.',
};

function packetBundle(): SpotPacketBundle {
  const first = packet();
  return {
    schemaVersion: 'spot-packet-bundle/v1',
    bundleId: 'route-bundle',
    inputHash: 'route-hash',
    createdAt: '2026-06-30T12:00:00.000Z',
    target: 'generic',
    evidenceLabel: 'study_packet_only',
    localOnly: true,
    source: {
      type: 'study_queue',
      itemCount: 1,
      requestedHandCount: 1,
      packetCount: 1,
    },
    warnings: ['not_solver_backed', 'trainer_scoring_not_included', 'legal_action_menu_inferred'],
    queueItems: [{
      itemId: studyItem.id,
      title: studyItem.title,
      source: studyItem.source,
      priorityScore: studyItem.priorityScore,
      confidence: studyItem.confidence,
      handIds: ['route-hand'],
      packetIds: [first.packetId],
      missingHandIds: [],
    }],
    omittedHands: [],
    packetIds: [first.packetId],
    packets: [first],
  };
}

function twoPacketBundle(): SpotPacketBundle {
  const first = packet({ packetId: 'route-spot-a', handId: 'route-hand-a', handKey: 'AKs' });
  const second = packet({ packetId: 'route-spot-b', handId: 'route-hand-b', handKey: 'T9s' });
  return {
    ...packetBundle(),
    source: {
      type: 'study_queue',
      itemCount: 2,
      requestedHandCount: 2,
      packetCount: 2,
    },
    queueItems: [{
      itemId: studyItem.id,
      title: studyItem.title,
      source: studyItem.source,
      priorityScore: studyItem.priorityScore,
      confidence: studyItem.confidence,
      handIds: ['route-hand-a', 'route-hand-b'],
      packetIds: [first.packetId, second.packetId],
      missingHandIds: [],
    }],
    packetIds: [first.packetId, second.packetId],
    packets: [first, second],
  } as SpotPacketBundle;
}

function dataHealthSummary(): DataHealthSummary {
  const importedAt = new Date('2026-06-30T12:00:00.000Z');
  return {
    status: 'ready',
    confidence: 'medium',
    lastImportedAt: importedAt,
    totalRuns: 1,
    recentFiles: 3,
    recentSavedHands: 24,
    recentSavedSummaries: 0,
    recentFailedFiles: 1,
    warnings: ['unsupported file warning'],
    message: 'Latest import has warnings; analysis should be treated as directional.',
    ledger: {
      analysisPosture: 'directional',
      latestConfidence: 'medium',
      latestImportedAt: importedAt,
      totalRuns: 1,
      totalFiles: 3,
      parsedFiles: 2,
      failedFiles: 1,
      savedHands: 24,
      savedSummaries: 0,
      parsedFileRate: 2 / 3,
      confidenceCounts: { high: 1, medium: 1, low: 0 },
      warningCategories: [
        { category: 'unsupported_format', label: 'Unsupported format', count: 1, examples: ['sanitized unsupported file'] },
      ],
      reviewFocus: 'Review warning categories before study export.',
    },
  };
}

function focusNote(studyPacketFocus: CoachStudyPacketFocus | null): CoachsNote {
  return {
    kind: 'focus',
    handsAnalyzed: 42,
    focus: {
      leakTitle: 'Folded suited BB defense',
      explanation: 'Review this leak before expanding the queue.',
      severity: 'high',
      confidence: 'medium',
      estimatedBbLoss: 12.5,
      evidence: {
        kind: 'tagged_decisions',
        label: 'Tagged decision cluster',
        details: ['3 tagged decisions'],
        trust: { kind: 'unsupported', citations: [] },
      },
      cta: 'Review hand queue',
    },
    ...(studyPacketFocus ? { studyPacketFocus } : {}),
    receipts: [{ handId: 'route-hand', reasons: [] }],
    noDecisiveHand: false,
    drillCta: 'Open the Arena and drill this pattern',
  } as CoachsNote;
}

beforeEach(() => {
  installMemoryStorage();
  vi.clearAllMocks();
  liveQueryMock.value = undefined;
  storeMocks.getAllHeroDecisions.mockResolvedValue([]);
  storeMocks.getParsedHandForHandId.mockResolvedValue(null);
  storeMocks.getPlayersForHand.mockImplementation((handId: string) => Promise.resolve(routeReplayPlayers(handId)));
  storeMocks.getActionsForHand.mockImplementation((handId: string) => Promise.resolve(routeReplayActions(handId)));
  storeMocks.getHands.mockResolvedValue([]);
  storeMocks.getTournaments.mockResolvedValue([]);
  storeMocks.clearAllData.mockResolvedValue(undefined);
  storeMocks.toggleStarHand.mockResolvedValue(true);
  storeMocks.importHands.mockResolvedValue(0);
  storeMocks.importTournamentSummaries.mockResolvedValue({ updated: 0, created: 0, buyInPreserved: 0 });
  storeMocks.getTotalHandCount.mockResolvedValue(0);
  storeMocks.getRecentImportRuns.mockResolvedValue([]);
  storeMocks.saveImportRun.mockResolvedValue(undefined);
  storeMocks.clearImportRuns.mockResolvedValue(undefined);
  storeMocks.reconcileLeakStatusesOnImport.mockResolvedValue({ newlyResolved: [], newlyRegressed: [] });
  rangeMocks.batchCheckCompliance.mockImplementation((decisions: HeroDecision[]) => decisions);
  rangeMocks.checkCompliance.mockImplementation((entry: HeroDecision) => {
    if (entry.scenario === 'FACING_ALL_IN') return null;
    return { ...entry, isCompliant: entry.isCompliant };
  });
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.pushState({}, '', '/');
  vi.useRealTimers();
});

describe('Study Queue route contract', () => {
  it('keeps Dashboard and Coach packet CTAs on the same local-only route contract', () => {
    const bundle = packetBundle();

    render(
      <MemoryRouter>
        <StudyPlanCard items={[studyItem, dataHealthItem]} spotPacketBundle={bundle} dataHealthSummary={dataHealthSummary()} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('study-queue-next-packet-review-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=route-hand#spot-packet',
    );
    expect(screen.getByTestId('study-queue-next-packet-arena-link')).toHaveAttribute(
      'href',
      '/arena?drill=study-queue&handId=route-hand#study-packet-drill',
    );
    expect(screen.getByTestId('study-queue-packet-bundle-summary')).toHaveTextContent('no solver EV, trainer answers, raw hand text, or villain names');
    expect(screen.getByTestId('study-queue-data-health-link')).toHaveAttribute('href', '/hands?panel=data-health#data-health');
    expect(screen.getByTestId('study-queue-item-2')).toHaveAttribute('href', '/hands?panel=data-health#data-health');
    expect(screen.getByTestId('study-queue-card')).not.toHaveTextContent(/EV loss|chipEV|correct answer|trainer score:/i);

    cleanup();
    liveQueryMock.value = focusNote({ packet: bundle.packets[0]!, srsStatus: 'SRS repeat starts after first review' });

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('coachs-note-study-packet-review-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=route-hand#spot-packet',
    );
    expect(screen.getByTestId('coachs-note-study-packet-arena-link')).toHaveAttribute(
      'href',
      '/arena?drill=study-queue&handId=route-hand#study-packet-drill',
    );
    expect(screen.getByTestId('coachs-note-study-packet')).toHaveTextContent('Study-only · no EV');
    expect(screen.getByTestId('coachs-note-study-packet')).toHaveTextContent('no solver EV, trainer answer, trainer score, raw hand text, local path, or villain name is stored');
    expect(screen.getByTestId('coachs-note-study-packet')).not.toHaveTextContent(/EV loss|chipEV|correct answer|trainer score:/i);
  });

  it('keeps no-actionable Study Queue states on generic Coach routing while Data Health stays reachable', () => {
    const bundle = twoPacketBundle();
    window.localStorage.setItem(
      STUDY_PACKET_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        'route-spot-a': {
          packetId: 'route-spot-a',
          handId: 'route-hand-a',
          reviewedAt: '2026-06-30T12:00:00.000Z',
          lastDrilledAt: '2026-06-30T12:00:00.000Z',
          nextDueAt: '2099-01-01T00:00:00.000Z',
          repetitionCount: 2,
          intervalDays: 3,
          starred: false,
          updatedAt: '2026-06-30T12:00:00.000Z',
        },
        'route-spot-b': {
          packetId: 'route-spot-b',
          handId: 'route-hand-b',
          reviewedAt: '2026-06-30T12:05:00.000Z',
          lastDrilledAt: '2026-06-30T12:05:00.000Z',
          nextDueAt: '2099-01-04T00:00:00.000Z',
          repetitionCount: 2,
          intervalDays: 3,
          starred: false,
          updatedAt: '2026-06-30T12:05:00.000Z',
        },
      }),
    );

    render(
      <MemoryRouter>
        <StudyPlanCard items={[studyItem, dataHealthItem]} spotPacketBundle={bundle} dataHealthSummary={dataHealthSummary()} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('study-queue-packet-progress-summary')).toHaveTextContent('2/2 reviewed · 0 starred · 0 snoozed · 0 due now');
    expect(screen.getByTestId('study-queue-packet-progress-overview-copy')).toHaveTextContent('No actionable packet is due now');
    expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('No actionable packet due now');
    expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('Reviewed packets wait for their SRS date');
    expect(screen.getByTestId('study-queue-next-packet-progress')).toHaveTextContent('Skipped packet progress');
    expect(screen.queryByTestId('study-queue-next-packet-review-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('study-queue-next-packet-arena-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('study-queue-data-health-link')).toHaveAttribute('href', '/hands?panel=data-health#data-health');
    expect(screen.getByTestId('study-queue-card')).not.toHaveTextContent(/EV loss|chipEV|correct answer|trainer score:/i);

    cleanup();
    liveQueryMock.value = focusNote(null);

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('coachs-note-study-packet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coachs-note-study-packet-review-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coachs-note-study-packet-arena-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('coachs-note-final-drill-link')).toHaveAttribute('href', '/arena');
    expect(screen.getByTestId('coachs-note-final-drill-link')).toHaveTextContent('The Arena');
    expect(screen.queryByText(/EV loss|chipEV|correct answer|trainer score:/i)).not.toBeInTheDocument();
  });

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
    expect(screen.getByTestId('hand-replay-dialog')).not.toHaveTextContent(/VillainA|VillainB|EV loss|chipEV|correct answer|trainer score:/i);

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
  });
});
