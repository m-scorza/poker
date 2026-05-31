import { describe, it, expect } from 'vitest';
import { identifyFile } from '../siteIdentifier';

describe('identifyFile', () => {
  it('identifies PokerStars Hand History', () => {
    const content = 'PokerStars Hand #259749325924: Tournament #3974723402...';
    const result = identifyFile(content);
    expect(result.site).toBe('pokerstars');
    expect(result.type).toBe('hand_history');
  });

  it('detects PokerStars hand histories when the signature appears after a large email/export preamble', () => {
    const content = `${'Export preamble\n'.repeat(450)}PokerStars Hand #259749325924: Tournament #3974723402...`;
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

  it('identifies standardized Open Hand History JSON across networks', () => {
    const result = identifyFile(JSON.stringify({
      ohh: {
        spec_version: '1.2.2',
        network_name: 'iPoker Network',
        site_name: 'iPoker',
        game_number: '7948166852',
      },
    }));

    expect(result.site).toBe('open_hand_history');
    expect(result.type).toBe('hand_history');
  });

  it('identifies Open Hand History JSON larger than the text signature scan window', () => {
    const result = identifyFile(JSON.stringify({
      ohh: {
        spec_version: '1.2.2',
        network_name: 'iPoker Network',
        site_name: 'iPoker',
        game_number: '7948166852',
      },
      padding: 'x'.repeat(70000),
    }));

    expect(result.site).toBe('open_hand_history');
    expect(result.type).toBe('hand_history');
  });

  it.each([
    ['Winning Poker Network', 'Winning Poker Network Hand #55030950'],
    ['iPoker', 'Game ID 7948166852 - iPoker Network - €100 Gtd'],
    ['888poker', '888poker Hand History for Game 591212284'],
    ['partypoker', '***** Hand History for Game 123456789 ***** partypoker'],
    ['chico', 'BetOnline Hand #123456789, Chico Network'],
    ['winamax', 'Winamax Poker - Tournament HandId: #123456789'],
  ])('detects known but not-yet-native room marker: %s', (_label, content) => {
    const result = identifyFile(content);
    expect(result.site).toBe('known_unsupported');
    expect(result.type).toBe('hand_history');
  });

  it('returns unknown for garbage', () => {
    const result = identifyFile('some random text');
    expect(result.site).toBe('unknown');
    expect(result.type).toBe('unknown');
  });
});
