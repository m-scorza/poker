import { beforeEach, describe, expect, it } from 'vitest';
import {
  CURRICULUM_PROGRESS_STORAGE_KEY,
  buildCurriculumProgress,
  readCurriculumProgress,
  recordCurriculumSpotReview,
} from '../curriculumProgress';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();

  get length(): number {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.backing.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.backing.delete(key);
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: new MemoryStorage(),
});

describe('curriculum progress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds per-pack local seed progress without trainer answers or hand data', () => {
    const first = buildCurriculumProgress({}, {
      packSlug: 'facing-3bet-frontier',
      spotId: 'facing-3bet-frontier-0',
      wasCorrect: true,
      totalSpots: 2,
      updatedAt: '2026-07-05T14:00:00.000Z',
    });

    const second = buildCurriculumProgress(first, {
      packSlug: 'facing-3bet-frontier',
      spotId: 'facing-3bet-frontier-1',
      wasCorrect: false,
      totalSpots: 2,
      updatedAt: '2026-07-05T14:01:00.000Z',
    });

    expect(second['facing-3bet-frontier']).toMatchObject({
      packSlug: 'facing-3bet-frontier',
      reviewedSpotIds: ['facing-3bet-frontier-0', 'facing-3bet-frontier-1'],
      attempts: 2,
      correct: 1,
      totalSpots: 2,
      isComplete: true,
      completedAt: '2026-07-05T14:01:00.000Z',
      updatedAt: '2026-07-05T14:01:00.000Z',
    });
    expect(JSON.stringify(second)).not.toContain('raise');
    expect(JSON.stringify(second)).not.toContain('Hero');
  });

  it('persists and normalizes browser-local curriculum progress', () => {
    recordCurriculumSpotReview({
      packSlug: 'versus-open-raise',
      spotId: 'versus-open-raise-0',
      wasCorrect: false,
      totalSpots: 27,
      updatedAt: '2026-07-05T15:00:00.000Z',
    });

    const stored = readCurriculumProgress();
    expect(stored['versus-open-raise']).toMatchObject({
      packSlug: 'versus-open-raise',
      reviewedSpotIds: ['versus-open-raise-0'],
      attempts: 1,
      correct: 0,
      totalSpots: 27,
      isComplete: false,
      updatedAt: '2026-07-05T15:00:00.000Z',
    });
    expect(localStorage.getItem(CURRICULUM_PROGRESS_STORAGE_KEY)).not.toContain('Villain');
  });
});
