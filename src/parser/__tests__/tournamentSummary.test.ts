import { describe, it, expect } from 'vitest';
import { parseTournamentSummary } from '../tournamentSummary';

describe('parseTournamentSummary()', () => {
  it('returns null when input has no tournament ID header', () => {
    expect(parseTournamentSummary('')).toBeNull();
    expect(parseTournamentSummary('Hand History #123456\nNo summary header here')).toBeNull();
  });

  it('parses comma-separated finish-line prize and counts an eliminating line once as bounty', () => {
    const summaryText = [
      "Tournament #3567890123, $4.90+$0.50 USD Hold'em No Limit",
      'Buy-In: $4.90/$0.50 USD',
      '3rd: scorza23, $45.50',
      'You received $12.50 for eliminating players',
    ].join('\n');

    const result = parseTournamentSummary(summaryText, 'scorza23');

    expect(result).toEqual({
      tournamentId: '3567890123',
      name: "$4.90+$0.50 USD Hold'em No Limit",
      finishPosition: 3,
      prize: 45.5,
      bounty: 12.5,
      buyIn: 4.9,
      fee: 0.5,
      currency: 'USD',
      heroName: 'scorza23',
    });
  });

  it('parses finish-line prize when the finish line uses a comma separator', () => {
    const summaryText = [
      'Tournament #11223344, $10+$1 USD',
      '2nd: HeroPlayer, $100.00',
    ].join('\n');

    const result = parseTournamentSummary(summaryText, 'heroplayer');

    expect(result).toEqual({
      tournamentId: '11223344',
      name: '$10+$1 USD',
      finishPosition: 2,
      prize: 100,
      bounty: 0,
      buyIn: 10,
      fee: 1,
      currency: 'USD',
      heroName: 'heroplayer',
    });
  });

  it('extracts the correct prize from a comma finish line with no "You received" fallback', () => {
    const summaryText = [
      "Tournament #7788990011, $2.50+$0.30 USD Hold'em No Limit",
      'Buy-In: $2.50/$0.30 USD',
      '4th: scorza23, $73.20',
    ].join('\n');

    const result = parseTournamentSummary(summaryText, 'scorza23');

    expect(result).toEqual({
      tournamentId: '7788990011',
      name: "$2.50+$0.30 USD Hold'em No Limit",
      finishPosition: 4,
      prize: 73.2,
      bounty: 0,
      buyIn: 2.5,
      fee: 0.3,
      currency: 'USD',
      heroName: 'scorza23',
    });
  });

  it('counts a lone eliminating line exactly once as bounty, not also as prize', () => {
    const summaryText = [
      "Tournament #6655443322, $1+$0.10 USD Hold'em No Limit",
      'Buy-In: $1/$0.10 USD',
      '5th: scorza23, $30.00',
      'You received $8.00 for eliminating players',
    ].join('\n');

    const result = parseTournamentSummary(summaryText, 'scorza23');

    expect(result).toEqual({
      tournamentId: '6655443322',
      name: "$1+$0.10 USD Hold'em No Limit",
      finishPosition: 5,
      prize: 30,
      bounty: 8,
      buyIn: 1,
      fee: 0.1,
      currency: 'USD',
      heroName: 'scorza23',
    });
  });

  it('characterizes finish line without comma where finishMatch consumes entire line leaving prize=0', () => {
    // Characterization note: RE_FINISH_FLEX consumes entire line when no comma/bracket is present,
    // leaving empty slice for RE_MONEY.
    const summaryText = [
      'Tournament #22334455, $10+$1 USD',
      '1st: scorza23 $250.00',
    ].join('\n');

    const result = parseTournamentSummary(summaryText);

    expect(result).toEqual({
      tournamentId: '22334455',
      name: '$10+$1 USD',
      finishPosition: 1,
      prize: 0,
      bounty: 0,
      buyIn: 10,
      fee: 1,
      currency: 'USD',
      heroName: 'scorza23',
    });
  });

  it('parses summary using "You finished" and "You received" fallback lines', () => {
    const summaryText = [
      "PokerStars Tournament #999888777, Hold'em No Limit",
      'You finished in 5th place.',
      'You received $15.00.',
    ].join('\n');

    const result = parseTournamentSummary(summaryText);

    expect(result).toEqual({
      tournamentId: '999888777',
      name: "Hold'em No Limit",
      finishPosition: 5,
      prize: 15,
      bounty: 0,
      buyIn: undefined,
      fee: undefined,
      currency: 'USD',
      heroName: 'scorza23',
    });
  });

  it('returns partial object with default values when only tournament ID is present', () => {
    const summaryText = 'Tournament #12345, Mystery Event';

    const result = parseTournamentSummary(summaryText);

    expect(result).toEqual({
      tournamentId: '12345',
      name: 'Mystery Event',
      finishPosition: null,
      prize: 0,
      bounty: 0,
      buyIn: undefined,
      fee: undefined,
      currency: 'USD',
      heroName: 'scorza23',
    });
  });

  it('classifies Freerolls and Play Money tournaments with PLAY currency and buyIn/fee 0', () => {
    const summaryText = [
      "Tournament #555444333, Freeroll Hold'em No Limit",
      '1st: scorza23, $0.00',
    ].join('\n');

    const result = parseTournamentSummary(summaryText);

    expect(result).toEqual({
      tournamentId: '555444333',
      name: "Freeroll Hold'em No Limit",
      finishPosition: 1,
      prize: 0,
      bounty: 0,
      buyIn: 0,
      fee: 0,
      currency: 'PLAY',
      heroName: 'scorza23',
    });
  });

  it('drops buyIn and fee to undefined if USD amount exceeds MAX_PLAUSIBLE_USD_BUYIN', () => {
    const summaryText = [
      'Tournament #444555666, $1000000 Guaranteed',
      'Buy-In: $500000.00/$10000.00 USD',
    ].join('\n');

    const result = parseTournamentSummary(summaryText);

    expect(result).toEqual({
      tournamentId: '444555666',
      name: '$1000000 Guaranteed',
      finishPosition: null,
      prize: 0,
      bounty: 0,
      buyIn: undefined,
      fee: undefined,
      currency: 'USD',
      heroName: 'scorza23',
    });
  });
});
