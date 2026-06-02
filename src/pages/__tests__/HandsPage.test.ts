import { describe, expect, it } from 'vitest';
import type { HandCategory } from '../../components/hands/HandsFilters';
import { getHandCategory } from '../HandsPage';

describe('getHandCategory', () => {
  it.each([
    ['AA', 'pairs'],
    ['KK', 'pairs'],
    ['22', 'pairs'],
    ['AKs', 'suited-aces'],
    ['KQs', 'broadway'],
    ['QJs', 'broadway'],
    ['JTs', 'broadway'],
    ['A9s', 'suited-aces'],
    ['A2s', 'suited-aces'],
    ['T9s', 'suited-connectors'],
    ['98s', 'suited-connectors'],
    ['54s', 'suited-connectors'],
    ['K5s', 'suited-gappers'],
    ['86s', 'suited-gappers'],
    ['Q4s', 'suited-gappers'],
    ['AKo', 'broadway'],
    ['KQo', 'broadway'],
    ['QJo', 'broadway'],
    ['A9o', 'offsuit'],
    ['J8o', 'offsuit'],
    ['72o', 'offsuit'],
  ] satisfies Array<[string, HandCategory]>)('classifies %s as %s', (handKey, expected) => {
    expect(getHandCategory(handKey)).toBe(expected);
  });
});
