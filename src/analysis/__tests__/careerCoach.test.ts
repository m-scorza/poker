import { describe, expect, it } from 'vitest';
import { buildCareerCoachMarkdownReport, buildCareerCoachReport } from '../careerCoach';
import type { Tournament } from '../../types/hand';
import type { HeroDecision } from '../../types/analysis';
import type { Leak } from '../leakDetector';

function makeTournament(index: number, overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: `t-${index}`,
    name: `Tournament ${index}`,
    startDate: new Date(2026, 0, index),
    buyIn: 1,
    fee: 0.1,
    format: 'MTT',
    finishPosition: null,
    prize: 0,
    bounty: 0,
    handsPlayed: 20,
    ...overrides,
  };
}

function makeDecision(index: number, compliant = true): HeroDecision {
  return {
    handId: `h-${index}`,
    position: 'BTN',
    handKey: 'AKs',
    stackBb: 30,
    scenario: 'RFI',
    action: 'raise',
    isCompliant: compliant,
    deviationType: compliant ? null : 'OPENED_OUT_OF_RANGE',
    sawFlop: true,
    wasPreFlopRaiser: true,
    cbetOpportunity: true,
    cbetMade: true,
    cbetHU: true,
    doubleBarrelOpportunity: false,
    doubleBarrelMade: false,
    wentToShowdown: false,
    wonAtShowdown: false,
    wonAmount: 0,
    netProfit: 0,
  };
}

function makeLeak(overrides: Partial<Leak> = {}): Leak {
  return {
    id: 'cbet_hu',
    name: 'C-bet HU',
    description: 'Missed c-bets in heads-up pots as PFR',
    severity: 'critical',
    value: 62,
    target: [95, 100],
    deviation: 33,
    sampleSize: 20,
    ...overrides,
  };
}

describe('buildCareerCoachReport', () => {
  it('labels profitable mature samples as move-up candidates when leaks and drawdown are controlled', () => {
    const tournaments = Array.from({ length: 120 }, (_, i) => makeTournament(i + 1, {
      prize: i % 4 === 0 ? 8 : 0,
      finishPosition: i % 4 === 0 ? 3 : null,
    }));
    const decisions = Array.from({ length: 120 }, (_, i) => makeDecision(i, true));

    const report = buildCareerCoachReport(tournaments, decisions, []);

    expect(report.recommendation).toBe('Move Up Candidate');
    expect(report.stakeReadinessScore).toBeGreaterThanOrEqual(75);
    expect(report.sampleConfidence).toBe('high');
    expect(report.currentAbiBankrollTarget).toBeCloseTo(110);
  });

  it('blocks stake changes when sample size is too small', () => {
    const tournaments = Array.from({ length: 12 }, (_, i) => makeTournament(i + 1, {
      prize: i % 3 === 0 ? 5 : 0,
    }));

    const report = buildCareerCoachReport(tournaments, [], []);

    expect(report.recommendation).toBe('Need More Sample');
    expect(report.sampleConfidence).toBe('low');
    expect(report.topBlocker?.severity).toBe('sample');
    expect(report.nextActions[0]).toContain('30 tournament summaries');
  });

  it('recommends moving down or rebuilding for losing samples with large drawdown', () => {
    const tournaments = Array.from({ length: 60 }, (_, i) => makeTournament(i + 1, {
      prize: i < 5 ? 2 : 0,
    }));

    const report = buildCareerCoachReport(tournaments, [], []);

    expect(report.recommendation).toBe('Move Down / Rebuild');
    expect(report.roi).toBeLessThan(-10);
    expect(report.maxDrawdownBuyIns).toBeGreaterThan(35);
  });

  it('uses the highest-severity leak as the top blocker and penalizes readiness', () => {
    const tournaments = Array.from({ length: 60 }, (_, i) => makeTournament(i + 1, {
      prize: i % 5 === 0 ? 7 : 0,
    }));
    const decisions = Array.from({ length: 100 }, (_, i) => makeDecision(i, i % 5 !== 0));

    const cleanReport = buildCareerCoachReport(tournaments, decisions, []);
    const leakReport = buildCareerCoachReport(tournaments, decisions, [
      makeLeak({ id: 'vpip', name: 'VPIP', severity: 'medium', deviation: 8 }),
      makeLeak({ id: 'cbet_hu', name: 'C-bet HU', severity: 'critical', deviation: 33 }),
    ]);

    expect(leakReport.topBlocker?.title).toBe('C-bet HU');
    expect(leakReport.stakeReadinessScore).toBeLessThan(cleanReport.stakeReadinessScore);
    expect(leakReport.nextActions.some((action) => action.includes('C-bet HU'))).toBe(true);
  });

  it('exports a concise markdown report suitable for sharing with a prospect or coach', () => {
    const tournaments = Array.from({ length: 35 }, (_, i) => makeTournament(i + 1, {
      prize: i % 4 === 0 ? 6 : 0,
      finishPosition: i % 4 === 0 ? 8 : null,
    }));
    const decisions = Array.from({ length: 60 }, (_, i) => makeDecision(i, i % 7 !== 0));
    const report = buildCareerCoachReport(tournaments, decisions, [makeLeak({ name: 'C-bet HU' })]);

    const markdown = buildCareerCoachMarkdownReport(report);

    expect(markdown).toContain('# Poker Career Coach Report');
    expect(markdown).toContain(`Recommendation: ${report.recommendation}`);
    expect(markdown).toContain('## Next 3 Actions');
    expect(markdown).toContain('C-bet HU');
  });
});
