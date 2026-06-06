import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildStudyQueue } from '../studyPlan';
import type { HeroDecision } from '../../types/analysis';
import type { Evidence } from '../../types/evidence';
import type { Hand } from '../../types/hand';
import type { Leak } from '../leakDetector';

function hand(id: string, bigBlind = 100): Hand {
  return {
    id,
    tournamentId: 't1',
    date: new Date('2026-05-01T00:00:00Z'),
    level: 1,
    smallBlind: bigBlind / 2,
    bigBlind,
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
    heroChipsBefore: 5000,
    heroChipsAfter: 5000,
    villainDeltas: [],
  };
}

function decision(overrides: Partial<HeroDecision>): HeroDecision {
  return {
    handId: 'h1',
    position: 'BTN',
    handKey: 'A5s',
    stackBb: 30,
    scenario: 'RFI',
    action: 'fold',
    isCompliant: true,
    deviationType: null,
    sawFlop: false,
    wasPreFlopRaiser: false,
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

const complianceLeak: Leak = {
  id: 'compliance',
  name: 'Range Compliance',
  description: 'Range compliance below target',
  severity: 'high',
  value: 72,
  target: [90, 100],
  deviation: 18,
  sampleSize: 80,
};

function expectEvidenceCitationsToResolve(evidence: Evidence): void {
  for (const citation of evidence.citations) {
    const path = resolve(process.cwd(), citation.docPath);
    expect(existsSync(path), citation.docPath).toBe(true);
    expect(readFileSync(path, 'utf8'), `${citation.docPath} should contain quote`).toContain(citation.quote);
  }
}

describe('buildStudyQueue', () => {
  it('turns leaks into prioritized study items with a concrete CTA', () => {
    const queue = buildStudyQueue([complianceLeak], [], [], 3);

    expect(queue[0]).toMatchObject({
      id: 'leak-compliance',
      title: 'Range Compliance',
      source: 'leak',
      severity: 'high',
      cta: 'Open Range Matrix',
      confidence: 'high',
      evidence: {
        kind: 'aggregate_leak',
        label: 'Aggregate leak sample',
      },
    });
    expect(queue[0]!.priorityScore).toBeGreaterThan(0);
    expect(queue[0]!.evidence.trust.kind).toBe('rule_based');
    expect(queue[0]!.evidence.trust.citations).toHaveLength(1);
    expectEvidenceCitationsToResolve(queue[0]!.evidence.trust);
  });

  it('clusters repeated deviation types and ranks hands by normalized BB loss', () => {
    const decisions = [
      decision({ handId: 'h1', deviationType: 'BB_FOLD_SUITED', isCompliant: false, scenario: 'BB_VS_RAISE', netProfit: -250 }),
      decision({ handId: 'h2', deviationType: 'BB_FOLD_SUITED', isCompliant: false, scenario: 'BB_VS_RAISE', netProfit: -900 }),
      decision({ handId: 'h3', deviationType: 'OPENED_OUT_OF_RANGE', isCompliant: false, action: 'raise', netProfit: -50 }),
    ];
    const queue = buildStudyQueue([], decisions, [hand('h1', 50), hand('h2', 100), hand('h3', 50)], 5);

    const bbDefense = queue.find((item) => item.id === 'deviation-BB_FOLD_SUITED');
    expect(bbDefense).toBeDefined();
    expect(bbDefense!.sampleSize).toBe(2);
    expect(bbDefense!.estimatedBbLoss).toBe(14); // 5bb + 9bb
    expect(bbDefense!.handIds).toEqual(['h2', 'h1']);
    expect(bbDefense!.explanation).toContain('BB vs raise');
    expect(bbDefense!.confidence).toBe('low');
    expect(bbDefense!.evidence.details).toContain('2 tagged decisions');
    expect(bbDefense!.evidence.trust.kind).toBe('rule_based');
    expect(bbDefense!.evidence.trust.citations[0]?.docPath).toBe('docs/knowledge/strategy/03-preflop-strategy.md');
    expectEvidenceCitationsToResolve(bbDefense!.evidence.trust);
  });

  it('adds a GTO Wizard style biggest-loss review queue in BB, not raw chips', () => {
    const decisions = [
      decision({ handId: 'smallBlindLevel', netProfit: -400 }),
      decision({ handId: 'bigBlindLevel', netProfit: -1000 }),
    ];
    const queue = buildStudyQueue([], decisions, [hand('smallBlindLevel', 50), hand('bigBlindLevel', 500)], 5);

    const lossQueue = queue.find((item) => item.id === 'loss-biggest-bb-swings');
    expect(lossQueue).toBeDefined();
    expect(lossQueue!.estimatedBbLoss).toBe(10); // 8bb + 2bb
    expect(lossQueue!.handIds).toEqual(['smallBlindLevel', 'bigBlindLevel']);
    expect(lossQueue!.confidence).toBe('low');
    expect(lossQueue!.evidence).toMatchObject({
      kind: 'bb_loss_review',
      label: 'Normalized BB loss review',
    });
    expect(lossQueue!.evidence.trust.kind).toBe('unsupported');
    expect(lossQueue!.evidence.trust.citations).toHaveLength(0);
  });

  it('creates a missed c-bet drill when flop pressure opportunities are skipped', () => {
    const decisions = [
      decision({ handId: 'cbet1', cbetOpportunity: true, cbetMade: false, cbetHU: true, netProfit: -300 }),
      decision({ handId: 'cbet2', cbetOpportunity: true, cbetMade: true, cbetHU: true, netProfit: 120 }),
    ];
    const queue = buildStudyQueue([], decisions, [hand('cbet1', 100), hand('cbet2', 100)], 5);

    const cbetQueue = queue.find((item) => item.id === 'postflop-missed-cbet');
    expect(cbetQueue).toMatchObject({
      title: 'Missed c-bet drill queue',
      sampleSize: 1,
      handIds: ['cbet1'],
      confidence: 'low',
      evidence: {
        kind: 'postflop_flags',
        label: 'Postflop opportunity tags',
        details: ['1 missed continuation-bet opportunity'],
      },
    });
    expect(cbetQueue!.evidence.trust.kind).toBe('proxy_model');
    expect(cbetQueue!.evidence.trust.citations[0]?.docPath).toBe('docs/knowledge/strategy/04-postflop-strategy.md');
    expectEvidenceCitationsToResolve(cbetQueue!.evidence.trust);
  });
});
