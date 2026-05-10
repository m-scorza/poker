import { describe, expect, it } from 'vitest';
import { parseOpenHandHistoryFile } from '../openHandHistory';
import { buildHeroDecision } from '../../analysis/scenarioDetector';

const OHH_IPOKER_TOURNAMENT = JSON.stringify({
  ohh: {
    spec_version: '1.2.2',
    network_name: 'iPoker Network',
    site_name: 'iPoker',
    game_type: 'Holdem',
    start_date_utc: '2018-05-25T14:35:34',
    table_name: '€100 Gtd - Rebuy, 926126756, 925681798',
    table_size: 9,
    game_number: '7948166852',
    currency: '',
    ante_amount: 16,
    small_blind_amount: 80,
    big_blind_amount: 160,
    dealer_seat: 2,
    hero_player_id: 5,
    tournament_info: {
      name: '€100 Gtd - Rebuy',
      start_date_utc: '2018-05-25T14:35:34',
      type: 'MTT',
      buyin_amount: 0.45,
      fee_amount: 0.05,
      bounty_fee_amount: 0,
      currency: 'EUR',
      tournament_number: '925681798',
    },
    players: [
      { id: 0, name: 'Player2', seat: 2, starting_stack: 12953, bounty: 0 },
      { id: 1, name: 'Player3', seat: 3, starting_stack: 23199, bounty: 0 },
      { id: 2, name: 'Player4', seat: 4, starting_stack: 23187, bounty: 0 },
      { id: 3, name: 'Player5', seat: 5, starting_stack: 11690, bounty: 0 },
      { id: 4, name: 'Player6', seat: 6, starting_stack: 18903, bounty: 0 },
      { id: 5, name: 'Hero', seat: 8, starting_stack: 9193, bounty: 0 },
      { id: 6, name: 'Player9', seat: 9, starting_stack: 9972, bounty: 0 },
      { id: 7, name: 'Player10', seat: 10, starting_stack: 15963, bounty: 0 },
    ],
    rounds: [
      {
        street: 'Preflop',
        actions: [
          { action_number: 1, player_id: 0, action: 'Post Ante', amount: 16, is_allin: false },
          { action_number: 2, player_id: 1, action: 'Post Ante', amount: 16, is_allin: false },
          { action_number: 3, player_id: 2, action: 'Post Ante', amount: 16, is_allin: false },
          { action_number: 4, player_id: 3, action: 'Post Ante', amount: 16, is_allin: false },
          { action_number: 5, player_id: 4, action: 'Post Ante', amount: 16, is_allin: false },
          { action_number: 6, player_id: 5, action: 'Post Ante', amount: 16, is_allin: false },
          { action_number: 7, player_id: 6, action: 'Post Ante', amount: 16, is_allin: false },
          { action_number: 8, player_id: 7, action: 'Post Ante', amount: 16, is_allin: false },
          { action_number: 9, player_id: 1, action: 'Post SB', amount: 80, is_allin: false },
          { action_number: 10, player_id: 2, action: 'Post BB', amount: 160, is_allin: false },
          { action_number: 11, player_id: 5, action: 'Dealt Cards', amount: 0, cards: ['Qh', 'Qc'], is_allin: false },
          { action_number: 12, player_id: 3, action: 'Fold', amount: 0, is_allin: false },
          { action_number: 13, player_id: 4, action: 'Fold', amount: 0, is_allin: false },
          { action_number: 14, player_id: 5, action: 'Raise', amount: 480, is_allin: false },
          { action_number: 15, player_id: 6, action: 'Fold', amount: 0, is_allin: false },
          { action_number: 16, player_id: 7, action: 'Call', amount: 480, is_allin: false },
          { action_number: 17, player_id: 0, action: 'Fold', amount: 0, is_allin: false },
          { action_number: 18, player_id: 1, action: 'Fold', amount: 0, is_allin: false },
          { action_number: 19, player_id: 2, action: 'Fold', amount: 0, is_allin: false },
        ],
      },
      {
        street: 'Flop',
        cards: ['4s', 'Jc', '7d'],
        actions: [
          { action_number: 1, player_id: 5, action: 'Bet', amount: 929, is_allin: false },
          { action_number: 2, player_id: 7, action: 'Call', amount: 929, is_allin: false },
        ],
      },
      {
        street: 'Turn',
        cards: ['7s'],
        actions: [
          { action_number: 1, player_id: 5, action: 'Bet', amount: 2230, is_allin: false },
          { action_number: 2, player_id: 7, action: 'Fold', amount: 0, is_allin: false },
        ],
      },
    ],
    pots: [
      {
        number: 0,
        amount: 2996,
        rake: 0,
        player_wins: [{ player_id: 5, win_amount: 2996, contributed_rake: 0 }],
      },
    ],
  },
});

const OHH_888_WRAPPED_ARRAY = JSON.stringify([
  {
    spec_version: '1.2.2',
    network_name: '888 Poker',
    site_name: 'Pacific Poker',
    game_type: 'Holdem',
    start_date_utc: '2013-12-30T16:08:49',
    table_size: 6,
    table_name: '#1',
    game_number: '591212284',
    ante_amount: 0,
    small_blind_amount: 30,
    big_blind_amount: 60,
    dealer_seat: 1,
    hero_player_id: 2,
    tournament_info: {
      type: 'MTT',
      tournament_number: '53999979',
      buyin_amount: 0.1,
      fee_amount: 0.01,
      currency: 'USD',
    },
    players: [
      { id: 0, name: 'Player1', seat: 1, starting_stack: 555 },
      { id: 1, name: 'Player4', seat: 4, starting_stack: 1078 },
      { id: 2, name: 'Hero', seat: 6, starting_stack: 580 },
      { id: 3, name: 'Player9', seat: 9, starting_stack: 787 },
    ],
    rounds: [
      {
        street: 'Preflop',
        actions: [
          { player_id: 1, action: 'Post SB', amount: 30, is_allin: false },
          { player_id: 2, action: 'Post BB', amount: 60, is_allin: false },
          { player_id: 2, action: 'Dealt Cards', cards: ['9d', '7c'], amount: 0, is_allin: false },
          { player_id: 3, action: 'Call', amount: 60, is_allin: false },
          { player_id: 0, action: 'Fold', amount: 0, is_allin: false },
          { player_id: 1, action: 'Call', amount: 30, is_allin: false },
          { player_id: 2, action: 'Check', amount: 0, is_allin: false },
        ],
      },
      {
        street: 'Flop',
        cards: ['7s', '6d', '5d'],
        actions: [
          { player_id: 1, action: 'Check', amount: 0, is_allin: false },
          { player_id: 2, action: 'Check', amount: 0, is_allin: false },
          { player_id: 3, action: 'Check', amount: 0, is_allin: false },
        ],
      },
      {
        street: 'Turn',
        cards: ['4c'],
        actions: [
          { player_id: 1, action: 'Check', amount: 0, is_allin: false },
          { player_id: 2, action: 'Bet', amount: 90, is_allin: false },
          { player_id: 3, action: 'Fold', amount: 0, is_allin: false },
          { player_id: 1, action: 'Fold', amount: 0, is_allin: false },
        ],
      },
    ],
    pots: [
      { amount: 180, rake: 0, player_wins: [{ player_id: 2, win_amount: 180, contributed_rake: 0 }] },
    ],
  },
]);

describe('parseOpenHandHistoryFile', () => {
  it('parses standardized iPoker tournament OHH JSON into existing hand model', () => {
    const [parsed] = parseOpenHandHistoryFile(OHH_IPOKER_TOURNAMENT, 'scorza23');

    expect(parsed).toBeDefined();
    expect(parsed!.hand.id).toBe('7948166852');
    expect(parsed!.hand.tournamentId).toBe('925681798');
    expect(parsed!.hand.smallBlind).toBe(80);
    expect(parsed!.hand.bigBlind).toBe(160);
    expect(parsed!.hand.ante).toBe(16);
    expect(parsed!.hand.boardFlop).toEqual(['4s', 'Jc', '7d']);
    expect(parsed!.hand.boardTurn).toBe('7s');
    expect(parsed!.hand.heroChipsBefore).toBe(9193);
    expect(parsed!.hand.heroChipsAfter).toBe(8534);
    expect(parsed!.tournament.buyIn).toBeCloseTo(0.45, 2);
    expect(parsed!.tournament.fee).toBeCloseTo(0.05, 2);
    expect(parsed!.tournament.currency).toBe('USD');

    const hero = parsed!.players.find((p) => p.isHero);
    expect(hero?.playerName).toBe('scorza23');
    expect(hero?.holeCards).toEqual(['Qh', 'Qc']);

    expect(parsed!.actions.map((a) => a.actionType)).toContain('post_ante');
    expect(parsed!.actions.find((a) => a.playerName === 'scorza23' && a.street === 'flop')?.actionType).toBe('bet');
    expect(parsed!.collectedAmounts.get('scorza23')).toBe(2996);

    const decision = buildHeroDecision(parsed!, 'scorza23');
    expect(decision?.handKey).toBe('QQ');
    expect(decision?.position).toBe('MP');
    expect(decision?.action).toBe('raise');
  });

  it('parses array-wrapped 888/Pacific OHH JSON', () => {
    const [parsed] = parseOpenHandHistoryFile(OHH_888_WRAPPED_ARRAY, 'scorza23');

    expect(parsed?.hand.id).toBe('591212284');
    expect(parsed?.hand.tournamentId).toBe('53999979');
    expect(parsed?.hand.maxSeats).toBe(6);
    expect(parsed?.hand.boardFlop).toEqual(['7s', '6d', '5d']);
    expect(parsed?.hand.boardTurn).toBe('4c');
    expect(parsed?.tournament.buyIn).toBeCloseTo(0.1, 2);
    expect(parsed?.tournament.fee).toBeCloseTo(0.01, 2);
    expect(parsed?.players.find((p) => p.isHero)?.holeCards).toEqual(['9d', '7c']);
    expect(parsed?.actions.find((a) => a.street === 'turn' && a.playerName === 'scorza23')?.actionType).toBe('bet');
  });

  it('returns no hands for non-OHH JSON instead of throwing', () => {
    expect(parseOpenHandHistoryFile('{"hello":"world"}')).toEqual([]);
    expect(parseOpenHandHistoryFile('not json')).toEqual([]);
  });
});
