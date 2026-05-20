import { beforeEach, describe, expect, it } from 'vitest';

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
  clearLocalHeadsUpReferenceSet,
  getLocalHeadsUpReferenceSummary,
  loadLocalHeadsUpReferenceSet,
  saveLocalHeadsUpReferenceCsv,
} from '../localHeadsUpReferences';

beforeEach(() => {
  localStorage.clear();
});

describe('local heads-up reference persistence', () => {
  const pushCsv = 'stack,A2o,72o\n8,0.8,0\n10,0.7,0';
  const callCsv = 'stack,A2o,72o\n8,0.9,0\n10,0.65,0.1';

  it('round-trips user-imported push and call CSV tables under generic local reference labels', () => {
    expect(saveLocalHeadsUpReferenceCsv('push', pushCsv, 'push-table.csv')).toEqual({ ok: true });
    expect(saveLocalHeadsUpReferenceCsv('call', callCsv, 'call-table.csv')).toEqual({ ok: true });

    const loaded = loadLocalHeadsUpReferenceSet();

    expect(loaded.push?.kind).toBe('push');
    expect(loaded.call?.kind).toBe('call');
    expect(loaded.push?.handKeys).toEqual(['A2o', '72o']);
    expect(loaded.call?.rows[1]?.frequencies.A2o).toBe(0.65);
    expect(getLocalHeadsUpReferenceSummary()).toEqual({
      push: { fileName: 'push-table.csv', hands: 2, rows: 2, minStackBb: 8, maxStackBb: 10 },
      call: { fileName: 'call-table.csv', hands: 2, rows: 2, minStackBb: 8, maxStackBb: 10 },
    });
  });

  it('rejects malformed CSV without replacing the last valid local reference', () => {
    expect(saveLocalHeadsUpReferenceCsv('push', pushCsv, 'valid.csv')).toEqual({ ok: true });

    const result = saveLocalHeadsUpReferenceCsv('push', 'stack,A2o\n8,2.5', 'bad.csv');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('invalid frequency');
    expect(getLocalHeadsUpReferenceSummary().push?.fileName).toBe('valid.csv');
    expect(loadLocalHeadsUpReferenceSet().push?.rows[0]?.frequencies.A2o).toBe(0.8);
  });

  it('clears one kind or the full reference set without touching hand-history data', () => {
    saveLocalHeadsUpReferenceCsv('push', pushCsv, 'push.csv');
    saveLocalHeadsUpReferenceCsv('call', callCsv, 'call.csv');

    clearLocalHeadsUpReferenceSet('push');
    expect(loadLocalHeadsUpReferenceSet().push).toBeUndefined();
    expect(loadLocalHeadsUpReferenceSet().call).toBeDefined();

    clearLocalHeadsUpReferenceSet();
    expect(loadLocalHeadsUpReferenceSet()).toEqual({});
    expect(getLocalHeadsUpReferenceSummary()).toEqual({});
  });
});
