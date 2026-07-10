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
 * ROI is a return on *investment*, so it is only defined for real-money entries
 * with a positive cost. Cash-currency freerolls (buyIn = 0, real prize) are
 * excluded: their prize is genuine profit but folding it into an ROI ratio with
 * a zero-cost denominator silently inflates the figure. Freerolls still count
 * toward net-profit and volume stats elsewhere — only the ROI% ratio drops them.
 */
export function computeRoiPct(tournaments: Tournament[]): number {
  const eligible = tournaments.filter((t) => isCashTournamentCurrency(t) && t.buyIn > 0);
  const totalCost = sumUsd(eligible.map(getTournamentCost));
  if (totalCost <= 0) return 0;
  const totalNet = sumUsd(eligible.map(getTournamentNet));
  return (totalNet / totalCost) * 100;
}
