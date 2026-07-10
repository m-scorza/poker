import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The Zustand persist middleware writes to localStorage, which isn't wired up in
// this jsdom config. Stub it before the store module initializes (vi.hoisted runs
// before imports) so setState/persist don't throw.
vi.hoisted(() => {
  const backing = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => void backing.set(key, value),
    removeItem: (key: string) => void backing.delete(key),
    clear: () => backing.clear(),
    key: (index: number) => Array.from(backing.keys())[index] ?? null,
    get length() {
      return backing.size;
    },
  } as Storage;
});

import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import type { Leak } from '../../analysis/leakDetector';

// vpip_pfr_gap is an Advanced-only leak: it exists under 'advanced' and never
// under 'game_plan'. Mocking the detector lets us reproduce the profile-specific
// leak without seeding 50+ decisions, and hits both the page query and the store
// reconcile path (both import detectLeaks from this module).
const VPIP_PFR_GAP_LEAK: Leak = {
  id: 'vpip_pfr_gap',
  name: 'VPIP-PFR Gap',
  description: 'Too passive preflop',
  severity: 'high',
  value: 20,
  target: [0, 10],
  deviation: 10,
  sampleSize: 120,
  confidence: 'high',
};

vi.mock('../../analysis/leakDetector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analysis/leakDetector')>();
  return {
    ...actual,
    computeAggregateStats: () => ({}) as ReturnType<typeof actual.computeAggregateStats>,
    detectLeaks: (_stats: unknown, profile: 'game_plan' | 'advanced' = 'game_plan') =>
      profile === 'advanced' ? [VPIP_PFR_GAP_LEAK] : [],
  };
});

import { LeaksPage } from '../LeaksPage';
import { db } from '../../data/store';
import { useAppStore } from '../../data/appStore';

describe('LeaksPage — reconcile on strategy-profile switch', () => {
  beforeEach(async () => {
    await db.leakStatus.clear();
    await db.heroDecisions.clear();
    useAppStore.setState({ strategyProfile: 'advanced' });
  });

  afterEach(() => {
    cleanup();
  });

  it('reconciles a profile-specific studied leak into the graveyard instead of losing it', async () => {
    // The user is studying an Advanced-only leak.
    await db.leakStatus.put({ leakId: 'vpip_pfr_gap', studyingSince: new Date('2026-06-01'), resolvedAt: null });

    render(
      <MemoryRouter>
        <LeaksPage />
      </MemoryRouter>,
    );

    // Under Advanced the leak fires and stays studying (not resolved).
    await waitFor(async () => {
      expect((await db.leakStatus.get('vpip_pfr_gap'))?.resolvedAt).toBeNull();
    });

    // Switch to a profile where the leak no longer exists.
    act(() => {
      useAppStore.setState({ strategyProfile: 'game_plan' });
    });

    // The leak must be reconciled (tombstoned), not left with resolvedAt null forever.
    await waitFor(async () => {
      expect((await db.leakStatus.get('vpip_pfr_gap'))?.resolvedAt).not.toBeNull();
    });

    // And it surfaces in the "leaks you've killed" graveyard rather than vanishing.
    await waitFor(() => {
      expect(screen.getByText(/leaks you.*killed/i)).toBeInTheDocument();
      expect(screen.getByText(/VPIP PFR gap/i)).toBeInTheDocument();
    });

    // Switching back to the profile where the leak fires clears the tombstone
    // (regressed): the record is normalized, not left stale-resolved.
    act(() => {
      useAppStore.setState({ strategyProfile: 'advanced' });
    });
    await waitFor(async () => {
      expect((await db.leakStatus.get('vpip_pfr_gap'))?.resolvedAt).toBeNull();
    });
  });
});
