import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.unmock('../store');

// happy-dom 20.9 + vitest does not expose a working `localStorage.setItem`.
// Install an in-memory Storage shim BEFORE importing modules that touch it
// at load time (Zustand persist in appStore).
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

function throwingStorage(error: Error): Storage {
  return {
    get length() {
      return localStorage.length;
    },
    clear: () => localStorage.clear(),
    getItem: (k: string) => localStorage.getItem(k),
    key: (i: number) => localStorage.key(i),
    removeItem: (k: string) => localStorage.removeItem(k),
    setItem: () => {
      throw error;
    },
  };
}

import {
  KEYS,
  RANGE_PREFIX,
  LEGACY_RANGE_PREFIX,
  CURRENT_RANGE_VERSION,
  safeGet,
  safeSet,
  safeRemove,
  listKeysWithPrefix,
  validateRangeEnvelope,
} from '../localStorage';
import { saveCustomRange, loadCustomRange, loadAllCustomRanges, deleteCustomRange } from '../store';
import { mergePersistedSettings, isValidStrategyProfile } from '../appStore';

beforeEach(() => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k !== null) keys.push(k);
  }
  for (const k of keys) localStorage.removeItem(k);
});

describe('safeGet', () => {
  it('returns fallback when key is missing', () => {
    const result = safeGet('missing', (raw) => (typeof raw === 'string' ? raw : null), 'default');
    expect(result).toBe('default');
  });

  it('returns fallback on malformed JSON', () => {
    localStorage.setItem('bad', '{not json');
    const result = safeGet('bad', (raw) => (typeof raw === 'string' ? raw : null), 'default');
    expect(result).toBe('default');
  });

  it('returns fallback when validator rejects', () => {
    localStorage.setItem('wrong-shape', JSON.stringify({ unexpected: true }));
    const result = safeGet<string>(
      'wrong-shape',
      (raw) => (typeof raw === 'string' ? raw : null),
      'default',
    );
    expect(result).toBe('default');
  });

  it('returns the validated value on valid data', () => {
    localStorage.setItem('ok', JSON.stringify('hello'));
    const result = safeGet<string>(
      'ok',
      (raw) => (typeof raw === 'string' ? raw : null),
      'default',
    );
    expect(result).toBe('hello');
  });
});

describe('safeSet', () => {
  it('writes JSON-serialized value', () => {
    const result = safeSet('k', { a: 1 });
    expect(result).toEqual({ ok: true });
    const parsed: unknown = JSON.parse(localStorage.getItem('k')!);
    expect(parsed).toEqual({ a: 1 });
  });

  it('reports quota errors as { ok: false, reason: "quota" }', () => {
    const err = new Error('quota');
    err.name = 'QuotaExceededError';
    const result = safeSet('k', 'v', throwingStorage(err));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('quota');
  });

  it('reports non-quota errors as { ok: false, reason: "unknown" }', () => {
    const result = safeSet('k', 'v', throwingStorage(new Error('weird')));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unknown');
  });
});

describe('safeRemove', () => {
  it('removes a key', () => {
    localStorage.setItem('k', 'v');
    safeRemove('k');
    expect(localStorage.getItem('k')).toBeNull();
  });

  it('does not throw when key is missing', () => {
    expect(() => safeRemove('absent')).not.toThrow();
  });
});

describe('listKeysWithPrefix', () => {
  it('returns only keys with the given prefix', () => {
    localStorage.setItem('poker:range:UTG', '[]');
    localStorage.setItem('poker:range:BTN', '[]');
    localStorage.setItem('something-else', 'x');
    const keys = listKeysWithPrefix('poker:range:').sort();
    expect(keys).toEqual(['poker:range:BTN', 'poker:range:UTG']);
  });
});

describe('validateRangeEnvelope', () => {
  it('accepts a bare legacy string[] and normalises to v1', () => {
    const result = validateRangeEnvelope(['AKs', 'KK']);
    expect(result).toEqual({ version: 1, hands: ['AKs', 'KK'] });
  });

  it('accepts a v1 envelope', () => {
    const result = validateRangeEnvelope({ version: 1, hands: ['QQ'] });
    expect(result).toEqual({ version: 1, hands: ['QQ'] });
  });

  it('rejects mixed-type arrays', () => {
    expect(validateRangeEnvelope([1, 2, 3])).toBeNull();
    expect(validateRangeEnvelope(['AKs', 99])).toBeNull();
  });

  it('rejects unknown shapes', () => {
    expect(validateRangeEnvelope({ version: 2, hands: [] })).toBeNull();
    expect(validateRangeEnvelope({ hands: ['AKs'] })).toBeNull();
    expect(validateRangeEnvelope('garbage')).toBeNull();
    expect(validateRangeEnvelope(null)).toBeNull();
  });
});

describe('custom-range helpers', () => {
  it('round-trips a saved range under the namespaced prefix', () => {
    const result = saveCustomRange('UTG', ['AKs', 'KK']);
    expect(result.ok).toBe(true);

    const raw = localStorage.getItem(KEYS.customRange('UTG'));
    expect(raw).not.toBeNull();
    const persisted: unknown = JSON.parse(raw!);
    expect(persisted).toEqual({ version: CURRENT_RANGE_VERSION, hands: ['AKs', 'KK'] });

    const loaded = loadCustomRange('UTG');
    expect(loaded).toEqual(new Set(['AKs', 'KK']));
  });

  it('reads a legacy bare-array key and migrates it to the new prefix', () => {
    localStorage.setItem(`${LEGACY_RANGE_PREFIX}MP1`, JSON.stringify(['77', 'A5s']));

    const loaded = loadCustomRange('MP1');
    expect(loaded).toEqual(new Set(['77', 'A5s']));

    expect(localStorage.getItem(`${LEGACY_RANGE_PREFIX}MP1`)).toBeNull();
    const raw = localStorage.getItem(`${RANGE_PREFIX}MP1`);
    expect(raw).not.toBeNull();
    const persisted: unknown = JSON.parse(raw!);
    expect(persisted).toEqual({ version: CURRENT_RANGE_VERSION, hands: ['77', 'A5s'] });
  });

  it('returns null for a malformed stored value', () => {
    localStorage.setItem(KEYS.customRange('BTN'), '{not json');
    expect(loadCustomRange('BTN')).toBeNull();
  });

  it('returns null when the stored shape is wrong', () => {
    localStorage.setItem(KEYS.customRange('BTN'), JSON.stringify({ version: 99, hands: ['AKs'] }));
    expect(loadCustomRange('BTN')).toBeNull();
  });

  it('loadAllCustomRanges merges legacy and namespaced keys, new prefix wins on collision', () => {
    localStorage.setItem(`${LEGACY_RANGE_PREFIX}UTG`, JSON.stringify(['AA']));
    saveCustomRange('UTG', ['KK']); // also writes to new prefix
    saveCustomRange('BTN', ['QQ']);
    localStorage.setItem(`${LEGACY_RANGE_PREFIX}CO`, JSON.stringify(['JJ']));

    const all = loadAllCustomRanges();
    expect(all.get('UTG')).toEqual(new Set(['KK']));
    expect(all.get('BTN')).toEqual(new Set(['QQ']));
    expect(all.get('CO')).toEqual(new Set(['JJ']));
  });

  it('deleteCustomRange removes both legacy and namespaced keys', () => {
    saveCustomRange('HJ', ['QQ']);
    localStorage.setItem(`${LEGACY_RANGE_PREFIX}HJ`, JSON.stringify(['JJ']));
    deleteCustomRange('HJ');
    expect(localStorage.getItem(KEYS.customRange('HJ'))).toBeNull();
    expect(localStorage.getItem(`${LEGACY_RANGE_PREFIX}HJ`)).toBeNull();
  });
});

describe('appStore persist validator', () => {
  const defaults = { strategyProfile: 'game_plan' as const, heroName: 'scorza23' };

  it('accepts a valid persisted payload', () => {
    const result = mergePersistedSettings(
      { strategyProfile: 'advanced', heroName: 'alice' },
      defaults,
    );
    expect(result.strategyProfile).toBe('advanced');
    expect(result.heroName).toBe('alice');
  });

  it('falls back when strategyProfile is unknown', () => {
    const result = mergePersistedSettings(
      { strategyProfile: 'nonsense', heroName: 'alice' },
      defaults,
    );
    expect(result.strategyProfile).toBe('game_plan');
    expect(result.heroName).toBe('alice');
  });

  it('falls back when heroName is empty or wrong type', () => {
    expect(
      mergePersistedSettings({ strategyProfile: 'advanced', heroName: '' }, defaults).heroName,
    ).toBe('scorza23');
    expect(
      mergePersistedSettings({ strategyProfile: 'advanced', heroName: 42 }, defaults).heroName,
    ).toBe('scorza23');
  });

  it('falls back when persisted is null or undefined', () => {
    expect(mergePersistedSettings(null, defaults)).toEqual(defaults);
    expect(mergePersistedSettings(undefined, defaults)).toEqual(defaults);
  });

  it('isValidStrategyProfile guards correctly', () => {
    expect(isValidStrategyProfile('game_plan')).toBe(true);
    expect(isValidStrategyProfile('advanced')).toBe(true);
    expect(isValidStrategyProfile('garbage')).toBe(false);
    expect(isValidStrategyProfile(null)).toBe(false);
    expect(isValidStrategyProfile(123)).toBe(false);
  });
});
