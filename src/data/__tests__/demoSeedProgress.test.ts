import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedDemoDataset, type DemoSeedProgress } from '../demoDataset';

const storeMocks = vi.hoisted(() => {
  const state = {
    existingDemoHands: 0,
    existingDemoTournaments: 0,
  };
  const deletes = {
    hands: vi.fn(async () => undefined),
    players: vi.fn(async () => undefined),
    actions: vi.fn(async () => undefined),
    heroDecisions: vi.fn(async () => undefined),
    tournaments: vi.fn(async () => undefined),
    villains: vi.fn(async () => undefined),
  };

  return {
    state,
    deletes,
    importHands: vi.fn(async (hands: unknown[], _options?: { aggregateVillains?: boolean }) => hands.length),
    aggregateVillainStats: vi.fn(async (_hands?: unknown[]) => undefined),
    importTournamentSummaries: vi.fn(async (summaries: unknown[]) => ({ created: summaries.length, updated: 0, buyInPreserved: 0 })),
    clearAllData: vi.fn(),
  };
});

const startsWithCollection = (count: () => number, deleteFn: () => Promise<void>) => ({
  startsWith: () => ({
    count: async () => count(),
    delete: deleteFn,
  }),
});

vi.mock('../store', () => ({
  db: {
    transaction: async (_mode: string, _tables: unknown[], callback: () => Promise<void>) => callback(),
    hands: {
      where: () => startsWithCollection(() => storeMocks.state.existingDemoHands, storeMocks.deletes.hands),
      bulkDelete: storeMocks.deletes.hands,
    },
    players: { where: () => startsWithCollection(() => 0, storeMocks.deletes.players) },
    actions: { where: () => startsWithCollection(() => 0, storeMocks.deletes.actions) },
    heroDecisions: { where: () => startsWithCollection(() => 0, storeMocks.deletes.heroDecisions) },
    tournaments: {
      where: () => startsWithCollection(() => storeMocks.state.existingDemoTournaments, storeMocks.deletes.tournaments),
      bulkDelete: storeMocks.deletes.tournaments,
    },
    villains: { bulkDelete: storeMocks.deletes.villains },
  },
  importHands: storeMocks.importHands,
  aggregateVillainStats: storeMocks.aggregateVillainStats,
  importTournamentSummaries: storeMocks.importTournamentSummaries,
  clearAllData: storeMocks.clearAllData
}));

describe('seedDemoDataset progress callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.state.existingDemoHands = 0;
    storeMocks.state.existingDemoTournaments = 0;
  });

  it('advances through all phases and reaches done', async () => {
    const progressUpdates: DemoSeedProgress[] = [];
    const onProgress = vi.fn((p: DemoSeedProgress) => {
      progressUpdates.push(p);
    });

    const result = await seedDemoDataset(onProgress);

    expect(result.alreadyLoaded).toBe(false);
    expect(progressUpdates.length).toBeGreaterThan(0);

    const phases = progressUpdates.map(p => p.phase);
    expect(phases).toContain('checking');
    expect(phases).toContain('generating');
    expect(phases).toContain('importing_hands');
    expect(phases).toContain('importing_summaries');
    expect(phases).toContain('done');

    const lastUpdate = progressUpdates[progressUpdates.length - 1]!;
    expect(lastUpdate.phase).toBe('done');
    expect(lastUpdate.progress).toBe(100);
  });

  it('avoids repeated per-chunk villain aggregation and aggregates the demo import once at the end', async () => {
    await seedDemoDataset();

    expect(storeMocks.importHands).toHaveBeenCalled();
    expect(storeMocks.importHands.mock.calls.length).toBeGreaterThan(1);
    expect(storeMocks.importHands.mock.calls.every(([, options]) => options?.aggregateVillains === false)).toBe(true);
    expect(storeMocks.aggregateVillainStats).toHaveBeenCalledTimes(1);
    const aggregateCall = storeMocks.aggregateVillainStats.mock.calls[0]!;
    expect(aggregateCall[0]?.length).toBeGreaterThanOrEqual(10_000);
  });

  it('replaces older demo data instead of treating any 250-tournament demo as already loaded', async () => {
    const progressUpdates: DemoSeedProgress[] = [];
    storeMocks.state.existingDemoHands = 10_716;
    storeMocks.state.existingDemoTournaments = 250;

    const result = await seedDemoDataset((p) => progressUpdates.push(p));

    expect(result.alreadyLoaded).toBe(false);
    expect(progressUpdates.some((p) => p.message === 'Replacing older demo dataset...')).toBe(true);
    expect(storeMocks.deletes.hands).toHaveBeenCalled();
    expect(storeMocks.deletes.players).toHaveBeenCalled();
    expect(storeMocks.deletes.actions).toHaveBeenCalled();
    expect(storeMocks.deletes.heroDecisions).toHaveBeenCalled();
    expect(storeMocks.deletes.tournaments).toHaveBeenCalled();
    expect(storeMocks.deletes.villains).toHaveBeenCalled();
    expect(storeMocks.importHands).toHaveBeenCalled();
  });
});
