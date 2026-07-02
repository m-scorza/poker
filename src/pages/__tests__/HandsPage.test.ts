import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandCategory } from '../../components/hands/HandsFilters';
import type { HeroDecision } from '../../types/analysis';
import type { Hand } from '../../types/hand';
import {
  buildUngradedScenarioSummary,
  isUngradedDecision,
} from '../../analysis/ungradedScenarios';
import {
  getHandCategory,
  HandsPage,
  replayHandIdFromLocation,
  shouldOpenImporterFromLocation,
} from '../HandsPage';
import '@testing-library/jest-dom';

const storeMocks = vi.hoisted(() => ({
  getAllHeroDecisions: vi.fn(),
  getHands: vi.fn(),
  clearAllData: vi.fn(),
  toggleStarHand: vi.fn(),
  getTournaments: vi.fn(),
}));

const rangeMocks = vi.hoisted(() => ({
  batchCheckCompliance: vi.fn((decisions: HeroDecision[]) => decisions),
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
    batchCheckCompliance: rangeMocks.batchCheckCompliance,
  };
});

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

vi.mock('../../components/hands/HandsUpload', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    HandsUpload: () => ReactActual.createElement('div', { 'data-testid': 'mock-hands-upload' }),
  };
});

vi.mock('../../components/hands/HandsFilters', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    HandsFilters: () => ReactActual.createElement('div', { 'data-testid': 'mock-hands-filters' }),
  };
});

vi.mock('../../components/hands/HandsTable', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    HandsTable: () => ReactActual.createElement('div', { 'data-testid': 'mock-hands-table' }),
  };
});

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

function hand(overrides: Partial<Hand> = {}): Hand {
  return {
    id: 'h1',
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
  rangeMocks.batchCheckCompliance.mockImplementation((decisions: HeroDecision[]) => decisions);
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
  ] satisfies Array<[string, string, boolean]>)('returns %s for search=%s hash=%s', (search, hash, expected) => {
    expect(shouldOpenImporterFromLocation(search, hash)).toBe(expected);
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
  ] satisfies Array<[string, string | null]>)('returns %s for search=%s', (search, expected) => {
    expect(replayHandIdFromLocation(search)).toBe(expected);
  });
});

describe('HandsPage review route', () => {
  it('opens HandReplay for a special-character reviewHand id in the SpotPacket route', async () => {
    const handId = 'srs,with/space ä';
    storeMocks.getAllHeroDecisions.mockResolvedValue([decision({ handId })]);
    storeMocks.getHands.mockResolvedValue([hand({ id: handId })]);

    render(React.createElement(
      MemoryRouter,
      { initialEntries: [`/hands?panel=spot-packet&reviewHand=${encodeURIComponent(handId)}#spot-packet`] },
      React.createElement(HandsPage),
    ));

    expect(await screen.findByTestId('mock-hand-replay')).toHaveTextContent(`${handId}|${handId}`);
  });
});

describe('buildUngradedScenarioSummary', () => {
  it('counts refusal scenarios in review order and splits folds from continues', () => {
    const summary = buildUngradedScenarioSummary([
      decision({ handId: 'graded', scenario: 'BB_VS_RAISE', position: 'BB', action: 'call' }),
      decision({ handId: 'threebet', scenario: 'FACING_3BET', action: 'fold' }),
      decision({ handId: 'allin-fold', scenario: 'FACING_ALL_IN', action: 'fold' }),
      decision({ handId: 'allin-call', scenario: 'FACING_ALL_IN', action: 'call' }),
      decision({ handId: 'multiway', scenario: 'BB_VS_RAISE_MULTIWAY', position: 'BB', action: 'raise' }),
    ]);

    expect(summary.map(({ scenario, count, folded, continued }) => ({ scenario, count, folded, continued }))).toEqual([
      { scenario: 'FACING_3BET', count: 1, folded: 1, continued: 0 },
      { scenario: 'FACING_ALL_IN', count: 2, folded: 1, continued: 1 },
      { scenario: 'BB_VS_RAISE_MULTIWAY', count: 1, folded: 0, continued: 1 },
    ]);
    expect(summary[0]!.reason).toContain('3-bet');
  });

  it('marks explicit and dynamic compliance-refusal spots as ungraded', () => {
    expect(isUngradedDecision(decision({ scenario: 'FACING_ALL_IN' }))).toBe(true);
    expect(isUngradedDecision(decision({
      scenario: 'FACING_RAISE',
      position: 'BTN',
      action: 'call',
      openerPosition: 'CO',
    }))).toBe(true);
    expect(isUngradedDecision(decision({ scenario: 'RFI' }))).toBe(false);
    expect(isUngradedDecision(decision({
      scenario: 'FACING_RAISE',
      position: 'HJ',
      action: 'call',
      openerPosition: 'CO',
    }))).toBe(false);
    expect(buildUngradedScenarioSummary([decision({ scenario: 'RFI' })])).toEqual([]);
  });
});
