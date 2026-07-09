import type { HeroDecision } from '../types/analysis';
import { RANK_ORDER } from '../utils/cards';

export type HeadsUpReferenceKind = 'push' | 'call';

interface HeadsUpFrequencyRow {
  stackBb: number;
  frequencies: Record<string, number>;
}

export interface HeadsUpFrequencyTable {
  kind: HeadsUpReferenceKind;
  handKeys: string[];
  minStackBb: number;
  maxStackBb: number;
  rows: HeadsUpFrequencyRow[];
}

export interface HeadsUpFrequencyLookup {
  frequency: number;
  matchedStackBb: number;
  handKey: string;
}

type HeadsUpReferenceSpot = 'hu_button_push_fold' | 'hu_big_blind_call_all_in';
type HeadsUpReferenceResult =
  | 'correct_aggression'
  | 'missed_aggression'
  | 'correct_call'
  | 'missed_call'
  | 'correct_fold'
  | 'over_aggression'
  | 'loose_call';

export interface HeadsUpReferenceAnalysis {
  result: HeadsUpReferenceResult;
  spot: HeadsUpReferenceSpot;
  handKey: string;
  stackBb: number;
  matchedStackBb: number;
  frequency: number;
  actualAction: HeroDecision['action'];
  recommendedAction: 'raise' | 'call' | 'fold';
  evidenceKind: 'rule_based';
  evLossBb: null;
  note: string;
}

export interface HeadsUpReferenceSet {
  push?: HeadsUpFrequencyTable;
  call?: HeadsUpFrequencyTable;
}

interface LookupInput {
  stackBb: number;
  handKey: string;
}

const STRONG_FREQUENCY_THRESHOLD = 0.6;
const LOW_FREQUENCY_THRESHOLD = 0.4;

export function parseHeadsUpFrequencyCsv(csv: string, kind: HeadsUpReferenceKind): HeadsUpFrequencyTable {
  const lines = csv
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('Heads-up frequency CSV needs a header and at least one data row.');
  }

  const header = splitCsvLine(lines[0]!);
  if (header.length < 2 || !isStackHeader(header[0]!)) {
    throw new Error('Heads-up frequency CSV first column must be stack.');
  }

  const handKeys = header.slice(1).map(canonicalizeHandKey);
  const rows = lines.slice(1).map((line, rowIndex) => parseFrequencyRow(line, rowIndex + 2, handKeys));
  rows.sort((a, b) => a.stackBb - b.stackBb);

  return {
    kind,
    handKeys,
    minStackBb: rows[0]!.stackBb,
    maxStackBb: rows[rows.length - 1]!.stackBb,
    rows,
  };
}

export function lookupHeadsUpFrequency(
  table: HeadsUpFrequencyTable,
  input: LookupInput,
): HeadsUpFrequencyLookup | null {
  const handKey = canonicalizeHandKey(input.handKey);
  if (!table.handKeys.includes(handKey)) return null;
  if (input.stackBb < table.minStackBb || input.stackBb > table.maxStackBb) return null;

  const row = findNearestStackRow(table.rows, input.stackBb);
  const frequency = row.frequencies[handKey];
  if (frequency === undefined) return null;

  return {
    frequency,
    matchedStackBb: row.stackBb,
    handKey,
  };
}

export function analyzeHeadsUpPushFoldReference(
  decision: HeroDecision,
  references: HeadsUpReferenceSet,
): HeadsUpReferenceAnalysis | null {
  const pushSpot = decision.scenario === 'HU_BTN' &&
    (decision.position === 'BTN/SB' || decision.position === 'SB' || decision.position === 'BTN');

  if (pushSpot && references.push) {
    const lookup = lookupHeadsUpFrequency(references.push, decision);
    if (!lookup || isMixedFrequency(lookup.frequency)) return null;
    return buildPushAnalysis(decision, lookup);
  }

  const callSpot = decision.scenario === 'FACING_ALL_IN' && decision.position === 'BB';
  if (callSpot && references.call) {
    const lookup = lookupHeadsUpFrequency(references.call, decision);
    if (!lookup || isMixedFrequency(lookup.frequency)) return null;
    return buildCallAnalysis(decision, lookup);
  }

  return null;
}

function buildPushAnalysis(decision: HeroDecision, lookup: HeadsUpFrequencyLookup): HeadsUpReferenceAnalysis {
  const shouldRaise = lookup.frequency >= STRONG_FREQUENCY_THRESHOLD;
  const recommendedAction = shouldRaise ? 'raise' : 'fold';
  const result: HeadsUpReferenceResult = shouldRaise
    ? decision.action === 'raise' ? 'correct_aggression' : 'missed_aggression'
    : decision.action === 'fold' ? 'correct_fold' : 'over_aggression';

  return {
    result,
    spot: 'hu_button_push_fold',
    handKey: lookup.handKey,
    stackBb: decision.stackBb,
    matchedStackBb: lookup.matchedStackBb,
    frequency: lookup.frequency,
    actualAction: decision.action,
    recommendedAction,
    evidenceKind: 'rule_based',
    evLossBb: null,
    note: `local heads-up push/fold reference ${formatFrequency(lookup.frequency)} ${recommendedAction === 'raise' ? 'pushes' : 'folds'} ${lookup.handKey} near ${formatStack(lookup.matchedStackBb)}bb.`,
  };
}

function buildCallAnalysis(decision: HeroDecision, lookup: HeadsUpFrequencyLookup): HeadsUpReferenceAnalysis {
  const shouldCall = lookup.frequency >= STRONG_FREQUENCY_THRESHOLD;
  const recommendedAction = shouldCall ? 'call' : 'fold';
  const result: HeadsUpReferenceResult = shouldCall
    ? decision.action === 'call' ? 'correct_call' : 'missed_call'
    : decision.action === 'fold' ? 'correct_fold' : 'loose_call';

  return {
    result,
    spot: 'hu_big_blind_call_all_in',
    handKey: lookup.handKey,
    stackBb: decision.stackBb,
    matchedStackBb: lookup.matchedStackBb,
    frequency: lookup.frequency,
    actualAction: decision.action,
    recommendedAction,
    evidenceKind: 'rule_based',
    evLossBb: null,
    note: `local heads-up push/fold reference ${formatFrequency(lookup.frequency)} ${recommendedAction === 'call' ? 'calls' : 'folds'} ${lookup.handKey} near ${formatStack(lookup.matchedStackBb)}bb.`,
  };
}

function parseFrequencyRow(line: string, lineNumber: number, handKeys: string[]): HeadsUpFrequencyRow {
  const cells = splitCsvLine(line);
  if (cells.length !== handKeys.length + 1) {
    throw new Error(`Line ${lineNumber} has ${cells.length} columns; expected ${handKeys.length + 1}.`);
  }

  const stackBb = Number(cells[0]);
  if (!Number.isFinite(stackBb) || stackBb <= 0) {
    throw new Error(`Line ${lineNumber} has invalid stack value.`);
  }

  const frequencies: Record<string, number> = {};
  handKeys.forEach((handKey, index) => {
    const frequency = Number(cells[index + 1]);
    if (!Number.isFinite(frequency) || frequency < 0 || frequency > 1) {
      throw new Error(`Line ${lineNumber} has invalid frequency for ${handKey}.`);
    }
    frequencies[handKey] = frequency;
  });

  return { stackBb, frequencies };
}

function splitCsvLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim());
}

function isStackHeader(value: string): boolean {
  return value.trim().toLowerCase() === 'stack';
}

function findNearestStackRow(rows: HeadsUpFrequencyRow[], stackBb: number): HeadsUpFrequencyRow {
  return rows.reduce((nearest, row) => {
    const currentDistance = Math.abs(row.stackBb - stackBb);
    const nearestDistance = Math.abs(nearest.stackBb - stackBb);
    return currentDistance < nearestDistance ? row : nearest;
  });
}

function canonicalizeHandKey(handKey: string): string {
  const trimmed = handKey.trim();
  if (/^[2-9TJQKA]{2}$/.test(trimmed) && trimmed[0] === trimmed[1]) return trimmed;

  const match = /^([2-9TJQKA])([2-9TJQKA])([so])$/i.exec(trimmed);
  if (!match) return trimmed;

  const [, firstRaw, secondRaw, suitednessRaw] = match;
  const first = firstRaw!.toUpperCase();
  const second = secondRaw!.toUpperCase();
  const suitedness = suitednessRaw!.toLowerCase();
  const firstRank = RANK_ORDER.indexOf(first);
  const secondRank = RANK_ORDER.indexOf(second);

  if (firstRank < 0 || secondRank < 0 || firstRank === secondRank) return trimmed;
  return firstRank > secondRank
    ? `${first}${second}${suitedness}`
    : `${second}${first}${suitedness}`;
}

function isMixedFrequency(frequency: number): boolean {
  return frequency > LOW_FREQUENCY_THRESHOLD && frequency < STRONG_FREQUENCY_THRESHOLD;
}

function formatFrequency(frequency: number): string {
  return `${Math.round(frequency * 100)}%`;
}

function formatStack(stackBb: number): string {
  return Number.isInteger(stackBb) ? stackBb.toFixed(0) : stackBb.toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
}
