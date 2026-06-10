import { describe, it, expect } from 'vitest';

class MemoryStorage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  configurable: true,
  writable: true,
});

import {
  validateRFIRanges,
  validatePushRanges,
  rangeAccuracyScore,
  rangeValidationSummary,
} from '../rangeValidator';
import { saveCustomRange, deleteCustomRange } from '../../data/store';

describe('validateRFIRanges', () => {
  it('returns results for all RFI positions', () => {
    const results = validateRFIRanges();
    expect(results.length).toBe(8); // UTG, UTG+1, MP1, MP2, HJ, CO, BTN, SB
  });

  it('each result has required fields', () => {
    const results = validateRFIRanges();
    for (const r of results) {
      expect(r.position).toBeTruthy();
      expect(r.ourCount).toBeGreaterThan(0);
      expect(r.ourPct).toBeGreaterThan(0);
      expect(r.solverPct).toBeGreaterThan(0);
      expect(r.delta).toBeGreaterThanOrEqual(0);
      expect(['wider', 'tighter', 'match']).toContain(r.direction);
      expect(['high', 'medium', 'low']).toContain(r.confidence);
      expect(r.note.length).toBeGreaterThan(0);
    }
  });

  it('UTG is the tightest position', () => {
    const results = validateRFIRanges();
    const utg = results.find((r) => r.position === 'UTG')!;
    const btn = results.find((r) => r.position === 'BTN')!;
    expect(utg.ourPct).toBeLessThan(btn.ourPct);
  });

  it('positions get progressively wider', () => {
    const results = validateRFIRanges();
    const order = ['UTG', 'UTG+1', 'MP1', 'HJ', 'CO', 'BTN'];
    for (let i = 1; i < order.length; i++) {
      const prev = results.find((r) => r.position === order[i - 1])!;
      const curr = results.find((r) => r.position === order[i])!;
      expect(curr.ourPct).toBeGreaterThanOrEqual(prev.ourPct);
    }
  });

  it('accepts different stack depths', () => {
    const at30 = validateRFIRanges(30);
    const at100 = validateRFIRanges(100);

    // Solver baselines are wider at 100bb than 30bb
    const btn30 = at30.find((r) => r.position === 'BTN')!;
    const btn100 = at100.find((r) => r.position === 'BTN')!;
    expect(btn100.solverPct).toBeGreaterThan(btn30.solverPct);
  });

  it('most positions have high or medium confidence', () => {
    const results = validateRFIRanges();
    const highMedium = results.filter((r) => r.confidence === 'high' || r.confidence === 'medium');
    expect(highMedium.length).toBeGreaterThanOrEqual(results.length / 2);
  });

  it('respects user-saved custom RFI ranges', () => {
    const customUTG = ['AA', 'KK', 'QQ'];
    saveCustomRange('UTG', customUTG);

    try {
      const results = validateRFIRanges();
      const utg = results.find((r) => r.position === 'UTG')!;
      expect(utg.ourCount).toBe(3);
    } finally {
      deleteCustomRange('UTG');
    }

    const reverted = validateRFIRanges();
    const utgReverted = reverted.find((r) => r.position === 'UTG')!;
    expect(utgReverted.ourCount).not.toBe(3);
  });
});

describe('validatePushRanges', () => {
  it('returns results for push range positions', () => {
    const results = validatePushRanges();
    expect(results.length).toBeGreaterThan(0);
  });

  it('each result references 10bb solver baseline', () => {
    const results = validatePushRanges();
    for (const r of results) {
      expect(r.solverPct).toBeGreaterThan(0);
      expect(r.note).toBeTruthy();
    }
  });

  it('SB has the widest push range', () => {
    const results = validatePushRanges();
    const sb = results.find((r) => r.position === 'SB');
    if (sb) {
      const others = results.filter((r) => r.position !== 'SB');
      for (const r of others) {
        expect(sb.ourPct).toBeGreaterThanOrEqual(r.ourPct);
      }
    }
  });
});

describe('rangeAccuracyScore', () => {
  it('returns 100 for empty results', () => {
    expect(rangeAccuracyScore([])).toBe(100);
  });

  it('returns high score when deltas are small', () => {
    const results = validateRFIRanges();
    const score = rangeAccuracyScore(results);
    // Our ranges are based on the game plan, should be reasonably close to solver
    expect(score).toBeGreaterThan(50);
  });

  it('returns lower score for larger deltas', () => {
    const smallDelta = rangeAccuracyScore([
      { position: 'UTG', ourCount: 20, ourPct: 12, solverPct: 13, delta: 1, direction: 'tighter', confidence: 'high', note: '' },
    ]);
    const largeDelta = rangeAccuracyScore([
      { position: 'UTG', ourCount: 20, ourPct: 12, solverPct: 25, delta: 13, direction: 'tighter', confidence: 'low', note: '' },
    ]);
    expect(smallDelta).toBeGreaterThan(largeDelta);
  });
});

describe('rangeValidationSummary', () => {
  it('returns RFI, push, and overall scores', () => {
    const summary = rangeValidationSummary();

    expect(summary.rfi.results.length).toBeGreaterThan(0);
    expect(summary.rfi.score).toBeGreaterThanOrEqual(0);
    expect(summary.rfi.score).toBeLessThanOrEqual(100);

    expect(summary.push.results.length).toBeGreaterThan(0);
    expect(summary.push.score).toBeGreaterThanOrEqual(0);
    expect(summary.push.score).toBeLessThanOrEqual(100);

    expect(summary.overallScore).toBeGreaterThanOrEqual(0);
    expect(summary.overallScore).toBeLessThanOrEqual(100);
  });

  it('overall score is weighted average of RFI (60%) and push (40%)', () => {
    const summary = rangeValidationSummary();
    const expected = Math.round(summary.rfi.score * 0.6 + summary.push.score * 0.4);
    expect(summary.overallScore).toBe(expected);
  });
});
