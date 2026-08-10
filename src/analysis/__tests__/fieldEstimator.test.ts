import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parsePokerStarsFile } from '../../parser/pokerstars';
import { parseTournamentSummary } from '../../parser/tournamentSummary';
import {
  estimateStartingStack,
  estimateRemainingField,
  estimateMoneyProximity,
  stageFromField,
} from '../fieldEstimator';

const HH_DIR = join(__dirname, '..', '..', 'test', 'fixtures', 'pokerstars', 'hh');
const TS_DIR = join(__dirname, '..', '..', 'test', 'fixtures', 'pokerstars', 'ts');

function handAt(level: number, stacks: number[]) {
  return { hand: { level }, players: stacks.map((chipsBefore) => ({ chipsBefore })) };
}

describe('estimateStartingStack()', () => {
  it('takes the mode, not the maximum, so an early winner does not inflate it', () => {
    const estimate = estimateStartingStack([
      handAt(1, [1500, 1500, 1500, 1500, 1500, 1500, 1500, 2400, 600]),
      handAt(1, [1500, 1500, 1500, 1500, 1500, 1500, 3100, 1200, 200]),
    ]);

    expect(estimate).toEqual({ stack: 1500, fromLevelOne: true });
  });

  it('ignores hands above the earliest level', () => {
    expect(
      estimateStartingStack([handAt(1, [1500, 1500, 900]), handAt(4, [8000, 8000, 8000, 8000])]),
    ).toEqual({ stack: 1500, fromLevelOne: true });
  });

  it('flags an estimate that never saw level 1', () => {
    expect(estimateStartingStack([handAt(6, [5000, 5000, 3000])])).toEqual({
      stack: 5000,
      fromLevelOne: false,
    });
  });

  it('returns null without usable stacks', () => {
    expect(estimateStartingStack([])).toBeNull();
    expect(estimateStartingStack([handAt(1, [0, 0])])).toBeNull();
  });
});

describe('estimateRemainingField()', () => {
  it('divides total chips by the mean stack at the table', () => {
    const estimate = estimateRemainingField({
      entrants: 9,
      startingStack: 1500,
      tableStacks: [4500, 4500, 4500],
      startingStackConfirmed: true,
    });

    expect(estimate!.totalChips).toBe(13500);
    expect(estimate!.remainingPlayers).toBe(3);
    expect(estimate!.confidence).toBe('high');
  });

  it('never reports fewer players than are seated, nor more than entered', () => {
    const shallow = estimateRemainingField({
      entrants: 9,
      startingStack: 1500,
      tableStacks: [100, 100, 100, 100],
      startingStackConfirmed: true,
    });
    expect(shallow!.remainingPlayers).toBe(9);

    const deep = estimateRemainingField({
      entrants: 200,
      startingStack: 1500,
      tableStacks: [300000, 300000],
      startingStackConfirmed: true,
    });
    expect(deep!.remainingPlayers).toBe(2);
  });

  it('drops to low confidence when the starting stack was never confirmed', () => {
    const estimate = estimateRemainingField({
      entrants: 200,
      startingStack: 5000,
      tableStacks: [20000, 20000, 20000, 20000, 20000, 20000],
      startingStackConfirmed: false,
    });

    expect(estimate!.confidence).toBe('low');
    expect(estimate!.notes.join(' ')).toMatch(/level 1/);
  });

  it('warns that late registration may still be open on a near-full field', () => {
    const estimate = estimateRemainingField({
      entrants: 200,
      startingStack: 1500,
      tableStacks: [1500, 1500, 1500, 1500, 1500, 1500],
      startingStackConfirmed: true,
    });

    expect(estimate!.confidence).toBe('low');
    expect(estimate!.notes.join(' ')).toMatch(/late registration/i);
  });

  it('falls to low confidence when one table is a sliver of the field', () => {
    const estimate = estimateRemainingField({
      entrants: 1000,
      startingStack: 1500,
      tableStacks: [7500, 7500, 7500, 7500, 7500, 7500, 7500, 7500, 7500],
      startingStackConfirmed: true,
    });

    expect(estimate!.remainingPlayers).toBe(200);
    expect(estimate!.confidence).toBe('low');
  });

  it('refuses without a field size, a starting stack, or any stacks', () => {
    const base = { entrants: 9, startingStack: 1500, tableStacks: [4500] };
    expect(estimateRemainingField({ ...base, entrants: 0 })).toBeNull();
    expect(estimateRemainingField({ ...base, startingStack: 0 })).toBeNull();
    expect(estimateRemainingField({ ...base, tableStacks: [] })).toBeNull();
  });
});

describe('estimateMoneyProximity()', () => {
  it('counts places still to bust before the money', () => {
    expect(estimateMoneyProximity(6, 3)).toMatchObject({
      placesFromMoney: 3,
      inTheMoney: false,
      onBubble: false,
    });
  });

  it('calls the bubble one place out in a sit-and-go', () => {
    expect(estimateMoneyProximity(4, 3)!.onBubble).toBe(true);
  });

  it('widens the bubble with the field', () => {
    expect(estimateMoneyProximity(108, 100)!.onBubble).toBe(true);
    expect(estimateMoneyProximity(120, 100)!.onBubble).toBe(false);
  });

  it('reports in the money once the field is short enough', () => {
    expect(estimateMoneyProximity(3, 3)).toMatchObject({ inTheMoney: true, onBubble: false });
  });

  it('refuses without a field or a paid-place count', () => {
    expect(estimateMoneyProximity(0, 3)).toBeNull();
    expect(estimateMoneyProximity(9, 0)).toBeNull();
  });
});

describe('stageFromField()', () => {
  it('names the stage from counted players', () => {
    expect(stageFromField(estimateMoneyProximity(2, 3)!, 9)).toBe('final_table');
    expect(stageFromField(estimateMoneyProximity(15, 20)!, 9)).toBe('itm');
    expect(stageFromField(estimateMoneyProximity(21, 20)!, 9)).toBe('bubble');
    expect(stageFromField(estimateMoneyProximity(50, 20)!, 9)).toBe('mid');
    expect(stageFromField(estimateMoneyProximity(500, 20)!, 9)).toBe('early');
  });
});

describe('validated against real tournaments', () => {
  interface Row {
    entrants: number;
    finish: number;
    estimated: number;
    confidence: string;
  }

  const summaries = new Map<string, ReturnType<typeof parseTournamentSummary>>();
  for (const file of readdirSync(TS_DIR).filter((f) => f.endsWith('.txt'))) {
    const summary = parseTournamentSummary(readFileSync(join(TS_DIR, file), 'utf8'), 'scorza23');
    if (summary) summaries.set(summary.tournamentId, summary);
  }

  const rows: Row[] = [];
  for (const file of readdirSync(HH_DIR).filter((f) => f.endsWith('.txt'))) {
    const hands = parsePokerStarsFile(readFileSync(join(HH_DIR, file), 'utf8'), 'scorza23');
    if (hands.length === 0) continue;

    const tournamentId = hands[0]!.hand.tournamentId;
    const summary = tournamentId ? summaries.get(tournamentId) : undefined;
    if (!summary?.entrants || summary.finishPosition === null) continue;

    const startingStack = estimateStartingStack(hands);
    if (!startingStack) continue;

    // Hero's final hand: the field left at that moment is hero's finishing
    // place (or one more, on the hand hero wins the tournament).
    const last = hands.reduce((latest, h) => (h.hand.date > latest.hand.date ? h : latest));
    const estimate = estimateRemainingField({
      entrants: summary.entrants,
      startingStack: startingStack.stack,
      startingStackConfirmed: startingStack.fromLevelOne,
      tableStacks: last.players.map((p) => p.chipsBefore),
    });
    if (!estimate) continue;

    rows.push({
      entrants: summary.entrants,
      finish: summary.finishPosition,
      estimated: estimate.remainingPlayers,
      confidence: estimate.confidence,
    });
  }

  // Players left on hero's final hand. Busting in place P leaves P players; but
  // winning outright means hero's last hand was heads-up, so two were seated.
  const expectedRemaining = (row: Row) => (row.finish === 1 ? 2 : row.finish);
  const absoluteError = (row: Row) => Math.abs(row.estimated - expectedRemaining(row));
  const relativeError = (row: Row) => absoluteError(row) / expectedRemaining(row);

  it('covers the tournaments that have both hands and a summary', () => {
    expect(rows.length).toBeGreaterThanOrEqual(80);
  });

  it('counts the field exactly on single-table tournaments', () => {
    const singleTable = rows.filter((row) => row.entrants <= 9);
    const errors = singleTable.map(absoluteError).sort((a, b) => a - b);

    expect(singleTable.length).toBeGreaterThan(20);
    expect(errors[Math.floor(errors.length / 2)]).toBe(0);
    expect(Math.max(...errors)).toBeLessThanOrEqual(1);
  });

  it('keeps high-confidence estimates accurate', () => {
    const high = rows.filter((row) => row.confidence === 'high');
    const errors = high.map(relativeError).sort((a, b) => a - b);

    expect(high.length).toBeGreaterThan(10);
    expect(errors[Math.floor(errors.length / 2)]).toBeLessThanOrEqual(0.05);
  });

  it('never labels a badly wrong estimate as high confidence', () => {
    const confidentlyWrong = rows.filter(
      (row) => row.confidence === 'high' && relativeError(row) > 0.5,
    );

    expect(confidentlyWrong).toEqual([]);
  });
});
