import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_SETTINGS_VERSION, DEFAULT_HERO_NAME } from '../localStorage';
import type { useAppStore as UseAppStoreType, mergePersistedSettings as MergeType, isValidStrategyProfile as IsValidType } from '../appStore';

// appStore.ts instantiates a Zustand `persist` store at module load, and the
// default persist storage is resolved via
// `createJSONStorage(() => window.localStorage)`. The Node test environment
// used for src/data/**/*.test.ts has neither `window` nor `localStorage`
// globally, and — critically — static `import` declarations in this test
// file are evaluated before ANY of this file's own top-level statements run
// (including ones written textually above the import), so a plain
// `Object.defineProperty(globalThis, ...)` placed above a static
// `import { useAppStore } from '../appStore'` does NOT run in time. The
// shims below are therefore applied inside `beforeAll`, and `../appStore` is
// loaded via a dynamic `import()` afterwards so the module's top-level
// `create(persist(...))` call sees a working `window.localStorage`.
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

let useAppStore: typeof UseAppStoreType;
let mergePersistedSettings: typeof MergeType;
let isValidStrategyProfile: typeof IsValidType;
let INITIAL_STATE: ReturnType<typeof UseAppStoreType.getState>;

beforeAll(async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    configurable: true,
    writable: true,
  });

  const appStoreModule = await import('../appStore');
  useAppStore = appStoreModule.useAppStore;
  mergePersistedSettings = appStoreModule.mergePersistedSettings;
  isValidStrategyProfile = appStoreModule.isValidStrategyProfile;
  INITIAL_STATE = useAppStore.getState();
});

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

describe('useAppStore defaults', () => {
  it('starts with the documented default state', () => {
    const state = useAppStore.getState();
    expect(state.totalHands).toBe(0);
    expect(state.totalTournaments).toBe(0);
    expect(state.heroName).toBe(DEFAULT_HERO_NAME);
    expect(state.strategyProfile).toBe('game_plan');
    expect(state.filters).toEqual({
      dateFrom: null,
      dateTo: null,
      position: null,
      scenario: null,
      tournamentId: null,
      complianceOnly: null,
    });
    expect(state.activeSessionId).toBe('all');
    expect(state.isImporting).toBe(false);
    expect(state.lastImportCount).toBeNull();
    expect(state.isSeedingDemo).toBe(false);
    expect(state.demoProgressMessage).toBeNull();
  });
});

describe('useAppStore actions', () => {
  it('setTotalHands / setTotalTournaments update counts independently', () => {
    useAppStore.getState().setTotalHands(120);
    useAppStore.getState().setTotalTournaments(8);
    expect(useAppStore.getState().totalHands).toBe(120);
    expect(useAppStore.getState().totalTournaments).toBe(8);
  });

  it('setHeroName overwrites the configured hero', () => {
    useAppStore.getState().setHeroName('villain42');
    expect(useAppStore.getState().heroName).toBe('villain42');
  });

  it('setHeroName trims surrounding whitespace before it reaches the persisted state', () => {
    // The write boundary normalizes the name so the value that both Zustand's
    // partialize and the boot-read (getHeroName → setHeroName) persist is always
    // trimmed — an untrimmed hero name silently breaks `Dealt to <name>` parser
    // matching. See ROADMAP III-5 and the mergePersistedSettings characterization.
    useAppStore.getState().setHeroName('  Maverick  ');
    expect(useAppStore.getState().heroName).toBe('Maverick');
  });

  it('setStrategyProfile switches profile', () => {
    useAppStore.getState().setStrategyProfile('advanced');
    expect(useAppStore.getState().strategyProfile).toBe('advanced');
  });

  it('setFilters merges into existing filters without clobbering untouched keys', () => {
    useAppStore.getState().setFilters({ position: 'BTN' });
    useAppStore.getState().setFilters({ scenario: 'RFI' });
    expect(useAppStore.getState().filters).toMatchObject({
      position: 'BTN',
      scenario: 'RFI',
    });
    // Untouched keys remain at their defaults.
    expect(useAppStore.getState().filters.tournamentId).toBeNull();
    expect(useAppStore.getState().filters.complianceOnly).toBeNull();
  });

  it('resetFilters restores the default filters object', () => {
    useAppStore.getState().setFilters({ position: 'CO', complianceOnly: true });
    useAppStore.getState().resetFilters();
    expect(useAppStore.getState().filters).toEqual({
      dateFrom: null,
      dateTo: null,
      position: null,
      scenario: null,
      tournamentId: null,
      complianceOnly: null,
    });
  });

  it('setImporting / setLastImportCount track import progress', () => {
    useAppStore.getState().setImporting(true);
    expect(useAppStore.getState().isImporting).toBe(true);
    useAppStore.getState().setLastImportCount(42);
    expect(useAppStore.getState().lastImportCount).toBe(42);
    useAppStore.getState().setImporting(false);
    expect(useAppStore.getState().isImporting).toBe(false);
  });

  it('setActiveSessionId updates the active session filter', () => {
    useAppStore.getState().setActiveSessionId('session-123');
    expect(useAppStore.getState().activeSessionId).toBe('session-123');
  });

  it('setDemoSeedProgress tracks seeding state and message together', () => {
    useAppStore.getState().setDemoSeedProgress(true, 'Seeding hands...');
    expect(useAppStore.getState().isSeedingDemo).toBe(true);
    expect(useAppStore.getState().demoProgressMessage).toBe('Seeding hands...');
    useAppStore.getState().setDemoSeedProgress(false, null);
    expect(useAppStore.getState().isSeedingDemo).toBe(false);
    expect(useAppStore.getState().demoProgressMessage).toBeNull();
  });
});

describe('isValidStrategyProfile', () => {
  it('accepts only the two known profiles', () => {
    expect(isValidStrategyProfile('game_plan')).toBe(true);
    expect(isValidStrategyProfile('advanced')).toBe(true);
    expect(isValidStrategyProfile('baseline')).toBe(false);
    expect(isValidStrategyProfile(undefined)).toBe(false);
    expect(isValidStrategyProfile({})).toBe(false);
  });
});

describe('mergePersistedSettings', () => {
  const current = { strategyProfile: 'game_plan' as const, heroName: DEFAULT_HERO_NAME };

  it('keeps both fields from a valid persisted payload', () => {
    const result = mergePersistedSettings({ strategyProfile: 'advanced', heroName: 'alice' }, current);
    expect(result).toEqual({ strategyProfile: 'advanced', heroName: 'alice' });
  });

  it('falls back to current heroName on a whitespace-only persisted name', () => {
    // Rehydration matches the setHeroName write boundary: a legacy persisted
    // name (written before setHeroName trimmed) is normalized on the way in,
    // so an untrimmed name can never re-enter the store and break the
    // `Dealt to <name>` parser matching.
    const result = mergePersistedSettings({ heroName: '   ' }, current);
    expect(result.heroName).toBe(DEFAULT_HERO_NAME);

    const untrimmed = mergePersistedSettings({ heroName: '  bob  ' }, current);
    expect(untrimmed.heroName).toBe('bob');
  });

  it('falls back to current on missing fields, null, or undefined payloads', () => {
    expect(mergePersistedSettings({}, current)).toEqual(current);
    expect(mergePersistedSettings(null, current)).toEqual(current);
    expect(mergePersistedSettings(undefined, current)).toEqual(current);
  });

  it('preserves extra keys on `current` beyond the two persisted fields', () => {
    const richCurrent = { ...current, totalHands: 99 };
    const result = mergePersistedSettings({ strategyProfile: 'advanced' }, richCurrent);
    expect(result).toEqual({ strategyProfile: 'advanced', heroName: DEFAULT_HERO_NAME, totalHands: 99 });
  });
});

describe('persist configuration', () => {
  it('is registered under the poker-app-settings localStorage key at the current settings version', () => {
    const options = useAppStore.persist.getOptions();
    expect(options.name).toBe('poker-app-settings');
    expect(options.version).toBe(CURRENT_SETTINGS_VERSION);
  });

  it('partializes to only strategyProfile and heroName, dropping everything else', () => {
    const options = useAppStore.persist.getOptions();
    const partialize = options.partialize;
    expect(partialize).toBeDefined();
    const partial = partialize!(useAppStore.getState());
    expect(partial).toEqual({
      strategyProfile: useAppStore.getState().strategyProfile,
      heroName: useAppStore.getState().heroName,
    });
  });

  it('migrate is an identity passthrough — no version-specific migration logic exists yet', () => {
    // Characterization note: `migrate: (persisted) => persisted` ignores the
    // `version` argument entirely. If CURRENT_SETTINGS_VERSION is ever bumped
    // with a genuine breaking shape change, this migrate fn will not adapt
    // old payloads — it just passes them through unchanged.
    const options = useAppStore.persist.getOptions();
    const migrate = options.migrate;
    expect(migrate).toBeDefined();
    const legacyPayload = { strategyProfile: 'advanced', heroName: 'legacy-hero', someOldField: true };
    expect(migrate!(legacyPayload, 0)).toEqual(legacyPayload);
  });

  it('merge delegates to mergePersistedSettings', () => {
    const options = useAppStore.persist.getOptions();
    const merge = options.merge;
    expect(merge).toBeDefined();
    const current = useAppStore.getState();
    const merged = merge!({ strategyProfile: 'advanced', heroName: 'carol' }, current);
    expect(merged.strategyProfile).toBe('advanced');
    expect(merged.heroName).toBe('carol');
  });
});
