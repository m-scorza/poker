import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePokerStarsFile } from '../pokerstars';
import { parseGGPokerFile } from '../ggpoker';

/**
 * Regression coverage for the parser chip-accounting keystone fix:
 *
 *   1. "raises X to Y" records chips actually ADDED (Y − this player's current
 *      street investment), not the "raises BY" increment X.
 *   2. "Uncalled bet (X) returned to Y" hands X back to the bettor, so it never
 *      entered the pot and must be removed from their investment.
 *
 * Before the fix both errors poisoned netProfit / heroChipsAfter / villainDeltas
 * (and every bb-denominated metric downstream) in contested hands. The errors
 * happen to cancel only in an uncalled open-steal, which is why spot checks and
 * the metadata-only fixture sweep missed it.
 */
describe('parser chip accounting (raise investment + uncalled bets)', () => {
  describe('PokerStars', () => {
    // Hero opens, gets one caller, c-bets the flop, villain folds, and the
    // c-bet is returned. True hero net is +125, not the +25 the old parser
    // produced (it recorded the raise as +50 and never returned the bet).
    const heroOpenUncalled = [
      "PokerStars Hand #900000000001: Tournament #999, $1.00+$0.00 USD Hold'em No Limit - Level I (25/50) - 2026/04/05 18:00:00 ET",
      "Table '999 1' 9-max Seat #1 is the button",
      'Seat 1: hero (1000 in chips)',
      'Seat 2: sbVill (1000 in chips)',
      'Seat 3: bbVill (1000 in chips)',
      'sbVill: posts small blind 25',
      'bbVill: posts big blind 50',
      '*** HOLE CARDS ***',
      'Dealt to hero [Ac Kc]',
      'hero: raises 50 to 100',
      'sbVill: folds',
      'bbVill: calls 50',
      '*** FLOP *** [2d 7s Th]',
      'bbVill: checks',
      'hero: bets 150',
      'bbVill: folds',
      'Uncalled bet (150) returned to hero',
      'hero collected 225 from pot',
      '*** SUMMARY ***',
      'Total pot 225 | Rake 0',
      'Board [2d 7s Th]',
      'Seat 1: hero (button) collected (225)',
      'Seat 2: sbVill (small blind) folded before Flop',
      'Seat 3: bbVill (big blind) folded on the Flop',
    ].join('\n');

    it('records true +125 net (not +25) for an open + uncalled c-bet', () => {
      const [parsed] = parsePokerStarsFile(heroOpenUncalled, 'hero');
      expect(parsed).toBeDefined();
      // hero: invests 100 preflop, bets 150 and gets it back → 100 invested,
      // collects 225 → 1000 − 100 + 225 = 1125 (net +125).
      expect(parsed!.hand.heroChipsBefore).toBe(1000);
      expect(parsed!.hand.heroChipsAfter).toBe(1125);
    });

    it('keeps chips conserved across all players (Σ net === 0)', () => {
      const [parsed] = parsePokerStarsFile(heroOpenUncalled, 'hero');
      const heroNet = parsed!.hand.heroChipsAfter - parsed!.hand.heroChipsBefore;
      const sbVill = parsed!.hand.villainDeltas.find((v) => v.name === 'sbVill')!;
      const bbVill = parsed!.hand.villainDeltas.find((v) => v.name === 'bbVill')!;
      expect(heroNet).toBe(125);
      expect(sbVill.net).toBe(-25);
      expect(bbVill.net).toBe(-100);
      expect(heroNet + sbVill.net + bbVill.net).toBe(0);
    });

    // Hero is the SB: posts 25, then raises to 100 (chips added = 100 − 25 = 75,
    // not the "raises BY" increment). BB folds, the unmatched 50 is returned.
    const heroSbRaiseUncalled = [
      "PokerStars Hand #900000000002: Tournament #999, $1.00+$0.00 USD Hold'em No Limit - Level I (25/50) - 2026/04/05 18:05:00 ET",
      "Table '999 1' 9-max Seat #1 is the button",
      'Seat 1: btnVill (1000 in chips)',
      'Seat 2: hero (1000 in chips)',
      'Seat 3: bbVill (1000 in chips)',
      'hero: posts small blind 25',
      'bbVill: posts big blind 50',
      '*** HOLE CARDS ***',
      'Dealt to hero [Ac Kc]',
      'btnVill: folds',
      'hero: raises 50 to 100',
      'bbVill: folds',
      'Uncalled bet (50) returned to hero',
      'hero collected 100 from pot',
      '*** SUMMARY ***',
      'Total pot 100 | Rake 0',
      'Seat 1: btnVill (button) folded before Flop',
      'Seat 2: hero (small blind) collected (100)',
      'Seat 3: bbVill (big blind) folded before Flop',
    ].join('\n');

    it('accounts for the posted blind when the SB raises (adds 75, not 50)', () => {
      const [parsed] = parsePokerStarsFile(heroSbRaiseUncalled, 'hero');
      // hero invests 25 (SB) + 75 (raise to 100) = 100, gets 50 back → 50
      // invested, collects 100 → 1000 − 50 + 100 = 1050 (net +50).
      expect(parsed!.hand.heroChipsAfter).toBe(1050);
      const bbVill = parsed!.hand.villainDeltas.find((v) => v.name === 'bbVill')!;
      expect(bbVill.net).toBe(-50);
    });

    it('subtracts an uncalled bet from the bettor in a real fixture hand', () => {
      // Hand #259749361298: a5407277 shoves 4795 on the flop, everyone folds,
      // and the bet is returned. Net = collected 870 − invested 165 = +705.
      // The old parser counted the full 4795, producing a nonsensical −4090.
      const file = join(
        __dirname, '..', '..', 'test', 'fixtures', 'pokerstars', 'hh',
        "HH20260216 T3974723402 No Limit Hold'em US$ 1,40 + US$ 0,10.txt",
      );
      const parsed = parsePokerStarsFile(readFileSync(file, 'utf8'), 'scorza23');
      const hand = parsed.find((p) => p.hand.id === '259749361298')!;
      expect(hand).toBeDefined();
      const shover = hand.hand.villainDeltas.find((v) => v.name === 'a5407277')!;
      expect(shover.net).toBe(705);
    });
  });

  describe('GGPoker', () => {
    // GGPoker uses the same "raises X to Y" and "Uncalled bet" phrasings in
    // whole chips. Hero opens to 240 (0 prior street investment → adds 240),
    // the BB calls 160, hero c-bets 200 on the flop and it is returned.
    const ggHeroOpenUncalled = [
      "Poker Hand #GG900001: Tournament #555, Test $5 Hold'em No Limit - Level1(50/100) - 2026/04/18 20:00:00",
      "Table '1' 6-max Seat #1 is the button",
      'Seat 1: Hero (5,000 in chips)',
      'Seat 2: vSB (5,000 in chips)',
      'Seat 3: vBB (5,000 in chips)',
      'vSB: posts small blind 50',
      'vBB: posts big blind 100',
      '*** HOLE CARDS ***',
      'Dealt to Hero [Ad Kd]',
      'Hero: raises 140 to 240',
      'vSB: folds',
      'vBB: calls 140',
      '*** FLOP *** [2c 7h Js]',
      'vBB: checks',
      'Hero: bets 200',
      'vBB: folds',
      'Uncalled bet (200) returned to Hero',
      '*** SUMMARY ***',
      'Total pot 530 | Rake 0',
      'Board [2c 7h Js]',
      'Seat 1: Hero (button) won (530)',
      'Seat 2: vSB (small blind) folded before Flop',
      'Seat 3: vBB (big blind) folded on the Flop',
    ].join('\n');

    it('records true +290 net for an open + uncalled c-bet', () => {
      const [parsed] = parseGGPokerFile(ggHeroOpenUncalled, 'scorza23');
      expect(parsed).toBeDefined();
      // Hero invests 240 preflop, bets 200 and gets it back → 240 invested,
      // collects 530 → 5000 − 240 + 530 = 5290 (net +290).
      expect(parsed!.hand.heroChipsBefore).toBe(5000);
      expect(parsed!.hand.heroChipsAfter).toBe(5290);
    });

    it('keeps chips conserved across all players (Σ net === 0)', () => {
      const [parsed] = parseGGPokerFile(ggHeroOpenUncalled, 'scorza23');
      const heroNet = parsed!.hand.heroChipsAfter - parsed!.hand.heroChipsBefore;
      const vSB = parsed!.hand.villainDeltas.find((v) => v.name === 'vSB')!;
      const vBB = parsed!.hand.villainDeltas.find((v) => v.name === 'vBB')!;
      expect(heroNet).toBe(290);
      expect(vSB.net).toBe(-50);
      expect(vBB.net).toBe(-240);
      expect(heroNet + vSB.net + vBB.net).toBe(0);
    });
  });
});
