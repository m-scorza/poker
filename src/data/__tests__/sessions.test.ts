import { describe, it, expect } from 'vitest';
import { groupIntoSessions, computeSessionTrends } from '../sessions';
import type { Hand } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';

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

function makeDecision(handId: string): HeroDecision {
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
  };
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

  it('returns empty for no sessions', () => {
    expect(computeSessionTrends([])).toHaveLength(0);
  });
});
