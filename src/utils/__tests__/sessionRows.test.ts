import { describe, it, expect } from 'vitest';
import { buildSessionRow } from '../sessionRows';
import type { Session } from '../../data/sessions';
import type { AggregateStats } from '../../analysis/leakDetector';

function makeAggregateStats(overrides: Partial<AggregateStats> = {}): AggregateStats {
  return {
    totalHands: 100,
    vpipHands: 25,
    pfrHands: 18,
    sawFlopHands: 20,
    threeBetOpps: 15,
    threeBetMade: 3,
    threeBetShoveOpps: 0,
    threeBetShoveMissed: 0,
    cbetOpps: 10,
    cbetMade: 7,
    cbetHUOpps: 8,
    cbetHUMade: 6,
    doubleBarrelOpps: 4,
    doubleBarrelMade: 2,
    wtsdHands: 8,
    wonSDHands: 5,
    limpHands: 2,
    totalBets: 10,
    totalRaises: 20,
    totalCalls: 15,
    complianceEligible: 50,
    complianceCompliant: 45,
    postflopErrors: new Map(),
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    startTime: new Date(2026, 5, 1, 10, 0, 0),
    endTime: new Date(2026, 5, 1, 12, 30, 0),
    tournamentIds: ['T1', 'T2'],
    hands: [],
    totalHands: 100,
    stats: makeAggregateStats(),
    buyIns: 20,
    prizes: 35,
    pnl: 15,
    roi: 0.75,
    totalBb: 12.5,
    bb100: 12.5,
    bb100Hands: 100,
    ...overrides,
  };
}

describe('buildSessionRow', () => {
  const dummyPct = (n: number, d: number): string => `${n}/${d}`;

  it('builds full session row including bb100Hands when includeBbHands is true', () => {
    const session = makeSession();
    const row = buildSessionRow(session, {
      dateFormat: 'yyyy-MM-dd HH:mm',
      pct: dummyPct,
      emptyBb: '--',
      includeBbHands: true,
    });

    expect(row).toEqual([
      'session-1',
      '2026-06-01 10:00',
      '2026-06-01 12:30',
      '100',
      '2',
      '25/100', // vpipHands / totalHands
      '18/100', // pfrHands / totalHands
      '7/10',   // cbetMade / cbetOpps
      '6/8',    // cbetHUMade / cbetHUOpps
      '8/25',   // wtsdHands / vpipHands
      '5/8',    // wonSDHands / wtsdHands
      '45/50',  // complianceCompliant / complianceEligible
      '12.5',   // bb100.toFixed(1)
      '12.5',   // totalBb.toFixed(1)
      '100',    // bb100Hands
      '2',      // limpHands
      '3/15',   // threeBetMade / threeBetOpps
      '2/4',    // doubleBarrelMade / doubleBarrelOpps
    ]);
  });

  it('omits bb100Hands column when includeBbHands is false', () => {
    const session = makeSession();
    const row = buildSessionRow(session, {
      dateFormat: 'yyyy-MM-dd HH:mm',
      pct: dummyPct,
      emptyBb: '--',
      includeBbHands: false,
    });

    expect(row.length).toBe(17);
    expect(row[13]).toBe('12.5'); // totalBb
    expect(row[14]).toBe('2');    // limpHands directly follows totalBb
  });

  it('respects dateFormat option', () => {
    const session = makeSession();
    const row = buildSessionRow(session, {
      dateFormat: 'yyyy-MM-dd',
      pct: dummyPct,
      emptyBb: '--',
      includeBbHands: true,
    });

    expect(row[1]).toBe('2026-06-01');
    expect(row[2]).toBe('2026-06-01');
  });

  it('uses emptyBb when bb100Hands is 0', () => {
    const session = makeSession({
      bb100Hands: 0,
      bb100: 0,
      totalBb: 0,
    });

    const row = buildSessionRow(session, {
      dateFormat: 'yyyy-MM-dd HH:mm',
      pct: dummyPct,
      emptyBb: 'N/A',
      includeBbHands: true,
    });

    expect(row[12]).toBe('N/A');
    expect(row[13]).toBe('N/A');
  });

  it('uses custom pct formatter for all ratio columns', () => {
    const session = makeSession();
    const customPct = (n: number, d: number): string =>
      d === 0 ? '0.0%' : `${((n / d) * 100).toFixed(1)}%`;

    const row = buildSessionRow(session, {
      dateFormat: 'yyyy-MM-dd HH:mm',
      pct: customPct,
      emptyBb: '--',
      includeBbHands: true,
    });

    expect(row[5]).toBe('25.0%'); // VPIP %
    expect(row[6]).toBe('18.0%'); // PFR %
    expect(row[7]).toBe('70.0%'); // C-bet %
    expect(row[16]).toBe('20.0%'); // 3-bet %
    expect(row[17]).toBe('50.0%'); // Double Barrel %
  });
});
