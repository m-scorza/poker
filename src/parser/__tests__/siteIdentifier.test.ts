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

  it('returns unknown for garbage', () => {
    const result = identifyFile('some random text');
    expect(result.site).toBe('unknown');
    expect(result.type).toBe('unknown');
  });
});
