import { describe, expect, it } from 'vitest';
import {
  selectProofHands,
  PROOF_HAND_WEIGHTS,
  RECENCY_FULL_WEIGHT_DAYS,
  RECENCY_ZERO_WEIGHT_DAYS,
} from '../proofHandSelector';
import type { HeroDecision } from '../../types/analysis';
import type { Hand } from '../../types/hand';

const NOW = new Date('2026-05-20T00:00:00Z');

function hand(id: string, overrides: Partial<Hand> = {}): Hand {
  return {
    id,
    tournamentId: 't1',
    date: NOW,
    level: 1,
    smallBlind: 50,
    bigBlind: 100,
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
    ...overrides,
  };
}

function decision(overrides: Partial<HeroDecision> & { handId: string }): HeroDecision {
  const { handId, ...rest } = overrides;
  return {
    handId,
    position: 'BB',
    handKey: 'A5s',
    stackBb: 30,
    scenario: 'BB_VS_RAISE',
    action: 'fold',
    isCompliant: false,
    deviationType: 'BB_FOLD_SUITED',
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
    netProfit: -100,
    ...rest,
  };
}

describe('selectProofHands', () => {
  it('returns empty when there are no decisions', () => {
    expect(selectProofHands({ decisions: [], hands: [], leakId: 'compliance', now: NOW })).toEqual([]);
  });

  it('skips hands with zero or positive net profit (no severity signal)', () => {
    const decisions = [
      decision({ handId: 'win', netProfit: 500 }),
      decision({ handId: 'breakeven', netProfit: 0 }),
    ];
    const hands = [hand('win'), hand('breakeven')];

    expect(selectProofHands({ decisions, hands, leakId: 'compliance', now: NOW })).toEqual([]);
  });

  it('ranks higher bb-loss above smaller bb-loss when other axes tie', () => {
    const decisions = [
      decision({ handId: 'small', netProfit: -100 }),  // 1bb loss
      decision({ handId: 'big', netProfit: -500 }),    // 5bb loss
    ];
    const hands = [hand('small'), hand('big')];

    const picks = selectProofHands({ decisions, hands, leakId: 'compliance', now: NOW });

    expect(picks[0]!.handId).toBe('big');
    expect(picks[0]!.reasons).toContain('severity');
  });

  it('respects the limit parameter and de-duplicates by handId', () => {
    const decisions = [
      decision({ handId: 'a', netProfit: -100 }),
      decision({ handId: 'b', netProfit: -200 }),
      decision({ handId: 'c', netProfit: -300 }),
      decision({ handId: 'd', netProfit: -400 }),
    ];
    const hands = decisions.map((d) => hand(d.handId));

    const picks = selectProofHands({ decisions, hands, leakId: 'compliance', now: NOW, limit: 2 });
    expect(picks).toHaveLength(2);
    expect(picks.map((p) => p.handId)).toEqual(['d', 'c']);
  });

  it('credits representativeness when many hands share (position, scenario, handKey)', () => {
    const recurring = Array.from({ length: 5 }, (_, i) =>
      decision({ handId: `r${i}`, netProfit: -50, handKey: 'K7o' }),
    );
    const oneOff = decision({ handId: 'cooler', netProfit: -2000, handKey: 'AAQ' });

    const hands = [...recurring.map((d) => hand(d.handId)), hand('cooler')];

    const picks = selectProofHands({
      decisions: [...recurring, oneOff],
      hands,
      leakId: 'compliance',
      now: NOW,
      limit: 6,
    });

    const cooler = picks.find((p) => p.handId === 'cooler')!;
    const aRecurring = picks.find((p) => p.handId === 'r0')!;
    expect(cooler.reasons).toContain('severity');
    expect(aRecurring.reasons).toContain('representativeness');
  });

  it('decays recency from full weight to zero across the configured window', () => {
    const recent = hand('recent', { date: NOW });
    const edge = hand('edge', {
      date: new Date(NOW.getTime() - RECENCY_FULL_WEIGHT_DAYS * 24 * 60 * 60 * 1000),
    });
    const old = hand('old', {
      date: new Date(NOW.getTime() - (RECENCY_ZERO_WEIGHT_DAYS + 1) * 24 * 60 * 60 * 1000),
    });

    const decisions = [
      decision({ handId: 'recent', netProfit: -100 }),
      decision({ handId: 'edge', netProfit: -100 }),
      decision({ handId: 'old', netProfit: -100 }),
    ];

    const picks = selectProofHands({ decisions, hands: [recent, edge, old], leakId: 'compliance', now: NOW });

    expect(picks[0]!.reasons).toContain('recency');
    const oldPick = picks.find((p) => p.handId === 'old');
    if (oldPick) expect(oldPick.reasons).not.toContain('recency');
  });

  it('credits clarity for rule-based leaks where the decision cleanly matches the precondition', () => {
    const matchingDecision = decision({
      handId: 'clean',
      netProfit: -100,
      deviationType: 'BB_FOLD_SUITED',
      isCompliant: false,
    });
    const noisyDecision = decision({
      handId: 'noisy',
      netProfit: -100,
      deviationType: null,
      isCompliant: true,
    });

    const picks = selectProofHands({
      decisions: [matchingDecision, noisyDecision],
      hands: [hand('clean'), hand('noisy')],
      leakId: 'compliance',
      evidenceKind: 'rule_based',
      now: NOW,
    });

    const clean = picks.find((p) => p.handId === 'clean')!;
    expect(clean.reasons).toContain('clarity');
  });

  it('does not credit clarity when the leak has no rule-based or local-reference provenance', () => {
    const decisions = [decision({ handId: 'unsup', netProfit: -100 })];

    const picks = selectProofHands({
      decisions,
      hands: [hand('unsup')],
      leakId: 'compliance',
      evidenceKind: 'unsupported',
      now: NOW,
    });

    expect(picks[0]!.reasons).not.toContain('clarity');
  });

  it('credits clarity for cbet_hu only when hero had an HU c-bet opportunity and missed it', () => {
    const missed = decision({
      handId: 'missed',
      netProfit: -150,
      cbetOpportunity: true,
      cbetHU: true,
      cbetMade: false,
      sawFlop: true,
    });
    const made = decision({
      handId: 'made',
      netProfit: -150,
      cbetOpportunity: true,
      cbetHU: true,
      cbetMade: true,
      sawFlop: true,
    });

    const picks = selectProofHands({
      decisions: [missed, made],
      hands: [hand('missed'), hand('made')],
      leakId: 'cbet_hu',
      evidenceKind: 'rule_based',
      now: NOW,
    });

    expect(picks.find((p) => p.handId === 'missed')!.reasons).toContain('clarity');
    expect(picks.find((p) => p.handId === 'made')!.reasons).not.toContain('clarity');
  });

  it('credits clarity on any postflop_* leak when the hand saw a flop', () => {
    const sawFlop = decision({ handId: 'flop', netProfit: -100, sawFlop: true });
    const noFlop = decision({ handId: 'noflop', netProfit: -100, sawFlop: false });

    const picks = selectProofHands({
      decisions: [sawFlop, noFlop],
      hands: [hand('flop'), hand('noflop')],
      leakId: 'postflop_missed_cbet',
      evidenceKind: 'rule_based',
      now: NOW,
    });

    expect(picks.find((p) => p.handId === 'flop')!.reasons).toContain('clarity');
    expect(picks.find((p) => p.handId === 'noflop')!.reasons).not.toContain('clarity');
  });

  it('credits clarity on limps, cbet_total, wtsd, won_sd, and three_bet leaks', () => {
    const limpHand = decision({ handId: 'limp', netProfit: -100, deviationType: 'LIMPED' });
    const cbetTotalHand = decision({ handId: 'cbetTotal', netProfit: -100, cbetOpportunity: true, cbetMade: false });
    const wtsdHand = decision({ handId: 'wtsd', netProfit: -100, wentToShowdown: true });
    const wonSdHand = decision({ handId: 'wonSd', netProfit: -100, wentToShowdown: true, wonAtShowdown: false });
    const threeBetHand = decision({ handId: 'threeBet', netProfit: -100, scenario: 'FACING_RAISE' });

    const picksLimp = selectProofHands({ decisions: [limpHand], hands: [hand('limp')], leakId: 'limps', evidenceKind: 'rule_based', now: NOW });
    const picksCbetTotal = selectProofHands({ decisions: [cbetTotalHand], hands: [hand('cbetTotal')], leakId: 'cbet_total', evidenceKind: 'rule_based', now: NOW });
    const picksWtsd = selectProofHands({ decisions: [wtsdHand], hands: [hand('wtsd')], leakId: 'wtsd', evidenceKind: 'rule_based', now: NOW });
    const picksWonSd = selectProofHands({ decisions: [wonSdHand], hands: [hand('wonSd')], leakId: 'won_sd', evidenceKind: 'rule_based', now: NOW });
    const picksThreeBet = selectProofHands({ decisions: [threeBetHand], hands: [hand('threeBet')], leakId: 'three_bet', evidenceKind: 'rule_based', now: NOW });

    expect(picksLimp.find(p => p.handId === 'limp')?.reasons).toContain('clarity');
    expect(picksCbetTotal.find(p => p.handId === 'cbetTotal')?.reasons).toContain('clarity');
    expect(picksWtsd.find(p => p.handId === 'wtsd')?.reasons).toContain('clarity');
    expect(picksWonSd.find(p => p.handId === 'wonSd')?.reasons).toContain('clarity');
    expect(picksThreeBet.find(p => p.handId === 'threeBet')?.reasons).toContain('clarity');
  });

  it('with requireClarity, excludes bigger-loss hands that do not match the leak mechanism', () => {
    const matching = decision({ handId: 'facing', netProfit: -100, scenario: 'FACING_RAISE' });
    const biggerButIrrelevant = decision({ handId: 'cooler', netProfit: -5000, scenario: 'RFI' });

    const picks = selectProofHands({
      decisions: [matching, biggerButIrrelevant],
      hands: [hand('facing'), hand('cooler')],
      leakId: 'three_bet',
      evidenceKind: 'rule_based',
      requireClarity: true,
      now: NOW,
    });

    expect(picks.map((p) => p.handId)).toEqual(['facing']);
    expect(picks[0]!.reasons).toContain('clarity');
  });

  it('with requireClarity, returns nothing for leaks that have no per-hand mechanism', () => {
    const picks = selectProofHands({
      decisions: [decision({ handId: 'a', netProfit: -500 })],
      hands: [hand('a')],
      leakId: 'vpip',
      evidenceKind: 'rule_based',
      requireClarity: true,
      now: NOW,
    });

    expect(picks).toEqual([]);
  });

  it('handles hand dates that are missing or in the future gracefully', () => {
    const missingDateHand = hand('missing', { date: undefined });
    const futureDateHand = hand('future', { date: new Date(NOW.getTime() + 100000) });
    const decisions = [
      decision({ handId: 'missing', netProfit: -100 }),
      decision({ handId: 'future', netProfit: -100 }),
    ];

    const picks = selectProofHands({ decisions, hands: [missingDateHand, futureDateHand], leakId: 'compliance', now: NOW });
    
    // Hand with missing date has 0 recency score, so reasons does not include 'recency'
    expect(picks.find(p => p.handId === 'missing')?.reasons).not.toContain('recency');
    // Hand with future date has 1 recency score, so reasons includes 'recency'
    expect(picks.find(p => p.handId === 'future')?.reasons).toContain('recency');
  });

  it('skips hands whose Hand record is missing a usable bigBlind', () => {
    const decisions = [
      decision({ handId: 'good', netProfit: -200 }),
      decision({ handId: 'broken', netProfit: -200 }),
    ];
    const hands = [hand('good'), hand('broken', { bigBlind: 0 })];

    const picks = selectProofHands({ decisions, hands, leakId: 'compliance', now: NOW });
    expect(picks.map((p) => p.handId)).toEqual(['good']);
  });

  it('produces deterministic ordering when ranking scores tie', () => {
    const decisions = [
      decision({ handId: 'z', netProfit: -100 }),
      decision({ handId: 'a', netProfit: -100 }),
      decision({ handId: 'm', netProfit: -100 }),
    ];
    const hands = decisions.map((d) => hand(d.handId));

    const first = selectProofHands({ decisions, hands, leakId: 'compliance', now: NOW });
    const second = selectProofHands({ decisions, hands, leakId: 'compliance', now: NOW });
    expect(first.map((p) => p.handId)).toEqual(second.map((p) => p.handId));
  });

  it('weights sum to 1.0 — invariant for the composite score', () => {
    const total =
      PROOF_HAND_WEIGHTS.severity +
      PROOF_HAND_WEIGHTS.representativeness +
      PROOF_HAND_WEIGHTS.recency +
      PROOF_HAND_WEIGHTS.clarity;
    expect(total).toBeCloseTo(1, 5);
  });
});
