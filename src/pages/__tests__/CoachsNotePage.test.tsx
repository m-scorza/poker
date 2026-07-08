import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

vi.mock('dexie-react-hooks', () => ({
  // Two live queries run in this page: the Coach's Note data bundle and the
  // Tilt Detector report. These tests only exercise the note bundle, so the
  // tilt query resolves to its `undefined` default (Mindset card stays hidden).
  useLiveQuery: (fn: () => unknown) =>
    String(fn).includes('detectTilt')
      ? undefined
      : {
    note: {
      kind: 'focus',
      handsAnalyzed: 42,
      focus: {
        leakTitle: 'C-bet HU',
        explanation: 'Missed c-bets in heads-up pots as PFR.',
        severity: 'critical',
        confidence: 'high',
        estimatedBbLoss: 12.4,
        evidence: { label: '42 decisions', details: ['Imported-hand evidence'], trust: 'high' },
        cta: 'Drill this leak',
      },
      receipts: [
        { handId: 'PS-101', reasons: ['largestLoss'] },
        { handId: 'PS-202', reasons: [] },
      ],
      noDecisiveHand: false,
      drillCta: 'Open Drills and drill this pattern',
    },
    stats: {
      totalHands: 42,
      vpipHands: 10,
      pfrHands: 8,
      cbetHUOpps: 6,
      cbetHUMade: 5,
    },
    breakdown: { graded: 40, compliant: 26, excluded: 2, percentage: 66.3 },
        },
}));

vi.mock('../../data/appStore', () => ({
  useAppStore: () => ({ strategyProfile: 'game_plan' }),
}));

vi.mock('../../components/shared/DemoDataButton', () => ({
  DemoDataButton: () => <button type="button">Load demo dataset</button>,
}));

vi.mock('../../data/store', () => ({
  db: { heroDecisions: { toArray: vi.fn() }, hands: { toArray: vi.fn() } },
}));

import { CoachsNotePage } from '../CoachsNotePage';
import { STARTER_DIAGNOSTIC_STORAGE_KEY } from '../../data/starterDiagnostic';

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

describe('CoachsNotePage', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders the focus state as a premium Coachs Note x-ray with evidence and drill routes', () => {
    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /coach's note/i })).toBeInTheDocument();
    expect(screen.getByText(/x-ray focus/i)).toBeInTheDocument();
    expect(screen.getByText(/42 decisions analysed/i)).toBeInTheDocument();
    expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/~12\.4 bb/i)).toBeInTheDocument();
    expect(screen.getByText(/PS-101/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open drills/i })).toHaveAttribute('href', '/arena');
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toHaveAttribute('href', '/dashboard');
  });

  it('surfaces the starter diagnostic result as a lower-confidence Coach hint', () => {
    window.localStorage.setItem(STARTER_DIAGNOSTIC_STORAGE_KEY, JSON.stringify({
      packTitle: 'Starter diagnostic',
      correct: 5,
      total: 8,
      isComplete: true,
      updatedAt: '2026-07-04T13:00:00.000Z',
      reviewAreas: [{ label: 'Big blind defense', misses: 2, attempts: 3 }],
      recommendedPackTitle: 'Big blind defense',
    }));

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Starter diagnostic')).toBeInTheDocument();
    expect(screen.getByText(/lower-confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/5\/8/i)).toBeInTheDocument();
    expect(screen.getByText(/priority review: big blind defense/i)).toBeInTheDocument();
    expect(screen.getByText(/2 misses across 3 diagnostic spots/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue in drills/i })).toHaveAttribute('href', '/arena');
  });
});
