import { describe, it, expect } from 'vitest';
import { buildCoachsNote, COACHS_NOTE_MIN_HANDS, type CoachStudyPacketFocus } from '../coachsNote';
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
    const losing = decisions(25, { netProfit: -300, scenario: 'FACING_RAISE' });
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

  it('carries the selected local Study Queue packet focus into the coach note', () => {
    const losing = decisions(25, { netProfit: -300, scenario: 'FACING_RAISE' });
    const hands = losing.map((d) => makeHand({ id: d.handId, bigBlind: 100 }));
    const studyPacketFocus: CoachStudyPacketFocus = {
      packet: {
        packetId: 'spot-h0',
        source: { handId: 'h0' },
        hero: { handKey: 'QJs', position: 'BB', scenario: 'BB_VS_RAISE' },
      } as CoachStudyPacketFocus['packet'],
      srsStatus: 'SRS repeat due now',
    };

    const note = buildCoachsNote({
      leaks: [makeLeak()],
      decisions: losing,
      hands,
      studyPacketFocus,
    });

    expect(note.kind).toBe('focus');
    if (note.kind === 'focus') {
      expect(note.studyPacketFocus?.packet.packetId).toBe('spot-h0');
      expect(note.studyPacketFocus?.srsStatus).toBe('SRS repeat due now');
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
