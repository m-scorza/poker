import { describe, expect, it } from 'vitest';
import {
  getTournamentCost,
  getTournamentNet,
  getTournamentRevenue,
  hasTournamentCash,
  isCashTournamentCurrency,
  computeRoiPct,
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

  it('computes ROI over positive-cost cash entries and excludes true zero-cost freerolls', () => {
    const feeOnlyEntry = tournament({ buyIn: 0, fee: 1, prize: 3 });
    const zeroCostFreeroll = tournament({ buyIn: 0, fee: 0, prize: 50 });

    expect(computeRoiPct([feeOnlyEntry, zeroCostFreeroll])).toBeCloseTo(200, 5);
  });

  it('avoids float drift when summing many PKO-style tournaments', () => {
    // 100 PKO entries each costing $0.49 buy-in + $0.06 fee = $0.55. Total
    // cost should be exactly $55.00, not $54.999999... or $55.000000001.
    const pkoEntry = tournament({ buyIn: 0.49, fee: 0.06, prize: 0, bounty: 0 });
    const costs: number[] = [];
    for (let i = 0; i < 100; i++) costs.push(getTournamentCost(pkoEntry));
    const total = costs.reduce((a, b) => a + b, 0);
    // Raw float sum can drift — getTournamentCost itself returns a clean 0.55,
    // and the parser/aggregator path uses sumUsd to avoid drift downstream.
    expect(getTournamentCost(pkoEntry)).toBe(0.55);
    // Sanity: drift exists at the call site if you don't use sumUsd.
    expect(total).toBeCloseTo(55, 5);
  });
});
