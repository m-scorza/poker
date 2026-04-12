/**
 * Global application state via Zustand.
 *
 * Manages UI state, active filters, and derived analysis data.
 */

import { create } from 'zustand';
import type { Hand } from '../types/hand';
import type { HeroDecision, Position, Scenario } from '../types/analysis';
import type { StrategyProfile } from '../data/strategyProfiles';
import type { Leak, AggregateStats } from '../analysis/leakDetector';

export interface Filters {
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
  isImporting: boolean;
  lastImportCount: number | null;

  // Actions
  setTotalHands: (count: number) => void;
  setTotalTournaments: (count: number) => void;
  setHeroName: (name: string) => void;
  setStrategyProfile: (profile: StrategyProfile) => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  setImporting: (importing: boolean) => void;
  setLastImportCount: (count: number | null) => void;
}

const DEFAULT_FILTERS: Filters = {
  dateFrom: null,
  dateTo: null,
  position: null,
  scenario: null,
  tournamentId: null,
  complianceOnly: null,
};

export const useAppStore = create<AppState>((set) => ({
  totalHands: 0,
  totalTournaments: 0,
  heroName: 'scorza23',
  strategyProfile: 'game_plan',
  filters: { ...DEFAULT_FILTERS },
  isImporting: false,
  lastImportCount: null,

  setTotalHands: (count) => set({ totalHands: count }),
  setTotalTournaments: (count) => set({ totalTournaments: count }),
  setHeroName: (heroName) => set({ heroName }),
  setStrategyProfile: (profile) => set({ strategyProfile: profile }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
  setImporting: (importing) => set({ isImporting: importing }),
  setLastImportCount: (count) => set({ lastImportCount: count }),
}));
