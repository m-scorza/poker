import { describe, it, expect } from 'vitest';
import { buildCoachsNote, COACHS_NOTE_MIN_HANDS } from '../coachsNote';
import type { Leak } from '../leakDetector';
import type { HeroDecision } from '../../types/analysis';
import { makeHand } from '../../test/factories';

function makeDecision(over: Partial<HeroDecision> = {}): HeroDecision {
  return {
    handId: 'h', position: 'CO', handKey: 'AQs', stackBb: 30,
    scenario: 'RFI', action: 'raise', isCompliant: true, deviationType: null,
    sawFlop: false, wasPreFlopRaiser: true, cbetOpportunity: false, cbetMade: false,
    cbetHU: false, doubleBarrelOpportunity: false, doubleBarrelMade: false,
    wentToShowdown: false, wonAtShowdown: false, wonAmount: 0, netProfit: 0,
    ...over,
  };
}

function makeLeak(over: Partial<Leak> = {}): Leak {
  return {
    id: 'cbet_total', name: 'C-bet too low', description: 'You are c-betting below target.',
    severity: 'critical', value: 45, target: [60, 70], deviation: 15, sampleSize: 50,
    confidence: 'high', ...over,
  };
}

function decisions(n: number, over: Partial<HeroDecision> = {}): HeroDecision[] {
  return Array.from({ length: n }, (_, i) => makeDecision({ handId: `h${i}`, ...over }));
}

describe('buildCoachsNote', () => {
  it('refuses to name a focus when there are too few hands', () => {
    const note = buildCoachsNote({ leaks: [makeLeak()], decisions: decisions(1), hands: [makeHand()] });
    expect(note.kind).toBe('insufficient_data');
    if (note.kind === 'insufficient_data') {
      expect(note.handsAnalyzed).toBe(1);
      expect(note.message).toContain(String(COACHS_NOTE_MIN_HANDS));
    }
  });

  it('reports all-clear when a real sample produces no study items', () => {
    // Clean, compliant, break-even decisions and no leaks → empty study queue.
    const note = buildCoachsNote({ leaks: [], decisions: decisions(25), hands: [] });
    expect(note.kind).toBe('all_clear');
  });

  it('surfaces a focus leak with its costliest hands as receipts', () => {
    // Decisions genuinely evidence the cbet_total leak (missed c-bet spots) so
    // they clear the clarity gate the aggregate-leak path now requires.
    const losing = decisions(25, {
      netProfit: -300,
      scenario: 'FACING_RAISE',
      sawFlop: true,
      cbetOpportunity: true,
      cbetMade: false,
    });
    const hands = losing.map((d) => makeHand({ id: d.handId, bigBlind: 100 }));
    const note = buildCoachsNote({
      leaks: [makeLeak()], decisions: losing, hands, now: new Date('2026-06-22T00:00:00Z'),
    });

    expect(note.kind).toBe('focus');
    if (note.kind === 'focus') {
      expect(note.receipts.length).toBeGreaterThan(0);
      expect(note.receipts.length).toBeLessThanOrEqual(3);
      expect(note.noDecisiveHand).toBe(false);
      expect(note.drillCta).toMatch(/arena/i);
    }
  });

  it('never surfaces an unrelated cooler as proof of an aggregate three-bet leak', () => {
    // 24 genuine facing-raise spots (the leak's real mechanism) plus one large
    // cooler that is NOT a 3-bet spot. The cooler is the single biggest loss, so
    // severity-only ranking (the pre-fix behaviour) would crown it as "proof" of
    // a 3-bet-frequency leak. Relevance filtering must exclude it entirely.
    // Distinct handKeys so representativeness cannot rescue these hands — under
    // the old severity-driven ranking the single big cooler outranks each of
    // them and is surfaced as the "proof" hand.
    const HAND_KEYS = ['AQs', 'KJs', 'A5s', 'T9s', 'QJo'];
    const facingRaise = Array.from({ length: 24 }, (_, i) =>
      makeDecision({ handId: `fr${i}`, scenario: 'FACING_RAISE', netProfit: -300, handKey: HAND_KEYS[i % HAND_KEYS.length] }),
    );
    const cooler = makeDecision({ handId: 'cooler', scenario: 'RFI', netProfit: -800, handKey: 'AA' });
    const allDecisions = [...facingRaise, cooler];
    const source = {
      site: 'pokerstars',
      fileType: 'hand_history',
      accessMethod: 'local_file',
      parserConfidence: 'high',
    } as const;
    const hands = allDecisions.map((d) => makeHand({ id: d.handId, bigBlind: 100, importSource: source }));

    const leak = makeLeak({
      id: 'three_bet', name: '3-bet too low', severity: 'critical',
      value: 3, target: [7, 10], deviation: 15, sampleSize: 50,
    });
    const note = buildCoachsNote({
      leaks: [leak], decisions: allDecisions, hands, now: new Date('2026-05-20T00:00:00Z'),
    });

    expect(note.kind).toBe('focus');
    if (note.kind === 'focus') {
      expect(note.focus.leakTitle).toBe('3-bet too low');
      expect(note.receipts.length).toBeGreaterThan(0);
      expect(note.receipts.every((r) => r.handId !== 'cooler')).toBe(true);
      expect(note.receipts.some((r) => r.reasons.includes('clarity'))).toBe(true);
    }
  });

  it('is honest when no single hand is decisive (frequency-only leak)', () => {
    // A real focus leak, but every decision is break-even — the receipt ranker
    // (which only ranks losing hands) returns nothing, and we say so rather than
    // invent a "proof" hand.
    const breakEven = decisions(25, { netProfit: 0 });
    const hands = breakEven.map((d) => makeHand({ id: d.handId, bigBlind: 100 }));
    const note = buildCoachsNote({ leaks: [makeLeak()], decisions: breakEven, hands });

    expect(note.kind).toBe('focus');
    if (note.kind === 'focus') {
      expect(note.focus.leakTitle).toBe('C-bet too low');
      expect(note.receipts).toHaveLength(0);
      expect(note.noDecisiveHand).toBe(true);
    }
  });
});
