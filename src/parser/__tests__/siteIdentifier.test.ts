import { describe, it, expect } from 'vitest';
import { identifyFile } from '../siteIdentifier';

describe('identifyFile', () => {
  it('identifies PokerStars Hand History', () => {
    const content = 'PokerStars Hand #259749325924: Tournament #3974723402...';
    const result = identifyFile(content);
    expect(result.site).toBe('pokerstars');
    expect(result.type).toBe('hand_history');
  });

  it('identifies PokerStars Tournament Summary', () => {
    const content = 'PokerStars Tournament #3974723402, Summary...';
    const result = identifyFile(content);
    expect(result.site).toBe('pokerstars');
    expect(result.type).toBe('tournament_summary');
  });

  it('identifies GGPoker Hand History', () => {
    const content = 'GGPoker Hand #...';
    const result = identifyFile(content);
    expect(result.site).toBe('ggpoker');
    expect(result.type).toBe('hand_history');
  });

  it('identifies GGPoker Tournament Summary without PokerCraft string', () => {
    const tsSample = `
Tournament #279233755, Step 1 - $0.50 All-in or Fold, AoF Hold'em No Limit
Buy-in: $0.5
4 Players
Total Prize Pool: $2
Tournament started 2026/04/18 16:46:03 
3rd : Hero, $0
You finished the tournament in 3rd place.
You received a total of $0.
    `;
    const result = identifyFile(tsSample);
    expect(result.site).toBe('ggpoker');
    expect(result.type).toBe('tournament_summary');
  });

  it('returns unknown for garbage', () => {
    const result = identifyFile('some random text');
    expect(result.site).toBe('unknown');
    expect(result.type).toBe('unknown');
  });
});
