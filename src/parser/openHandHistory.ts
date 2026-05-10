import type { Action, Hand, PlayerInHand, Tournament } from '../types/hand';
import type { Position } from '../types/analysis';
import type { ParsedHand } from './pokerstars';
import { assignPositions } from './position';

type SupportedCurrency = 'USD' | 'T$' | 'PLAY' | 'TICKET';
type Street = Action['street'];

interface OhhPlayer {
  id?: number | string;
  player_id?: number | string;
  name?: string;
  player_name?: string;
  seat?: number | string;
  seat_number?: number | string;
  starting_stack?: number | string;
  stack?: number | string;
  chips?: number | string;
}

interface OhhAction {
  player_id?: number | string;
  action?: string;
  amount?: number | string;
  is_allin?: boolean;
  isAllIn?: boolean;
  cards?: string[];
}

interface OhhRound {
  street?: string;
  cards?: string[];
  actions?: OhhAction[];
}

interface OhhPotWin {
  player_id?: number | string;
  win_amount?: number | string;
  amount?: number | string;
}

interface OhhPot {
  amount?: number | string;
  rake?: number | string;
  player_wins?: OhhPotWin[];
}

interface OhhTournamentInfo {
  name?: string;
  type?: string;
  buyin_amount?: number | string;
  fee_amount?: number | string;
  bounty_fee_amount?: number | string;
  currency?: string;
  tournament_number?: string | number;
}

interface OhhHand {
  spec_version?: string;
  network_name?: string;
  site_name?: string;
  game_type?: string;
  start_date_utc?: string;
  table_size?: number | string;
  table_name?: string;
  game_number?: string | number;
  currency?: string;
  ante_amount?: number | string;
  small_blind_amount?: number | string;
  big_blind_amount?: number | string;
  dealer_seat?: number | string;
  hero_player_id?: number | string;
  tournament_info?: OhhTournamentInfo;
  players?: OhhPlayer[];
  rounds?: OhhRound[];
  pots?: OhhPot[];
}

export function parseOpenHandHistoryFile(fileContent: string, heroName = 'scorza23'): ParsedHand[] {
  const rawHands = readOhhHands(fileContent);
  const parsed: ParsedHand[] = [];

  for (const ohh of rawHands) {
    const hand = parseOpenHandHistoryHand(ohh, heroName);
    if (hand) parsed.push(hand);
  }

  return parsed;
}

function readOhhHands(fileContent: string): OhhHand[] {
  let value: unknown;
  try {
    value = JSON.parse(fileContent.replace(/^\uFEFF/, ''));
  } catch {
    return [];
  }

  const hands: OhhHand[] = [];
  const pushIfHand = (candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') return;
    const obj = candidate as OhhHand;
    if (typeof obj.spec_version === 'string' && (obj.game_number !== undefined || Array.isArray(obj.rounds))) {
      hands.push(obj);
    }
  };

  if (Array.isArray(value)) {
    for (const item of value) pushIfHand(item);
    return hands;
  }

  if (value && typeof value === 'object') {
    const obj = value as { ohh?: unknown; hands?: unknown };
    if (Array.isArray(obj.ohh)) {
      for (const item of obj.ohh) pushIfHand(item);
    } else {
      pushIfHand(obj.ohh);
    }

    if (Array.isArray(obj.hands)) {
      for (const item of obj.hands) pushIfHand(item);
    }

    pushIfHand(value);
  }

  return hands;
}

function parseOpenHandHistoryHand(ohh: OhhHand, heroName: string): ParsedHand | null {
  if (!Array.isArray(ohh.players) || ohh.players.length < 2) return null;

  const handId = String(ohh.game_number ?? '').trim();
  if (!handId) return null;

  const tournamentInfo = ohh.tournament_info;
  const tournamentId = String(tournamentInfo?.tournament_number ?? '').trim();
  const heroPlayerId = ohh.hero_player_id !== undefined ? String(ohh.hero_player_id) : '';
  const buttonSeat = toNumber(ohh.dealer_seat);

  const players: PlayerInHand[] = [];
  const playerNameById = new Map<string, string>();
  const playerSeatById = new Map<string, number>();

  for (const p of ohh.players) {
    const id = String(p.id ?? p.player_id ?? '').trim();
    const rawName = String(p.name ?? p.player_name ?? (id ? `Player${id}` : 'Player')).trim();
    const isHero = (id !== '' && id === heroPlayerId) || rawName === 'Hero' || rawName.toLowerCase() === heroName.toLowerCase();
    const playerName = isHero ? heroName : rawName;
    const seatNumber = toNumber(p.seat ?? p.seat_number);
    const chipsBefore = toNumber(p.starting_stack ?? p.stack ?? p.chips);

    if (!id || seatNumber <= 0) continue;
    playerNameById.set(id, playerName);
    playerSeatById.set(id, seatNumber);
    players.push({
      handId,
      seatNumber,
      playerName,
      chipsBefore,
      position: 'BTN' as Position,
      isHero,
      holeCards: null,
    });
  }

  if (players.length < 2) return null;

  const positionMap = assignPositions(
    players.map((p) => ({ seatNumber: p.seatNumber, playerName: p.playerName })),
    buttonSeat,
  );
  for (const player of players) {
    player.position = positionMap.get(player.seatNumber) ?? 'BTN';
  }

  const actions: Action[] = [];
  const totalInvested = new Map<string, number>();
  const collectedAmounts = new Map<string, number>();
  const showdownWinners = new Set<string>();
  let boardFlop: string[] | null = null;
  let boardTurn: string | null = null;
  let boardRiver: string | null = null;

  const addInvestment = (playerName: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    totalInvested.set(playerName, (totalInvested.get(playerName) ?? 0) + amount);
  };

  if (Array.isArray(ohh.rounds)) {
    for (const round of ohh.rounds) {
      const street = normalizeStreet(round.street);
      if (!street) continue;

      if (Array.isArray(round.cards)) {
        if (street === 'flop' && round.cards.length >= 3) boardFlop = round.cards.slice(0, 3);
        if (street === 'turn' && round.cards.length >= 1) boardTurn = round.cards[0] ?? null;
        if (street === 'river' && round.cards.length >= 1) boardRiver = round.cards[0] ?? null;
      }

      if (!Array.isArray(round.actions)) continue;
      for (const ohhAction of round.actions) {
        const playerId = ohhAction.player_id !== undefined ? String(ohhAction.player_id) : '';
        const playerName = playerNameById.get(playerId);
        if (!playerName) continue;

        const rawAction = String(ohhAction.action ?? '').toLowerCase();
        if (rawAction === 'dealt cards') {
          const player = players.find((p) => p.playerName === playerName);
          if (player?.isHero && Array.isArray(ohhAction.cards) && ohhAction.cards.length >= 2) {
            player.holeCards = [ohhAction.cards[0]!, ohhAction.cards[1]!];
          }
          continue;
        }

        const actionType = normalizeActionType(rawAction);
        if (!actionType) continue;
        const amount = toNumber(ohhAction.amount);
        const investment = actionType === 'fold' || actionType === 'check' ? 0 : amount;
        addInvestment(playerName, investment);

        actions.push({
          handId,
          street,
          playerName,
          actionType,
          amount,
          isAllIn: Boolean(ohhAction.is_allin ?? ohhAction.isAllIn),
          sequence: actions.length,
        });
      }
    }
  }

  let totalPot = 0;
  let rake = 0;
  if (Array.isArray(ohh.pots)) {
    for (const pot of ohh.pots) {
      totalPot += toNumber(pot.amount);
      rake += toNumber(pot.rake);
      if (!Array.isArray(pot.player_wins)) continue;
      for (const win of pot.player_wins) {
        const playerName = playerNameById.get(String(win.player_id ?? ''));
        if (!playerName) continue;
        const amount = toNumber(win.win_amount ?? win.amount);
        collectedAmounts.set(playerName, (collectedAmounts.get(playerName) ?? 0) + amount);
      }
    }
  }

  const hero = players.find((p) => p.isHero);
  const heroChipsBefore = hero?.chipsBefore ?? 0;
  const heroPutIn = hero ? totalInvested.get(hero.playerName) ?? 0 : 0;
  const heroWon = hero ? collectedAmounts.get(hero.playerName) ?? 0 : 0;
  const playersWhoFolded = new Set(actions.filter((a) => a.actionType === 'fold').map((a) => a.playerName));
  const hasShowdown = players.length - playersWhoFolded.size >= 2 && collectedAmounts.size > 0;

  const hand: Hand = {
    id: handId,
    tournamentId,
    date: parseDate(ohh.start_date_utc),
    level: 0,
    smallBlind: toNumber(ohh.small_blind_amount),
    bigBlind: toNumber(ohh.big_blind_amount),
    ante: toNumber(ohh.ante_amount),
    maxSeats: toNumber(ohh.table_size) || players.length,
    activePlayers: players.length,
    buttonSeat,
    boardFlop,
    boardTurn,
    boardRiver,
    totalPot,
    rake,
    hasShowdown,
    heroChipsBefore,
    heroChipsAfter: heroChipsBefore - heroPutIn + heroWon,
    villainDeltas: players
      .filter((p) => !p.isHero)
      .map((p) => ({
        name: p.playerName,
        net: (collectedAmounts.get(p.playerName) ?? 0) - (totalInvested.get(p.playerName) ?? 0),
      })),
  };

  const tournament: Partial<Tournament> = {
    id: tournamentId,
    name: tournamentInfo?.name,
    buyIn: toNumber(tournamentInfo?.buyin_amount),
    fee: toNumber(tournamentInfo?.fee_amount),
    format: tournamentInfo?.type ?? 'Tournament',
    currency: normalizeCurrency(tournamentInfo?.currency ?? ohh.currency),
  };

  return { hand, players, actions, tournament, collectedAmounts, showdownWinners };
}

function normalizeStreet(street: string | undefined): Street | null {
  const value = String(street ?? '').toLowerCase();
  if (value === 'preflop' || value === 'pre-flop') return 'preflop';
  if (value === 'flop') return 'flop';
  if (value === 'turn') return 'turn';
  if (value === 'river') return 'river';
  return null;
}

function normalizeActionType(action: string): Action['actionType'] | null {
  if (action === 'fold') return 'fold';
  if (action === 'check') return 'check';
  if (action === 'call') return 'call';
  if (action === 'raise') return 'raise';
  if (action === 'bet') return 'bet';
  if (action === 'post sb' || action === 'post small blind') return 'post_sb';
  if (action === 'post bb' || action === 'post big blind') return 'post_bb';
  if (action === 'post ante') return 'post_ante';
  return null;
}

function normalizeCurrency(currency: unknown): SupportedCurrency {
  const value = String(currency ?? '').toUpperCase();
  if (value === 'PLAY' || value.includes('PLAY')) return 'PLAY';
  if (value === 'TICKET' || value.includes('TICKET')) return 'TICKET';
  if (value === 'T$') return 'T$';
  return 'USD';
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/,/g, '').trim();
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: unknown): Date {
  if (typeof value !== 'string' || value.trim() === '') return new Date(0);
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}
