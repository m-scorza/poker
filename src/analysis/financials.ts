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
