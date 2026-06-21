import { describe, it, expect } from 'vitest';
import { parsePokerStarsFile, type ParsedHand } from '../pokerstars';

/**
 * Chip-accounting regression suite (EPIC A1 keystone).
 *
 * Two source-level bugs corrupted every money/bb metric in contested pots:
 *   1. `raises X to Y` recorded the "by" increment X as chips committed, when
 *      the chips actually added are Y − (this player's current street level).
 *   2. `Uncalled bet (X) returned to Y` was unhandled, so wagered-but-returned
 *      chips stayed counted as invested.
 *
 * Each test below fails on the pre-fix parser and passes after. The
 * conservation checks (Σ of every player's net === 0 when rake is 0) only hold
 * once both bugs are fixed.
 */

/** Sum of every player's net (hero + villains). Conserves to −rake. */
function netSum(p: ParsedHand): number {
  const heroNet = p.hand.heroChipsAfter - p.hand.heroChipsBefore;
  const villainNet = p.hand.villainDeltas.reduce((s, v) => s + v.net, 0);
  return heroNet + villainNet;
}

describe('PokerStars chip accounting (EPIC A1)', () => {
  it('counts a raise as the full chips committed, not the "by" increment', () => {
    // HU: scorza23 is the button/SB. Posts 50, raises to 200 (commits 150
    // more → 200 total). The pre-fix parser counted 50 + 100 = 150.
    const hand = `PokerStars Hand #900000001: Tournament #1, $1.00+$0.00 USD Hold'em No Limit - Level I (50/100) - 2026/01/01 12:00:00 UTC [2026/01/01 07:00:00 ET]
Table '1 1' 2-max Seat #1 is the button
Seat 1: scorza23 (10000 in chips)
Seat 2: villain (10000 in chips)
scorza23: posts small blind 50
villain: posts big blind 100
*** HOLE CARDS ***
Dealt to scorza23 [Ah Kh]
scorza23: raises 100 to 200
villain: calls 100
*** FLOP *** [2c 7d 9s]
villain: checks
scorza23: checks
*** TURN *** [2c 7d 9s] [3h]
villain: checks
scorza23: checks
*** RIVER *** [2c 7d 9s 3h] [4c]
villain: checks
scorza23: checks
*** SHOW DOWN ***
villain: shows [Ac As] (a pair of Aces)
scorza23: shows [Ah Kh] (high card Ace)
villain collected 400 from pot
*** SUMMARY ***
Total pot 400 | Rake 0
Board [2c 7d 9s 3h 4c]
Seat 1: scorza23 (small blind) showed [Ah Kh] and lost
Seat 2: villain (big blind) showed [Ac As] and won (400)`;

    const [parsed] = parsePokerStarsFile(hand);
    expect(parsed).toBeDefined();

    // scorza23 committed 200 and won nothing → net −200 (not −150).
    expect(parsed!.hand.heroChipsAfter - parsed!.hand.heroChipsBefore).toBe(-200);
    expect(parsed!.hand.villainDeltas.find((v) => v.name === 'villain')!.net).toBe(200);
    expect(netSum(parsed!)).toBe(0);
  });

  it('returns an uncalled bet to the bettor (real fixture hand #259749361298)', () => {
    // a5407277 open-shoves the flop for 4795, everyone folds, the bet is
    // returned. True net: +705 (won 870, invested 165). Pre-fix: −4090.
    const hand = `PokerStars Hand #259749361298: Tournament #3974723402, $1.40+$0.10 USD Hold'em No Limit - Level II (75/150) - 2026/02/16 15:08:42 UTC [2026/02/16 10:08:42 ET]
Table '3974723402 1' 8-max Seat #8 is the button
Seat 1: a5407277 (4960 in chips)
Seat 2: denise741 (9450 in chips)
Seat 3: Dallvi (10270 in chips)
Seat 4: scorza23 (9800 in chips)
Seat 5: buddahsmoka (9980 in chips)
Seat 6: doctoregg888 (7270 in chips)
Seat 8: cove-2019 (18980 in chips)
a5407277: posts the ante 15
denise741: posts the ante 15
Dallvi: posts the ante 15
scorza23: posts the ante 15
buddahsmoka: posts the ante 15
doctoregg888: posts the ante 15
cove-2019: posts the ante 15
a5407277: posts small blind 75
denise741: posts big blind 150
*** HOLE CARDS ***
Dealt to scorza23 [9s 8h]
Dallvi: folds
scorza23: folds
buddahsmoka: calls 150
doctoregg888: calls 150
cove-2019: calls 150
a5407277: calls 75
denise741: checks
*** FLOP *** [7d Tc 8d]
a5407277: bets 4795 and is all-in
denise741: folds
buddahsmoka: folds
doctoregg888: folds
cove-2019: folds
Uncalled bet (4795) returned to a5407277
a5407277 collected 870 from pot
a5407277: doesn't show hand
*** SUMMARY ***
Total pot 870 | Rake 0
Board [7d Tc 8d]`;

    const [parsed] = parsePokerStarsFile(hand);
    expect(parsed).toBeDefined();

    const shover = parsed!.hand.villainDeltas.find((v) => v.name === 'a5407277');
    expect(shover!.net).toBe(705);
  });

  it('handles an open + c-bet + uncalled return together (and conserves)', () => {
    // scorza23 opens to 250, c-bets 150, villain folds, bet returned.
    // Net: won 580, invested 260 (ante 10 + raise 250 + bet 150 − return 150).
    const hand = `PokerStars Hand #900000003: Tournament #1, $1.00+$0.00 USD Hold'em No Limit - Level I (50/100) - 2026/01/01 12:00:00 UTC [2026/01/01 07:00:00 ET]
Table '1 1' 6-max Seat #1 is the button
Seat 1: scorza23 (10000 in chips)
Seat 2: sbVillain (10000 in chips)
Seat 3: bbVillain (10000 in chips)
scorza23: posts the ante 10
sbVillain: posts the ante 10
bbVillain: posts the ante 10
sbVillain: posts small blind 50
bbVillain: posts big blind 100
*** HOLE CARDS ***
Dealt to scorza23 [Ah Kh]
scorza23: raises 150 to 250
sbVillain: folds
bbVillain: calls 150
*** FLOP *** [2c 7d 9s]
bbVillain: checks
scorza23: bets 150
bbVillain: folds
Uncalled bet (150) returned to scorza23
scorza23 collected 580 from pot
*** SUMMARY ***
Total pot 580 | Rake 0
Board [2c 7d 9s]`;

    const [parsed] = parsePokerStarsFile(hand);
    expect(parsed).toBeDefined();

    expect(parsed!.hand.heroChipsAfter - parsed!.hand.heroChipsBefore).toBe(320);
    expect(parsed!.hand.villainDeltas.find((v) => v.name === 'bbVillain')!.net).toBe(-260);
    expect(parsed!.hand.villainDeltas.find((v) => v.name === 'sbVillain')!.net).toBe(-60);
    expect(netSum(parsed!)).toBe(0);
  });
});
