import type { Tournament } from '../types/hand';
import { sumUsd } from '../parser/money';

const NON_CASH_CURRENCIES: ReadonlySet<string> = new Set(['PLAY', 'TICKET']);

export function isCashTournamentCurrency(tournament: Tournament): boolean {
  const currency = tournament.currency;
  if (!currency) return true;
  return !NON_CASH_CURRENCIES.has(currency);
}

export function getTournamentCost(tournament: Tournament): number {
  if (!isCashTournamentCurrency(tournament)) return 0;
  return sumUsd([tournament.buyIn || 0, tournament.fee || 0]);
}

export function getTournamentRevenue(tournament: Tournament): number {
  if (!isCashTournamentCurrency(tournament)) return 0;
  return sumUsd([tournament.prize || 0, tournament.bounty || 0]);
}

export function getTournamentNet(tournament: Tournament): number {
  return sumUsd([getTournamentRevenue(tournament), -getTournamentCost(tournament)]);
}

export function hasTournamentCash(tournament: Tournament): boolean {
  return isCashTournamentCurrency(tournament) && getTournamentRevenue(tournament) > 0;
}

/**
 * Aggregate ROI% shared by every career surface (lifetime, coach, scope).
 *
 * This is a *pooled* ratio — totalNet / totalCost summed across every cash
 * tournament at once — not a mean of per-tournament ratios. A cash-currency
 * freeroll (buyIn = 0, real prize) contributes exactly $0 to totalCost, so
 * including it leaves the denominator untouched while keeping its prize in
 * totalNet where it belongs. Excluding it would silently discard real profit
 * for no mathematical gain, so every cash entry is processed uniformly.
 *
 * The `totalCost <= 0` guard still handles the genuine edge case of a portfolio
 * that is 100% freerolls: with no real investment anywhere, ROI is undefined.
 */
export function computeRoiPct(tournaments: Tournament[]): number {
  const eligible = tournaments.filter(isCashTournamentCurrency);
  const totalCost = sumUsd(eligible.map(getTournamentCost));
  if (totalCost <= 0) return 0;
  const totalNet = sumUsd(eligible.map(getTournamentNet));
  return (totalNet / totalCost) * 100;
}
