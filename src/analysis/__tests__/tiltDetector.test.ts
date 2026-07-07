import { describe, expect, it } from 'vitest';
import type { Hand } from '../../types/hand';
import type { HeroDecision, Scenario } from '../../types/analysis';
import {
  detectTilt,
  TILT_MIN_TRIGGERS,
  TILT_MIN_WINDOW_DECISIONS,
  TILT_WINDOW_HANDS,
} from '../tiltDetector';

const T0 = new Date('2026-07-01T18:00:00Z').getTime();
const MINUTE = 60 * 1000;

function hand(
  id: string,
  minute: number,
  opts: { before?: number; after?: number; bb?: number } = {},
): Hand {
  const { before = 10000, after = 10000, bb = 100 } = opts;
  return {
    id,
    tournamentId: 't1',
    date: new Date(T0 + minute * MINUTE),
    level: 1,
    smallBlind: bb / 2,
    bigBlind: bb,
    ante: 0,
    maxSeats: 9,
    activePlayers: 9,
    buttonSeat: 1,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 0,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: before,
    heroChipsAfter: after,
    villainDeltas: [],
  };
}

function decision(
  handId: string,
  opts: {
    action?: HeroDecision['action'];
    isCompliant?: boolean;
    scenario?: Scenario;
  } = {},
): HeroDecision {
  const { action = 'raise', isCompliant = true, scenario = 'RFI' } = opts;
  return {
    handId,
    position: 'CO',
    handKey: 'AKs',
    stackBb: 100,
    scenario,
    action,
    isCompliant,
    deviationType: null,
    sawFlop: false,
    wasPreFlopRaiser: action === 'raise',
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

interface StretchOptions {
  compliant?: boolean;
  action?: HeroDecision['action'];
  scenario?: Scenario;
  lossEvery?: number;
}

/** A run of one-minute-apart hands, each carrying one decision. */
function stretch(
  idPrefix: string,
  startMinute: number,
  count: number,
  opts: StretchOptions = {},
): { hands: Hand[]; decisions: HeroDecision[] } {
  const hands: Hand[] = [];
  const decisions: HeroDecision[] = [];
  for (let i = 0; i < count; i++) {
    const id = `${idPrefix}-${i}`;
    const isLoss = opts.lossEvery !== undefined && i % opts.lossEvery === 0;
    hands.push(
      hand(id, startMinute + i, isLoss ? { before: 10000, after: 7000 } : {}),
    );
    decisions.push(
      decision(id, {
        isCompliant: opts.compliant ?? true,
        action: opts.action,
        scenario: opts.scenario,
      }),
    );
  }
  return { hands, decisions };
}

describe('detectTilt', () => {
  it('refuses on too few triggers and says why', () => {
    const calm = stretch('calm', 0, 120);
    const report = detectTilt({ hands: calm.hands, decisions: calm.decisions });
    expect(report.kind).toBe('insufficient_data');
    if (report.kind === 'insufficient_data') {
      expect(report.triggersFound).toBe(0);
      expect(report.message).toContain(`${TILT_MIN_TRIGGERS}`);
      expect(report.message).toContain('rough moment');
    }
  });

  it('refuses when triggers sit at session ends with no post-trigger decisions', () => {
    const hands: Hand[] = [];
    const decisions: HeroDecision[] = [];
    for (let s = 0; s < 3; s++) {
      const base = s * 600; // 10h apart => separate sessions
      const calm = stretch(`s${s}`, base, 30);
      hands.push(...calm.hands, hand(`s${s}-loss`, base + 30, { before: 10000, after: 4000 }));
      decisions.push(...calm.decisions);
    }
    const report = detectTilt({ hands, decisions });
    expect(report.kind).toBe('insufficient_data');
    if (report.kind === 'insufficient_data') {
      expect(report.triggersFound).toBe(3);
      expect(report.windowDecisions).toBe(0);
      expect(report.message).toContain(`${TILT_MIN_WINDOW_DECISIONS}`);
    }
  });

  it('reports steady when post-trigger play matches baseline', () => {
    const hands: Hand[] = [];
    const decisions: HeroDecision[] = [];
    let minute = 0;
    for (let block = 0; block < 4; block++) {
      const calm = stretch(`b${block}`, minute, 40);
      hands.push(...calm.hands);
      decisions.push(...calm.decisions);
      minute += 40;
      hands.push(hand(`b${block}-loss`, minute, { before: 10000, after: 6000 }));
      minute += 1;
    }
    const tail = stretch('tail', minute, TILT_WINDOW_HANDS + 5);
    hands.push(...tail.hands);
    decisions.push(...tail.decisions);

    const report = detectTilt({ hands, decisions });
    expect(report.kind).toBe('steady');
    if (report.kind === 'steady') {
      expect(report.triggersFound).toBe(4);
      const compliance = report.comparisons.find((c) => c.metric === 'compliance');
      expect(compliance).toBeDefined();
      expect(compliance!.deltaPp).toBeCloseTo(0);
    }
  });

  it('detects a compliance-drop signature with receipts from the worst triggers', () => {
    const hands: Hand[] = [];
    const decisions: HeroDecision[] = [];
    let minute = 0;
    const triggerLosses = [
      { id: 'loss-mild', before: 10000, after: 7000 }, // -30bb
      { id: 'loss-bad', before: 10000, after: 3000 }, // -70bb
      { id: 'loss-worst', before: 10000, after: 0 }, // bust, -100bb
    ];
    for (const loss of triggerLosses) {
      const calm = stretch(`calm-${loss.id}`, minute, 30);
      hands.push(...calm.hands);
      decisions.push(...calm.decisions);
      minute += 30;
      hands.push(hand(loss.id, minute, { before: loss.before, after: loss.after }));
      minute += 1;
      const shaken = stretch(`shaken-${loss.id}`, minute, TILT_WINDOW_HANDS, { compliant: false });
      hands.push(...shaken.hands);
      decisions.push(...shaken.decisions);
      minute += TILT_WINDOW_HANDS;
    }

    // Shuffle input to prove date-sorting is internal.
    const shuffled = [...hands].reverse();
    const report = detectTilt({ hands: shuffled, decisions });

    expect(report.kind).toBe('tilt_signature');
    if (report.kind === 'tilt_signature') {
      expect(report.triggersFound).toBe(3);
      const complianceSignal = report.signals.find((s) => s.metric === 'compliance');
      expect(complianceSignal).toBeDefined();
      expect(complianceSignal!.windowPct).toBe(0);
      expect(complianceSignal!.baselinePct).toBe(100);
      expect(report.confidence).toBe('high');
      expect(report.receiptHandIds[0]).toBe('loss-worst');
      expect(report.receiptHandIds).toContain('loss-bad');
      expect(report.message).toContain('range compliance');
    }
  });

  it('detects loosening (VPIP rise) even when compliance holds', () => {
    const hands: Hand[] = [];
    const decisions: HeroDecision[] = [];
    let minute = 0;
    for (let block = 0; block < 3; block++) {
      const calm = stretch(`calm${block}`, minute, 40, { action: 'fold' });
      hands.push(...calm.hands);
      decisions.push(...calm.decisions);
      minute += 40;
      hands.push(hand(`loss${block}`, minute, { before: 10000, after: 6000 }));
      minute += 1;
      const shaken = stretch(`shaken${block}`, minute, TILT_WINDOW_HANDS, { action: 'call' });
      hands.push(...shaken.hands);
      decisions.push(...shaken.decisions);
      minute += TILT_WINDOW_HANDS;
    }

    const report = detectTilt({ hands, decisions });
    expect(report.kind).toBe('tilt_signature');
    if (report.kind === 'tilt_signature') {
      const vpip = report.signals.find((s) => s.metric === 'vpip');
      expect(vpip).toBeDefined();
      expect(vpip!.deltaPp).toBeGreaterThan(0);
    }
  });

  it('bounds the window at N hands and at the session edge', () => {
    const hands: Hand[] = [];
    const decisions: HeroDecision[] = [];
    // Session 1: three triggers with exactly 10 in-window hands each (custom window).
    let minute = 0;
    for (let block = 0; block < 3; block++) {
      hands.push(hand(`loss${block}`, minute, { before: 10000, after: 6000 }));
      minute += 1;
      const shaken = stretch(`w${block}`, minute, 10);
      hands.push(...shaken.hands);
      decisions.push(...shaken.decisions);
      minute += 10;
      const calm = stretch(`c${block}`, minute, 30);
      hands.push(...calm.hands);
      decisions.push(...calm.decisions);
      minute += 30;
    }
    // Trigger as the last hand of session 1 — its window must NOT reach session 2.
    hands.push(hand('loss-end', minute, { before: 10000, after: 6000 }));
    const session2 = stretch('s2', minute + 600, 40); // 10h later
    hands.push(...session2.hands);
    decisions.push(...session2.decisions);

    const report = detectTilt({ hands, decisions, windowHands: 10 });
    expect(report.kind).toBe('steady');
    if (report.kind === 'steady') {
      expect(report.triggersFound).toBe(4);
      const vpip = report.comparisons.find((c) => c.metric === 'vpip');
      expect(vpip!.windowSample).toBe(30); // 3 triggers x 10 hands; session-end trigger adds none
      expect(vpip!.baselineSample).toBe(130); // 3x30 calm + 40 in session 2
    }
  });

  it('keeps ungraded scenarios out of the compliance metric but in the frequency metrics', () => {
    const hands: Hand[] = [];
    const decisions: HeroDecision[] = [];
    let minute = 0;
    for (let block = 0; block < 3; block++) {
      const calm = stretch(`calm${block}`, minute, 30);
      hands.push(...calm.hands);
      decisions.push(...calm.decisions);
      minute += 30;
      hands.push(hand(`loss${block}`, minute, { before: 10000, after: 6000 }));
      minute += 1;
      // Post-trigger: "non-compliant" all-in spots the engine refuses to grade,
      // plus graded RFI decisions that stay compliant.
      for (let i = 0; i < TILT_WINDOW_HANDS; i++) {
        const id = `shaken${block}-${i}`;
        hands.push(hand(id, minute + i));
        decisions.push(
          i % 2 === 0
            ? decision(id, { scenario: 'FACING_ALL_IN', isCompliant: false, action: 'call' })
            : decision(id, { scenario: 'RFI', isCompliant: true }),
        );
      }
      minute += TILT_WINDOW_HANDS;
    }

    const report = detectTilt({ hands, decisions });
    expect(report.kind).not.toBe('insufficient_data');
    if (report.kind === 'steady' || report.kind === 'tilt_signature') {
      const compliance = report.comparisons.find((c) => c.metric === 'compliance');
      expect(compliance!.windowSample).toBe(30); // only the graded RFI half
      expect(compliance!.windowPct).toBe(100); // refused spots never fake a drop
      const vpip = report.comparisons.find((c) => c.metric === 'vpip');
      expect(vpip!.windowSample).toBe(60); // frequency metrics see every decision
    }
  });

  it('classifies trigger thresholds: -20bb, half stack, bust-out; near-misses are calm', () => {
    const hands: Hand[] = [
      hand('big-loss', 0, { before: 10000, after: 7600 }), // -24bb
      hand('near-miss', 1, { before: 10000, after: 8100 }), // -19bb, 19% stack: calm
      hand('half-stack', 2, { before: 1000, after: 400, bb: 1000 }), // -0.6bb but 60% of stack
      hand('bust', 3, { before: 500, after: 0, bb: 1000 }),
      hand('sat-out', 4, { before: 0, after: 0 }), // no stack: never a trigger
    ];
    const report = detectTilt({ hands, decisions: [] });
    expect(report.kind).toBe('insufficient_data');
    if (report.kind === 'insufficient_data') {
      expect(report.triggersFound).toBe(3);
    }
  });
});
