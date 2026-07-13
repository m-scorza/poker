/**
 * Global application state via Zustand.
 *
 * Manages UI state, active filters, and derived analysis data.
 * Strategy profile is persisted to localStorage via Zustand persist middleware.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Position, Scenario } from '../types/analysis';
import type { StrategyProfile } from '../data/strategyProfiles';
import { CURRENT_SETTINGS_VERSION, DEFAULT_HERO_NAME } from './localStorage';

const VALID_STRATEGY_PROFILES: readonly StrategyProfile[] = ['game_plan', 'advanced'] as const;

export function isValidStrategyProfile(value: unknown): value is StrategyProfile {
  return typeof value === 'string' && (VALID_STRATEGY_PROFILES as readonly string[]).includes(value);
}

export interface PersistedSettings {
  strategyProfile?: unknown;
  heroName?: unknown;
}

export function mergePersistedSettings<T extends { strategyProfile: StrategyProfile; heroName: string }>(
  persisted: PersistedSettings | null | undefined,
  current: T,
): T {
  const incoming = persisted ?? {};
  const strategyProfile = isValidStrategyProfile(incoming.strategyProfile)
    ? incoming.strategyProfile
    : current.strategyProfile;
  const heroName =
    typeof incoming.heroName === 'string' && incoming.heroName.trim().length > 0
      ? incoming.heroName
      : current.heroName;
  return { ...current, strategyProfile, heroName };
}

interface Filters {
  dateFrom: Date | null;
  dateTo: Date | null;
  position: Position | null;
  scenario: Scenario | null;
  tournamentId: string | null;
  complianceOnly: boolean | null; // true = compliant only, false = deviations only, null = all
}

export interface AppState {
  // Data Overview (counts only)
  totalHands: number;
  totalTournaments: number;

  // Settings
  heroName: string;
  strategyProfile: StrategyProfile;

  // UI
  filters: Filters;
  activeSessionId: string;
  isImporting: boolean;
  lastImportCount: number | null;
  isSeedingDemo: boolean;
  demoProgressMessage: string | null;

  // Actions
  setTotalHands: (count: number) => void;
  setTotalTournaments: (count: number) => void;
  setHeroName: (name: string) => void;
  setStrategyProfile: (profile: StrategyProfile) => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  setImporting: (importing: boolean) => void;
  setLastImportCount: (count: number | null) => void;
  setActiveSessionId: (id: string) => void;
  setDemoSeedProgress: (isSeeding: boolean, message: string | null) => void;
}

const DEFAULT_FILTERS: Filters = {
  dateFrom: null,
  dateTo: null,
  position: null,
  scenario: null,
  tournamentId: null,
  complianceOnly: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      totalHands: 0,
      totalTournaments: 0,
      heroName: DEFAULT_HERO_NAME,
      strategyProfile: 'game_plan',
      filters: { ...DEFAULT_FILTERS },
      activeSessionId: 'all',
      isImporting: false,
      lastImportCount: null,
      isSeedingDemo: false,
      demoProgressMessage: null,

      setTotalHands: (count) => set({ totalHands: count }),
      setTotalTournaments: (count) => set({ totalTournaments: count }),
      setHeroName: (heroName) => set({ heroName: heroName.trim() }),
      setStrategyProfile: (profile) => set({ strategyProfile: profile }),
      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
      setImporting: (importing) => set({ isImporting: importing }),
      setLastImportCount: (count) => set({ lastImportCount: count }),
      setActiveSessionId: (id) => set({ activeSessionId: id }),
      setDemoSeedProgress: (isSeeding, message) => set({ isSeedingDemo: isSeeding, demoProgressMessage: message }),
    }),
    {
      name: 'poker-app-settings',
      version: CURRENT_SETTINGS_VERSION,
      partialize: (state) => ({
        strategyProfile: state.strategyProfile,
        heroName: state.heroName,
      }),
      migrate: (persisted) => persisted,
      merge: (persisted, current) =>
        mergePersistedSettings(persisted as PersistedSettings | null | undefined, current),
    },
  ),
);
