import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandCategory } from '../../components/hands/HandsFilters';
import type { HeroDecision } from '../../types/analysis';
import type { Hand } from '../../types/hand';
import { getHandCategory, HandsPage, replayHandIdFromLocation, shouldOpenImporterFromLocation } from '../HandsPage';
import '@testing-library/jest-dom';

const storeMocks = vi.hoisted(() => ({
  getAllHeroDecisions: vi.fn(),
  getHands: vi.fn(),
  clearAllData: vi.fn(),
  toggleStarHand: vi.fn(),
  getTournaments: vi.fn(),
}));

vi.mock('../../data/appStore', () => ({
  useAppStore: () => ({ strategyProfile: 'game_plan', activeSessionId: 'all' }),
}));

vi.mock('../../data/store', () => ({
  getAllHeroDecisions: storeMocks.getAllHeroDecisions,
  getHands: storeMocks.getHands,
  clearAllData: storeMocks.clearAllData,
  toggleStarHand: storeMocks.toggleStarHand,
  db: {
    tournaments: { toArray: storeMocks.getTournaments },
  },
}));

vi.mock('../../analysis/rangeChecker', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analysis/rangeChecker')>();
  return {
    ...actual,
    batchCheckCompliance: (decisions: HeroDecision[]) => decisions,
  };
});

vi.mock('../../components/hands/HandsUpload', () => ({
  HandsUpload: () => React.createElement('div', { 'data-testid': 'mock-hands-upload' }),
}));

vi.mock('../../components/hands/HandReplay', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    HandReplay: ({ hand, heroDecision }: { hand: Hand; heroDecision: HeroDecision | null }) => ReactActual.createElement(
      'div',
      { 'data-testid': 'mock-hand-replay' },
      `${hand.id}|${heroDecision?.handId ?? 'missing-decision'}`,
    ),
  };
});

vi.mock('../../components/hands/HandsFilters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../components/hands/HandsFilters')>();
  return {
    ...actual,
    HandsFilters: () => React.createElement('div', { 'data-testid': 'mock-hands-filters' }),
  };
});

vi.mock('../../components/hands/HandsTable', () => ({
  HandsTable: ({ decisions }: { decisions: HeroDecision[] }) => React.createElement(
    'div',
    { 'data-testid': 'mock-hands-table' },
    `rows:${decisions.length}`,
  ),
}));

function decision(overrides: Partial<HeroDecision>): HeroDecision {
  return {
    handId: 'h1',
    position: 'BTN',
    handKey: 'AKs',
    stackBb: 30,
    scenario: 'RFI',
    action: 'raise',
    isCompliant: true,
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
    netProfit: 0,
    ...overrides,
  };
}

function makeHand(id: string, overrides: Partial<Hand> = {}): Hand {
  return {
    id,
    tournamentId: 't1',
    date: new Date('2026-06-30T12:00:00Z'),
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
    totalPot: 30,
    rake: 0,
    hasShowdown: false,
    isStarred: false,
    heroChipsBefore: 1500,
    heroChipsAfter: 1500,
    villainDeltas: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  storeMocks.getAllHeroDecisions.mockResolvedValue([]);
  storeMocks.getHands.mockResolvedValue([]);
  storeMocks.getTournaments.mockResolvedValue([]);
  storeMocks.clearAllData.mockResolvedValue(undefined);
  storeMocks.toggleStarHand.mockResolvedValue(true);
});

describe('getHandCategory', () => {
  it.each([
    ['AA', 'pairs'],
    ['KK', 'pairs'],
    ['22', 'pairs'],
    ['AKs', 'suited-aces'],
    ['KQs', 'broadway'],
    ['QJs', 'broadway'],
    ['JTs', 'broadway'],
    ['A9s', 'suited-aces'],
    ['A2s', 'suited-aces'],
    ['T9s', 'suited-connectors'],
    ['98s', 'suited-connectors'],
    ['54s', 'suited-connectors'],
    ['K5s', 'suited-gappers'],
    ['86s', 'suited-gappers'],
    ['Q4s', 'suited-gappers'],
    ['AKo', 'broadway'],
    ['KQo', 'broadway'],
    ['QJo', 'broadway'],
    ['A9o', 'offsuit'],
    ['J8o', 'offsuit'],
    ['72o', 'offsuit'],
  ] satisfies Array<[string, HandCategory]>)('classifies %s as %s', (handKey, expected) => {
    expect(getHandCategory(handKey)).toBe(expected);
  });
});

describe('shouldOpenImporterFromLocation', () => {
  it.each([
    ['?panel=data-health', '', true],
    ['?panel=import', '', true],
    ['?view=upload', '', true],
    ['', '#data-health', true],
    ['?panel=hands', '', false],
    ['', '', false],
  ] satisfies Array<[string, string, boolean]>)('search=%s hash=%s -> %s', (search, hash, expected) => {
    expect(shouldOpenImporterFromLocation(search, hash)).toBe(expected);
  });
});

describe('HandsPage data-health deep link', () => {
  it('opens the importer when routed with ?panel=data-health', async () => {
    render(React.createElement(
      MemoryRouter,
      { initialEntries: ['/hands?panel=data-health#data-health'] },
      React.createElement(HandsPage),
    ));

    expect(await screen.findByTestId('mock-hands-upload')).toBeInTheDocument();
  });
});

describe('replayHandIdFromLocation', () => {
  it.each([
    ['?panel=spot-packet&reviewHand=hand-123', 'hand-123'],
    ['?handId=ps-987', 'ps-987'],
    ['?hand=encoded%20id', 'encoded id'],
    ['?panel=spot-packet&reviewHand=hand%2Cwith%2Fspace%20%C3%A4', 'hand,with/space ä'],
    ['?panel=spot-packet', null],
    [`?reviewHand=${'x'.repeat(129)}`, null],
  ] satisfies Array<[string, string | null]>)('search=%s -> %s', (search, expected) => {
    expect(replayHandIdFromLocation(search)).toBe(expected);
  });
});

describe('HandsPage review route', () => {
  it('opens HandReplay for a special-character reviewHand id', async () => {
    const handId = 'srs,with/space ä';
    storeMocks.getAllHeroDecisions.mockResolvedValue([decision({ handId })]);
    storeMocks.getHands.mockResolvedValue([makeHand(handId)]);

    render(React.createElement(
      MemoryRouter,
      { initialEntries: [`/hands?reviewHand=${encodeURIComponent(handId)}`] },
      React.createElement(HandsPage),
    ));

    expect(await screen.findByTestId('mock-hand-replay')).toHaveTextContent(`${handId}|${handId}`);
  });
});

describe('HandsPage not-graded review queue (refusal-as-UI)', () => {
  it('renders the ungraded summary and filters to refused spots on click', async () => {
    storeMocks.getAllHeroDecisions.mockResolvedValue([
      decision({ handId: 'graded-rfi', scenario: 'RFI' }),
      decision({ handId: 'threebet', scenario: 'FACING_3BET', action: 'fold' }),
      decision({ handId: 'allin', scenario: 'FACING_ALL_IN', action: 'call' }),
    ]);

    render(React.createElement(
      MemoryRouter,
      null,
      React.createElement(HandsPage),
    ));

    const summary = await screen.findByTestId('ungraded-scenario-summary');
    expect(summary).toHaveTextContent('Not graded review queue');
    expect(summary).toHaveTextContent('2 hands are excluded from range compliance');
    expect(screen.getByTestId('ungraded-scenario-FACING_3BET')).toHaveTextContent('1');
    expect(screen.getByTestId('ungraded-scenario-FACING_ALL_IN')).toHaveTextContent('1');
    expect(screen.getByTestId('mock-hands-table')).toHaveTextContent('rows:3');

    fireEvent.click(screen.getByRole('button', { name: /filter all not graded/i }));
    expect(screen.getByTestId('mock-hands-table')).toHaveTextContent('rows:2');

    fireEvent.click(screen.getByTestId('ungraded-scenario-FACING_3BET'));
    expect(screen.getByTestId('mock-hands-table')).toHaveTextContent('rows:1');
  });

  it('renders no queue when every decision is graded', async () => {
    storeMocks.getAllHeroDecisions.mockResolvedValue([decision({ handId: 'graded-rfi' })]);

    render(React.createElement(
      MemoryRouter,
      null,
      React.createElement(HandsPage),
    ));

    expect(await screen.findByTestId('mock-hands-table')).toHaveTextContent('rows:1');
    expect(screen.queryByTestId('ungraded-scenario-summary')).not.toBeInTheDocument();
  });
});
