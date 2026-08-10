import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseTournamentSummary } from '../../parser/tournamentSummary';
import {
  fieldBucket,
  structureKey,
  learnPayoutStructures,
  lookupPayoutPct,
  completePaidPlaces,
  findPayoutKnowledgeGaps,
} from '../payoutStructures';
import type { Tournament } from '../../types/hand';

const TS_DIR = join(__dirname, '..', '..', 'test', 'fixtures', 'pokerstars', 'ts');

function tournament(overrides: Partial<Tournament> & { id: string }): Tournament {
  return {
    buyIn: 0.42,
    fee: 0.08,
    format: 'Unknown',
    finishPosition: null,
    prize: null,
    bounty: null,
    currency: 'USD',
    handsPlayed: 0,
    ...overrides,
  };
}

describe('fieldBucket()', () => {
  it('keeps small fields exact because SNG payouts key to seat count', () => {
    expect(fieldBucket(9)).toBe('9');
    expect(fieldBucket(32)).toBe('32');
    expect(fieldBucket(45)).toBe('45');
  });

  it('buckets larger fields into tiers', () => {
    expect(fieldBucket(46)).toBe('46-99');
    expect(fieldBucket(199)).toBe('100-249');
    expect(fieldBucket(473)).toBe('250-499');
    expect(fieldBucket(999)).toBe('500-999');
    expect(fieldBucket(5000)).toBe('1000+');
  });
});

describe('structureKey()', () => {
  it('keys on total cost and field bucket', () => {
    expect(structureKey(tournament({ id: 't1', entrants: 9 }))).toBe('0.50|9');
  });

  it('refuses tournaments it cannot key', () => {
    expect(structureKey(tournament({ id: 't2' }))).toBeNull();
    expect(structureKey(tournament({ id: 't3', entrants: 9, buyIn: 0, fee: 0 }))).toBeNull();
    expect(structureKey(tournament({ id: 't4', entrants: 9, currency: 'PLAY' }))).toBeNull();
  });
});

describe('learnPayoutStructures()', () => {
  it('accumulates a curve across repeated runnings of the same structure', () => {
    const structures = learnPayoutStructures([
      tournament({ id: 'a', entrants: 9, finishPosition: 1, prize: 1.9, payoutPct: 50.264 }),
      tournament({ id: 'b', entrants: 9, finishPosition: 2, prize: 1.13, payoutPct: 29.894 }),
      tournament({ id: 'c', entrants: 9, finishPosition: 3, prize: 0.75, payoutPct: 19.841 }),
    ]);

    expect(structures).toHaveLength(1);
    expect(structures[0]!.key).toBe('0.50|9');
    expect(structures[0]!.tournaments).toBe(3);
    expect(structures[0]!.curve.map((p) => p.finishPosition)).toEqual([1, 2, 3]);
  });

  it('averages repeat observations and reports their spread', () => {
    const [structure] = learnPayoutStructures([
      tournament({ id: 'a', entrants: 9, finishPosition: 3, prize: 0.75, payoutPct: 19.841 }),
      tournament({ id: 'b', entrants: 9, finishPosition: 3, prize: 0.76, payoutPct: 20 }),
    ]);

    const point = structure!.curve[0]!;
    expect(point.observations).toBe(2);
    expect(point.payoutPct).toBeCloseTo(19.9205, 4);
    expect(point.spreadPct).toBeCloseTo(0.159, 3);
  });

  it('ignores finishes that carry no payout share', () => {
    expect(
      learnPayoutStructures([
        tournament({ id: 'a', entrants: 9, finishPosition: 7, prize: 0 }),
      ]),
    ).toEqual([]);
  });

  it('separates structures that differ only by field size', () => {
    const structures = learnPayoutStructures([
      tournament({ id: 'a', entrants: 9, finishPosition: 1, payoutPct: 50.264 }),
      tournament({ id: 'b', entrants: 32, finishPosition: 1, payoutPct: 39.375 }),
    ]);

    expect(structures.map((s) => s.key).sort()).toEqual(['0.50|32', '0.50|9']);
  });

  it('grades confidence by tournaments and places observed', () => {
    const oneOff = learnPayoutStructures([
      tournament({ id: 'a', entrants: 9, finishPosition: 1, payoutPct: 50 }),
    ]);
    expect(oneOff[0]!.confidence).toBe('low');

    const many = learnPayoutStructures(
      Array.from({ length: 12 }, (_, i) =>
        tournament({
          id: `t${i}`,
          entrants: 9,
          finishPosition: (i % 3) + 1,
          payoutPct: [50.264, 29.894, 19.841][i % 3]!,
        }),
      ),
    );
    expect(many[0]!.confidence).toBe('high');
  });
});

describe('lookupPayoutPct()', () => {
  it('returns null for places the corpus has not shown, never an interpolation', () => {
    const [structure] = learnPayoutStructures([
      tournament({ id: 'a', entrants: 9, finishPosition: 1, payoutPct: 50.264 }),
      tournament({ id: 'b', entrants: 9, finishPosition: 3, payoutPct: 19.841 }),
    ]);

    expect(lookupPayoutPct(structure!, 1)).toBeCloseTo(50.264, 3);
    expect(lookupPayoutPct(structure!, 2)).toBeNull();
  });
});

describe('completePaidPlaces()', () => {
  it('knows the table is complete once the shares account for the whole pool', () => {
    const [structure] = learnPayoutStructures([
      tournament({ id: 'a', entrants: 9, finishPosition: 1, payoutPct: 50.264 }),
      tournament({ id: 'b', entrants: 9, finishPosition: 2, payoutPct: 29.894 }),
      tournament({ id: 'c', entrants: 9, finishPosition: 3, payoutPct: 19.841 }),
    ]);

    expect(completePaidPlaces(structure!)).toBe(3);
  });

  it('refuses while the curve is still partial, since a gap may just be unobserved', () => {
    const [structure] = learnPayoutStructures([
      tournament({ id: 'a', entrants: 9, finishPosition: 1, payoutPct: 50.264 }),
      tournament({ id: 'b', entrants: 9, finishPosition: 3, payoutPct: 19.841 }),
    ]);

    expect(completePaidPlaces(structure!)).toBeNull();
  });
});

describe('findPayoutKnowledgeGaps()', () => {
  it('flags a missing field size', () => {
    expect(findPayoutKnowledgeGaps([tournament({ id: 'a' })])).toEqual([
      { tournamentId: 'a', reason: 'no_entrants' },
    ]);
  });

  it('flags a cash finish whose payout share did not parse', () => {
    expect(
      findPayoutKnowledgeGaps([
        tournament({ id: 'a', entrants: 9, finishPosition: 1, prize: 1.9 }),
      ]),
    ).toEqual([{ tournamentId: 'a', reason: 'no_payout_pct' }]);
  });

  it('does not treat busting out as a gap', () => {
    expect(
      findPayoutKnowledgeGaps([
        tournament({ id: 'a', entrants: 9, finishPosition: 7, prize: 0 }),
      ]),
    ).toEqual([]);
  });
});

describe('learned from the real summary corpus', () => {
  const tournaments: Tournament[] = readdirSync(TS_DIR)
    .filter((file) => file.endsWith('.txt'))
    .sort()
    .flatMap((file) => {
      const summary = parseTournamentSummary(readFileSync(join(TS_DIR, file), 'utf8'), 'scorza23');
      if (!summary) return [];
      return [
        {
          id: summary.tournamentId,
          name: summary.name,
          buyIn: summary.buyIn ?? 0,
          fee: summary.fee ?? 0,
          format: 'Unknown',
          finishPosition: summary.finishPosition,
          prize: summary.prize,
          bounty: summary.bounty,
          currency: summary.currency,
          handsPlayed: 0,
          entrants: summary.entrants,
          prizePool: summary.prizePool,
          payoutPct: summary.payoutPct,
          reEntries: summary.reEntries,
        },
      ];
    });

  it('recovers a field size from every summary in the corpus', () => {
    expect(tournaments).toHaveLength(157);
    expect(tournaments.every((t) => (t.entrants ?? 0) > 0)).toBe(true);
  });

  it('reconstructs the 50/30/20 nine-man payout without any external table', () => {
    const nineMan = learnPayoutStructures(tournaments).find((s) => s.key === '0.50|9');

    expect(nineMan).toBeDefined();
    expect(nineMan!.confidence).toBe('high');
    expect(nineMan!.curve.map((p) => p.finishPosition)).toEqual([1, 2, 3]);
    expect(nineMan!.curve[0]!.payoutPct).toBeCloseTo(50.264, 2);
    expect(nineMan!.curve[1]!.payoutPct).toBeCloseTo(29.894, 2);
    expect(nineMan!.curve[2]!.payoutPct).toBeCloseTo(19.841, 2);
  });

  it('reconstructs a complete 32-man payout table that sums to the whole pool', () => {
    const thirtyTwo = learnPayoutStructures(tournaments).find((s) => s.key === '0.50|32');

    expect(thirtyTwo!.curve.map((p) => p.finishPosition)).toEqual([1, 2, 3, 4, 5]);
    const total = thirtyTwo!.curve.reduce((sum, p) => sum + p.payoutPct, 0);
    expect(total).toBeCloseTo(100, 1);
    expect(completePaidPlaces(thirtyTwo!)).toBe(5);
  });

  it('reports payout shares that are stable across runnings', () => {
    for (const structure of learnPayoutStructures(tournaments)) {
      for (const point of structure.curve) {
        expect(point.spreadPct).toBeLessThan(0.5);
      }
    }
  });
});
