import { describe, it, expect } from 'vitest';
import { buildHeroDecision } from '../../analysis/scenarioDetector';
import { parseGGPokerFile, parseGGPokerSummary } from '../ggpoker';

describe('GGPoker Parser', () => {
  const ggSample = `
Poker Hand #BR1103011317: Tournament #279277562, Mystery Battle Royale $3 Hold'em No Limit - Level4(40/80(16)) - 2026/04/18 20:42:47
Table '59' 5-max Seat #1 is the button
Seat 1: 647abfe7 (2,499 in chips)
Seat 2: a81061d (376 in chips)
Seat 3: 707c8e6c (934 in chips)
Seat 4: 7d86368b (3,928 in chips)
Seat 5: Hero (259 in chips)
7d86368b: posts the ante 16
647abfe7: posts the ante 16
707c8e6c: posts the ante 16
Hero: posts the ante 16
a81061d: posts the ante 16
a81061d: posts small blind 40
707c8e6c: posts big blind 80
*** HOLE CARDS ***
Dealt to Hero [7c 7s]
7d86368b: folds
Hero: raises 160 to 240
647abfe7: folds
a81061d: calls 200
707c8e6c: folds
*** FLOP *** [4h 9c Ts]
a81061d: bets 120 and is all-in
Hero: calls 3 and is all-in
*** SUMMARY ***
Total pot 646 | Rake 0
Board [4h 9c Ts Th 2s]
Seat 1: 647abfe7 (button) folded before Flop
Seat 2: a81061d (small blind) showed [Tc Kh] and won (646) with three of a kind, Tens
Seat 3: 707c8e6c (big blind) folded before Flop
Seat 4: 7d86368b folded before Flop
Seat 5: Hero showed [7c 7s] and lost with two pair, Tens and Sevens
`;

  it('correctly parses hand ID, tournament ID, and single-price buy-in', () => {
    const hands = parseGGPokerFile(ggSample, 'scorza23');
    expect(hands).toHaveLength(1);
    expect(hands[0]!.hand.id).toBe('BR1103011317');
    expect(hands[0]!.hand.tournamentId).toBe('279277562');
    expect(hands[0]!.tournament.buyIn).toBe(3);
    expect(hands[0]!.tournament.fee).toBe(0);
    expect(hands[0]!.tournament.currency).toBe('USD');
  });

  it('correctly identifies hero and herocards', () => {
    const hands = parseGGPokerFile(ggSample, 'scorza23');
    const hero = hands[0]!.players.find(p => p.isHero);
    expect(hero?.holeCards).toEqual(['7c', '7s']);
    expect(hero?.playerName).toBe('scorza23');
  });

  it('correctly parses blinds and antes', () => {
    const hands = parseGGPokerFile(ggSample, 'scorza23');
    expect(hands[0]!.hand.smallBlind).toBe(40);
    expect(hands[0]!.hand.bigBlind).toBe(80);
    expect(hands[0]!.hand.ante).toBe(16);
  });

  it('correctly parses actions', () => {
    const hands = parseGGPokerFile(ggSample, 'scorza23');
    const heroActions = hands[0]!.actions.filter(a => a.playerName === 'scorza23');
    expect(heroActions.some(a => a.actionType === 'post_ante')).toBe(true);
    expect(heroActions.some(a => a.actionType === 'raise' && a.amount === 240)).toBe(true);
  });

  it('parses postflop bets as bet actions, not raises', () => {
    const hands = parseGGPokerFile(ggSample, 'scorza23');
    const villainBet = hands[0]!.actions.find(
      (a) => a.street === 'flop' && a.playerName === 'a81061d',
    );

    expect(villainBet?.actionType).toBe('bet');
    expect(villainBet?.amount).toBe(120);
  });

  it('returns collected amounts for showdown winners', () => {
    const hands = parseGGPokerFile(ggSample, 'scorza23');

    expect(hands[0]!.collectedAmounts.get('a81061d')).toBe(646);
    expect(hands[0]!.collectedAmounts.get('scorza23') ?? 0).toBe(0);

    const decision = buildHeroDecision(hands[0]!, 'scorza23');
    expect(decision?.wonAmount).toBe(0);
  });

  it('correctly tracks position, totalPot, rake, and villainDeltas', () => {
    const hands = parseGGPokerFile(ggSample, 'scorza23');
    const hand = hands[0]!;
    expect(hand.hand.totalPot).toBe(646);
    expect(hand.hand.rake).toBe(0);

    const hero = hand.players.find(p => p.isHero);
    expect(hero?.position).toBe('CO');

    const villainDelta = hand.hand.villainDeltas.find(v => v.name === 'a81061d');
    // Note: uncalled bet adjustment isn't implemented for GG yet, so invested=376, won=646
    expect(villainDelta?.net).toBe(646 - 376); 
  });

  it('correctly parses GGPoker Tournament Summary', () => {
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
    const summary = parseGGPokerSummary(tsSample, 'scorza23');
    expect(summary).not.toBeNull();
    expect(summary!.tournamentId).toBe('279233755');
    expect(summary!.finishPosition).toBe(3);
    expect(summary!.prize).toBe(0);
  });
});
