import { describe, it, expect } from 'vitest';
import { groupIntoSessions, computeSessionTrends, computeIntraSessionTrends } from '../sessions';
import type { Hand, Tournament } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';
import { makeTournament as baseTournament } from '../../test/factories';

function makeHand(id: string, dateStr: string, tournamentId: string = 'T1'): Hand {
  return {
    id,
    tournamentId,
    date: new Date(dateStr),
    level: 1,
    smallBlind: 10,
    bigBlind: 20,
    ante: 3,
    maxSeats: 9,
    activePlayers: 6,
    buttonSeat: 1,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 0,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: 1000,
    heroChipsAfter: 1000,
    villainDeltas: [],
  };
}

function makeDecision(handId: string, overrides: Partial<HeroDecision> = {}): HeroDecision {
  return {
    handId,
    position: 'UTG',
    handKey: 'AKs',
    stackBb: 30,
    scenario: 'RFI',
    action: 'raise',
    isCompliant: true,
    deviationType: null,
    sawFlop: false,
    wasPreFlopRaiser: true,
    cbetOpportunity: false,
    cbetMade: false,
    cbetHU: false,
    doubleBarrelOpportunity: false,
    doubleBarrelMade: false,
    wentToShowdown: false,
    wonAtShowdown: false,
    wonAmount: 0,
    netProfit: 0,
    ...overrides,
  };
}

function makeTournament(id: string, overrides: Partial<Tournament> = {}): Tournament {
  return baseTournament({ id, ...overrides });
}

describe('groupIntoSessions', () => {
  it('groups consecutive hands into one session', () => {
    const hands = [
      makeHand('1', '2026-04-05T18:00:00Z'),
      makeHand('2', '2026-04-05T18:30:00Z'),
      makeHand('3', '2026-04-05T19:00:00Z'),
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const sessions = groupIntoSessions(hands, decisions, new Map());

    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.totalHands).toBe(3);
  });

  it('splits into two sessions with 4+ hour gap', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z'),
      makeHand('2', '2026-04-05T10:30:00Z'),
      makeHand('3', '2026-04-05T18:00:00Z'), // 7.5 hours later
      makeHand('4', '2026-04-05T18:30:00Z'),
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const sessions = groupIntoSessions(hands, decisions, new Map());

    expect(sessions).toHaveLength(2);
    expect(sessions[0]!.totalHands).toBe(2);
    expect(sessions[1]!.totalHands).toBe(2);
  });

  it('returns empty for no hands', () => {
    expect(groupIntoSessions([], new Map(), new Map())).toHaveLength(0);
  });

  it('sorts hands by date regardless of input order', () => {
    const hands = [
      makeHand('3', '2026-04-05T19:00:00Z'),
      makeHand('1', '2026-04-05T10:00:00Z'),
      makeHand('2', '2026-04-05T10:30:00Z'),
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const sessions = groupIntoSessions(hands, decisions, new Map());

    // 8.5 hour gap between hand 2 and 3
    expect(sessions).toHaveLength(2);
    expect(sessions[0]!.startTime).toEqual(new Date('2026-04-05T10:00:00Z'));
  });

  it('assigns unique session IDs', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z'),
      makeHand('2', '2026-04-06T10:00:00Z'), // Next day
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const sessions = groupIntoSessions(hands, decisions, new Map());

    expect(sessions[0]!.id).toBe('session-1');
    expect(sessions[1]!.id).toBe('session-2');
  });

  it('tracks tournament IDs per session', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z', 'T1'),
      makeHand('2', '2026-04-05T10:30:00Z', 'T2'),
      makeHand('3', '2026-04-05T11:00:00Z', 'T1'),
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const sessions = groupIntoSessions(hands, decisions, new Map());

    expect(sessions[0]!.tournamentIds).toHaveLength(2);
    expect(sessions[0]!.tournamentIds).toContain('T1');
    expect(sessions[0]!.tournamentIds).toContain('T2');
  });

  it('computes stats per session', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z'),
      makeHand('2', '2026-04-05T10:30:00Z'),
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const sessions = groupIntoSessions(hands, decisions, new Map());

    expect(sessions[0]!.stats.totalHands).toBe(2);
    expect(sessions[0]!.stats.vpipHands).toBe(2); // Both are raise actions
  });

  it('uses shared bounty-aware tournament financials for session buy-ins, prizes, pnl, and roi', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z', 'T1'),
      makeHand('2', '2026-04-05T10:30:00Z', 'T2'),
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const tournaments = new Map<string, Tournament>([
      ['T1', makeTournament('T1', { buyIn: 10, fee: 1, prize: 20, bounty: 5, currency: 'USD' })],
      ['T2', makeTournament('T2', { buyIn: 5, fee: 0.5, prize: 0, bounty: 7.5, currency: 'USD' })],
    ]);

    const [session] = groupIntoSessions(hands, decisions, tournaments);

    expect(session!.buyIns).toBeCloseTo(16.5);
    expect(session!.prizes).toBeCloseTo(32.5);
    expect(session!.pnl).toBeCloseTo(16);
    expect(session!.roi).toBeCloseTo((16 / 16.5) * 100);
  });

  it('does not double-count a tournament that spans a session gap (A5)', () => {
    // One tournament, two hands split by a 6h gap → two sessions. Its buy-in
    // and prize must be counted once, in the session holding the last hand.
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z', 'T1'),
      makeHand('2', '2026-04-05T16:00:00Z', 'T1'),
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const tournaments = new Map<string, Tournament>([
      ['T1', makeTournament('T1', { buyIn: 10, fee: 1, prize: 50, bounty: 0, currency: 'USD' })],
    ]);

    const sessions = groupIntoSessions(hands, decisions, tournaments);
    expect(sessions).toHaveLength(2);
    // First session (earlier hand) carries no tournament money.
    expect(sessions[0]!.buyIns).toBe(0);
    expect(sessions[0]!.prizes).toBe(0);
    // Last session (where the tournament finished) carries it all, once.
    expect(sessions[1]!.buyIns).toBeCloseTo(11);
    expect(sessions[1]!.prizes).toBeCloseTo(50);
    // Total across sessions is the single entry, not double.
    expect(sessions[0]!.buyIns + sessions[1]!.buyIns).toBeCloseTo(11);
  });

  it('excludes non-cash tournament currencies from session financials', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z', 'CASH'),
      makeHand('2', '2026-04-05T10:30:00Z', 'PLAY'),
      makeHand('3', '2026-04-05T11:00:00Z', 'TICKET'),
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const tournaments = new Map<string, Tournament>([
      ['CASH', makeTournament('CASH', { buyIn: 10, fee: 1, prize: 0, bounty: 4, currency: 'USD' })],
      ['PLAY', makeTournament('PLAY', { buyIn: 1000, fee: 0, prize: 5000, bounty: 300, currency: 'PLAY' })],
      ['TICKET', makeTournament('TICKET', { buyIn: 50, fee: 5, prize: 200, bounty: 25, currency: 'TICKET' })],
    ]);

    const [session] = groupIntoSessions(hands, decisions, tournaments);

    expect(session!.buyIns).toBeCloseTo(11);
    expect(session!.prizes).toBeCloseTo(4);
    expect(session!.pnl).toBeCloseTo(-7);
    expect(session!.roi).toBeCloseTo((-7 / 11) * 100);
  });

  it('supports custom gap duration', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z'),
      makeHand('2', '2026-04-05T11:30:00Z'), // 1.5 hours later
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));

    // With 1-hour gap, should split
    const sessions1h = groupIntoSessions(hands, decisions, new Map(), 60 * 60 * 1000);
    expect(sessions1h).toHaveLength(2);

    // With 2-hour gap, should not split
    const sessions2h = groupIntoSessions(hands, decisions, new Map(), 2 * 60 * 60 * 1000);
    expect(sessions2h).toHaveLength(1);
  });
});

describe('computeSessionTrends', () => {
  it('computes trend points from sessions', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z'),
      makeHand('2', '2026-04-05T10:30:00Z'),
    ];
    const decisions = new Map(hands.map((h) => [h.id, makeDecision(h.id)]));
    const sessions = groupIntoSessions(hands, decisions, new Map());
    const trends = computeSessionTrends(sessions);

    expect(trends).toHaveLength(1);
    expect(trends[0]!.hands).toBe(2);
    expect(trends[0]!.vpip).toBeGreaterThan(0);
    expect(trends[0]!.sessionId).toBe('session-1');
  });

  it('computes session and trend results in bb/100 instead of raw chips', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z'),
      { ...makeHand('2', '2026-04-05T10:30:00Z'), bigBlind: 40 },
    ];
    const decisions = new Map<string, HeroDecision>([
      ['1', makeDecision('1', { netProfit: 200 })], // +10bb
      ['2', makeDecision('2', { netProfit: -120 })], // -3bb
    ]);

    const sessions = groupIntoSessions(hands, decisions, new Map());
    expect(sessions[0]!.totalBb).toBe(7);
    expect(sessions[0]!.bb100Hands).toBe(2);
    expect(sessions[0]!.bb100).toBe(350);

    const trends = computeSessionTrends(sessions);
    expect(trends[0]!.totalBb).toBe(7);
    expect(trends[0]!.cumulativeBb).toBe(7);
    expect(trends[0]!.bb100).toBe(350);
  });

  it('computes intra-session trend deltas in cumulative big blinds when hand blinds are available', () => {
    const hands = [
      makeHand('1', '2026-04-05T10:00:00Z'),
      { ...makeHand('2', '2026-04-05T10:30:00Z'), bigBlind: 40 },
    ];
    const decisions = [
      makeDecision('1', { netProfit: 200 }), // +10bb
      makeDecision('2', { netProfit: -120 }), // -3bb
    ];

    const trend = computeIntraSessionTrends(decisions, hands, 1);
    expect(trend).toHaveLength(2);
    expect(trend[0]!.cumulativeBb).toBe(10);
    expect(trend[0]!.bb100).toBe(1000);
    expect(trend[1]!.cumulativeBb).toBe(7);
    expect(trend[1]!.bb100).toBe(350);
  });
});
