import { describe, it, expect } from 'vitest';
import { extractBuyIn, stripGuarantees, MAX_PLAUSIBLE_USD_BUYIN } from '../buyInExtractor';
import { parsePokerStarsFile } from '../pokerstars';
import { parseTournamentSummary } from '../tournamentSummary';

describe('buyInExtractor', () => {
  describe('stripGuarantees', () => {
    it('removes $N GTD', () => {
      expect(stripGuarantees('$250,000 GTD $0.98+$0.12 USD')).not.toMatch(/GTD/);
      expect(stripGuarantees('$250,000 GTD $0.98+$0.12 USD')).toContain('$0.98+$0.12');
    });
    it('removes $N Guaranteed', () => {
      expect(stripGuarantees('$500 Guaranteed $5+$0.50')).not.toMatch(/Guaranteed/);
    });
    it('is a no-op without guarantees', () => {
      expect(stripGuarantees('$0.85+$0.15 USD')).toBe('$0.85+$0.15 USD');
    });
  });

  describe('canonical cash buy-ins', () => {
    it('extracts standard buy-in + fee', () => {
      const r = extractBuyIn('', '$0.85+$0.15 USD Hold\'em No Limit');
      expect(r.buyIn).toBe(0.85);
      expect(r.fee).toBe(0.15);
      expect(r.currency).toBe('USD');
      expect(r.unresolved).toBe(false);
    });
    it('extracts PKO triple form ($BUYIN+$BOUNTY+$FEE)', () => {
      // Real fixture pattern: $0.48+$0.50+$0.12 → cost 0.98, fee 0.12
      const r = extractBuyIn('', '$0.48+$0.50+$0.12 USD');
      expect(r.buyIn).toBeCloseTo(0.98);
      expect(r.fee).toBeCloseTo(0.12);
    });
    it('extracts GGPoker single-price tournament names', () => {
      const r = extractBuyIn('Mystery Battle Royale $3 Hold\'em No Limit', 'Mystery Battle Royale $3 Hold\'em No Limit');
      expect(r.buyIn).toBe(3);
      expect(r.fee).toBe(0);
      expect(r.currency).toBe('USD');
      expect(r.unresolved).toBe(false);
    });
    it('extracts GGPoker summary Buy-in lines with a single amount', () => {
      const r = extractBuyIn('', 'Buy-in: $0.5');
      expect(r.buyIn).toBe(0.5);
      expect(r.fee).toBe(0);
      expect(r.currency).toBe('USD');
      expect(r.unresolved).toBe(false);
    });
  });

  describe('guarantee injection (the $250k bug)', () => {
    it('ignores a leading $250,000 GTD and uses the real buy-in', () => {
      const r = extractBuyIn('', '$250,000 GTD $0.98+$0.12 USD Hold\'em No Limit');
      expect(r.buyIn).toBe(0.98);
      expect(r.fee).toBe(0.12);
    });
    it('returns unresolved when only a guarantee is present', () => {
      const r = extractBuyIn('', '$500,000 Guaranteed Sunday Million');
      expect(r.unresolved).toBe(true);
      expect(r.buyIn).toBe(0);
    });
  });

  describe('Brazilian locale (comma decimal)', () => {
    it('handles US$ 0,49+US$ 0,06', () => {
      const r = extractBuyIn('', 'US$ 0,49+US$ 0,06');
      expect(r.buyIn).toBeCloseTo(0.49);
      expect(r.fee).toBeCloseTo(0.06);
    });
    it('handles US$ 1,40 + US$ 0,10 (spaces)', () => {
      const r = extractBuyIn('', 'US$ 1,40 + US$ 0,10');
      expect(r.buyIn).toBeCloseTo(1.40);
      expect(r.fee).toBeCloseTo(0.10);
    });
  });

  describe('non-cash currencies', () => {
    it('classifies freerolls', () => {
      const r = extractBuyIn('Freeroll $0 entry', '');
      expect(r.currency).toBe('PLAY');
      expect(r.buyIn).toBe(0);
    });
    it('classifies play money from the name', () => {
      const r = extractBuyIn('Play Money 1M GTD', '500000+1000 play money');
      expect(r.currency).toBe('PLAY');
    });
    it('classifies tickets', () => {
      const r = extractBuyIn('Step 3 Ticket', 'Satellite Ticket');
      expect(r.currency).toBe('TICKET');
      expect(r.buyIn).toBe(0);
    });
  });

  describe('plausibility ceiling', () => {
    it('rejects USD buy-in above MAX_PLAUSIBLE_USD_BUYIN', () => {
      const r = extractBuyIn('', `$${MAX_PLAUSIBLE_USD_BUYIN + 100}+$100`);
      expect(r.unresolved).toBe(true);
      expect(r.buyIn).toBe(0);
    });
    it('accepts buy-ins at/below the ceiling', () => {
      const r = extractBuyIn('', '$1050+$100');
      expect(r.buyIn).toBe(1050);
      expect(r.fee).toBe(100);
      expect(r.unresolved).toBe(false);
    });
  });

  describe('dangerous fallback eliminated', () => {
    it('does NOT produce a buy-in from a bare N+N on the line', () => {
      // The old RE_PLAY_MONEY_BUYIN = /([\d,]+)\+([\d,]+)/ would have
      // greedily matched "250,006+60" and written $250,006 into buyIn.
      // The new extractor must refuse it unless anchored on $ or US$.
      const r = extractBuyIn('', 'No Limit Hold\'em - 250,006+60 something');
      expect(r.unresolved).toBe(true);
      expect(r.buyIn).toBe(0);
    });
  });
});

describe('pokerstars parser — buy-in regressions', () => {
  const baseHand = (header: string) => `${header}
Table '1 1' 6-max Seat #1 is the button
Seat 1: scorza23 (1500 in chips)
Seat 2: villain (1500 in chips)
scorza23: posts small blind 10
villain: posts big blind 20
*** HOLE CARDS ***
Dealt to scorza23 [Kc 5h]
scorza23: folds
villain: collected 20 from pot
*** SUMMARY ***
Total pot 20 | Rake 0
`;

  it('standard header yields correct buy-in', () => {
    const hand = baseHand(
      `PokerStars Hand #111111: Tournament #2222, $0.85+$0.15 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:16:05 UTC [2026/04/05 14:16:05 ET]`
    );
    const [p] = parsePokerStarsFile(hand);
    expect(p!.tournament.buyIn).toBe(0.85);
    expect(p!.tournament.fee).toBe(0.15);
    expect(p!.tournament.currency).toBe('USD');
  });

  it('header with $250,000 GTD does NOT poison buy-in', () => {
    const hand = baseHand(
      `PokerStars Hand #111111: Tournament #2222, $250,000 GTD $0.98+$0.12 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:16:05 UTC [2026/04/05 14:16:05 ET]`
    );
    const [p] = parsePokerStarsFile(hand);
    // Must be the real buy-in, never the guarantee.
    expect(p!.tournament.buyIn).toBe(0.98);
    expect(p!.tournament.fee).toBe(0.12);
  });

  it('freeroll header is classified as PLAY, not USD', () => {
    const hand = baseHand(
      `PokerStars Hand #111111: Tournament #2222, Freeroll Hold'em No Limit - Level I (10/20) - 2026/04/05 18:16:05 UTC [2026/04/05 14:16:05 ET]`
    );
    const [p] = parsePokerStarsFile(hand);
    expect(p!.tournament.currency).toBe('PLAY');
    expect(p!.tournament.buyIn).toBe(0);
  });
});

describe('tournamentSummary — buy-in regressions', () => {
  const baseSummary = (idLine: string, buyInLine: string) => `${idLine}
${buyInLine}
Tournament started 2026/02/15 2:45:00 UTC

1: someone (Canadá), still playing
2: scorza23 (Brasil), 1st place
You finished the tournament in 1st place.
`;

  it('standard $X/$Y buy-in is extracted', () => {
    const s = parseTournamentSummary(
      baseSummary("PokerStars Tournament #9999, No Limit Hold'em", 'Buy-In: $0.49/$0.06 USD')
    );
    expect(s!.buyIn).toBeCloseTo(0.49);
    expect(s!.fee).toBeCloseTo(0.06);
    expect(s!.currency).toBe('USD');
  });

  it('Buy-In with GTD guarantee on the same line is not poisoned', () => {
    const s = parseTournamentSummary(
      baseSummary(
        "PokerStars Tournament #9999, $250,000 GTD No Limit Hold'em",
        'Buy-In: $0.49/$0.06 USD ($250,000 GTD)'
      )
    );
    expect(s!.buyIn).toBeCloseTo(0.49);
    expect(s!.fee).toBeCloseTo(0.06);
  });

  it('impossibly large USD buy-in is dropped (returns undefined)', () => {
    const s = parseTournamentSummary(
      baseSummary(
        "PokerStars Tournament #9999, No Limit Hold'em",
        'Buy-In: $250000/$6.60 USD'
      )
    );
    // Unresolved → undefined, so importer keeps any prior hand-history value.
    expect(s!.buyIn).toBeUndefined();
    expect(s!.fee).toBeUndefined();
  });

  it('freeroll summary is classified PLAY', () => {
    const s = parseTournamentSummary(
      baseSummary(
        "PokerStars Tournament #9999, Freeroll",
        'Buy-In: Freeroll'
      )
    );
    expect(s!.currency).toBe('PLAY');
    expect(s!.buyIn).toBe(0);
  });
});
