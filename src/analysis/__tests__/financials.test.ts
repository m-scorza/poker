import { describe, expect, it } from 'vitest';
import {
  getTournamentCost,
  getTournamentNet,
  getTournamentRevenue,
  hasTournamentCash,
  isCashTournamentCurrency,
} from '../financials';
import type { Tournament } from '../../types/hand';

function tournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 't',
    buyIn: 10,
    fee: 1,
    format: 'MTT',
    finishPosition: null,
    prize: 0,
    bounty: 0,
    handsPlayed: 0,
    ...overrides,
  };
}

describe('financials', () => {
  it('treats undefined, USD, and T$ tournaments as cash', () => {
    expect(isCashTournamentCurrency(tournament())).toBe(true);
    expect(isCashTournamentCurrency(tournament({ currency: 'USD' }))).toBe(true);
    expect(isCashTournamentCurrency(tournament({ currency: 'T$' }))).toBe(true);
  });

  it('excludes PLAY-money and TICKET-only tournaments from cash math', () => {
    const play = tournament({ currency: 'PLAY', buyIn: 1000, prize: 5000 });
    const ticket = tournament({ currency: 'TICKET', buyIn: 50, prize: 100 });
    expect(isCashTournamentCurrency(play)).toBe(false);
    expect(isCashTournamentCurrency(ticket)).toBe(false);
    expect(getTournamentCost(play)).toBe(0);
    expect(getTournamentRevenue(play)).toBe(0);
    expect(getTournamentNet(ticket)).toBe(0);
    expect(hasTournamentCash(play)).toBe(false);
    expect(hasTournamentCash(ticket)).toBe(false);
  });

  it('sums buy-in + fee for cost, prize + bounty for revenue, and computes net', () => {
    const t = tournament({ buyIn: 5, fee: 0.5, prize: 12, bounty: 3 });
    expect(getTournamentCost(t)).toBeCloseTo(5.5);
    expect(getTournamentRevenue(t)).toBe(15);
    expect(getTournamentNet(t)).toBeCloseTo(9.5);
    expect(hasTournamentCash(t)).toBe(true);
  });

  it('hasTournamentCash is false when revenue is zero', () => {
    expect(hasTournamentCash(tournament({ prize: 0, bounty: 0 }))).toBe(false);
  });
});
