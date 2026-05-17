import type { VillainArchetype } from '../types/villain';

export interface DemoVillain {
  name: string;
  archetype: VillainArchetype;
  // Tendency weights (0-1)
  vpipWeight: number;
  pfrWeight: number;
  threeBetWeight: number;
  foldToCbetWeight: number;
  aggressionWeight: number; // For AF
}

export const DEMO_VILLAINS: DemoVillain[] = [
  {
    name: 'Tight Tim',
    archetype: 'nit',
    vpipWeight: 0.15,
    pfrWeight: 0.12,
    threeBetWeight: 0.05,
    foldToCbetWeight: 0.6,
    aggressionWeight: 0.2,
  },
  {
    name: 'Loose Leo',
    archetype: 'fish',
    vpipWeight: 0.45,
    pfrWeight: 0.15,
    threeBetWeight: 0.08,
    foldToCbetWeight: 0.3,
    aggressionWeight: 0.4,
  },
  {
    name: 'Aggro Ava',
    archetype: 'lag',
    vpipWeight: 0.32,
    pfrWeight: 0.28,
    threeBetWeight: 0.14,
    foldToCbetWeight: 0.4,
    aggressionWeight: 0.8,
  },
  {
    name: 'Station Sam',
    archetype: 'calling_station',
    vpipWeight: 0.38,
    pfrWeight: 0.1,
    threeBetWeight: 0.04,
    foldToCbetWeight: 0.2,
    aggressionWeight: 0.1,
  },
  {
    name: 'Nit Nora',
    archetype: 'nit',
    vpipWeight: 0.12,
    pfrWeight: 0.1,
    threeBetWeight: 0.03,
    foldToCbetWeight: 0.7,
    aggressionWeight: 0.2,
  },
  {
    name: 'TAG Toby',
    archetype: 'tag',
    vpipWeight: 0.24,
    pfrWeight: 0.2,
    threeBetWeight: 0.09,
    foldToCbetWeight: 0.5,
    aggressionWeight: 0.6,
  },
  {
    name: 'Maniac Mike',
    archetype: 'maniac',
    vpipWeight: 0.55,
    pfrWeight: 0.45,
    threeBetWeight: 0.25,
    foldToCbetWeight: 0.2,
    aggressionWeight: 0.95,
  },
  {
    name: 'Fishy Frank',
    archetype: 'fish',
    vpipWeight: 0.5,
    pfrWeight: 0.05,
    threeBetWeight: 0.02,
    foldToCbetWeight: 0.4,
    aggressionWeight: 0.3,
  },
  {
    name: 'Steady Stan',
    archetype: 'tag',
    vpipWeight: 0.22,
    pfrWeight: 0.19,
    threeBetWeight: 0.08,
    foldToCbetWeight: 0.5,
    aggressionWeight: 0.5,
  },
  {
    name: 'Bling Bill',
    archetype: 'lag',
    vpipWeight: 0.35,
    pfrWeight: 0.3,
    threeBetWeight: 0.12,
    foldToCbetWeight: 0.4,
    aggressionWeight: 0.7,
  }
];
