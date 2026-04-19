import { describe, it, expect } from 'vitest';
import { parseGGPokerFile } from '../ggpoker';
import { identifyFile } from '../siteIdentifier';

describe('GGPoker Robustness', () => {
  const ggCase1 = `
GGPoker Hand #BR222222: Tournament #12345, Mystery Battle Royale $3
Table '1' 5-max Seat #1 is the button
Seat 1: Player1 (1000 in chips)
Seat 5: Hero (1000 in chips)
Hero: posts small blind 10
Player1: posts big blind 20
*** HOLE CARDS ***
Dealt to Hero [As Ks]
Hero: raises 40 to 60
Player1: folds
*** SUMMARY ***
Total pot 50 | Rake 0
Board []
Seat 5: Hero (small blind) won (50)
`;

  const ggCase2 = `
Hand #BR333333: Tournament #12345, Mystery Battle Royale $3
Table '1' 5-max Seat #1 is the button
Seat 1: Player1 (1000 in chips)
Seat 5: Hero (1000 in chips)
*** HOLE CARDS ***
Dealt to Hero [Ah Kh]
Hero: checks
*** SUMMARY ***
`;

  it('identifies GGPoker with different headers', () => {
    expect(identifyFile(ggCase1).site).toBe('ggpoker');
    expect(identifyFile(ggCase2).site).toBe('ggpoker');
  });

  it('parses GGPoker Hand #', () => {
    const hands = parseGGPokerFile(ggCase1, 'scorza23');
    expect(hands).toHaveLength(1);
    expect(hands[0]!.hand.id).toBe('BR222222');
  });

  it('parses Hand # (direct)', () => {
    const hands = parseGGPokerFile(ggCase2, 'scorza23');
    expect(hands).toHaveLength(1);
    expect(hands[0]!.hand.id).toBe('BR333333');
  });
});
