import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedDemoDataset, type DemoSeedProgress } from '../demoDataset';

const storeMocks = vi.hoisted(() => ({
  importHands: vi.fn(async (hands: unknown[], _options?: { aggregateVillains?: boolean }) => hands.length),
  aggregateVillainStats: vi.fn(async (_hands?: unknown[]) => undefined),
  importTournamentSummaries: vi.fn(async (summaries: unknown[]) => ({ created: summaries.length, updated: 0, buyInPreserved: 0 })),
  clearAllData: vi.fn()
}));

vi.mock('../store', () => ({
  db: {
    hands: { where: () => ({ startsWith: () => ({ count: async () => 0 }) }) },
    tournaments: { where: () => ({ startsWith: () => ({ count: async () => 0 }) }) }
  },
  importHands: storeMocks.importHands,
  aggregateVillainStats: storeMocks.aggregateVillainStats,
  importTournamentSummaries: storeMocks.importTournamentSummaries,
  clearAllData: storeMocks.clearAllData
}));

describe('seedDemoDataset progress callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(storeMocks.aggregateVillainStats.mock.calls[0]![0]).toHaveLength(10_716);
  });
});
