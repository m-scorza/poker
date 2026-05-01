import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parsePokerStarsFile } from '../pokerstars';
import { parseTournamentSummary } from '../tournamentSummary';

const HH_DIR = join(__dirname, '..', '..', 'test', 'fixtures', 'pokerstars', 'hh');
const TS_DIR = join(__dirname, '..', '..', 'test', 'fixtures', 'pokerstars', 'ts');

const RE_FILENAME_TID = /\bT(\d{6,})\b/;
const RE_FILENAME_BUYIN = /US\$\s*(\d+(?:,\d+)?)\s*\+\s*US\$\s*(\d+(?:,\d+)?)/;

const NON_TOURNAMENT_HH = /Isonoe|Praxedis|Dinheiro Fictício|Play Money|Freeroll|Ticket|Step \d/i;

interface FilenameOracle {
  tournamentId: string | null;
  buyIn: number | null;
  fee: number | null;
  isTournament: boolean;
}

function parseFilenameOracle(filename: string): FilenameOracle {
  const isTournament = !NON_TOURNAMENT_HH.test(filename);
  const tidMatch = RE_FILENAME_TID.exec(filename);
  const buyMatch = RE_FILENAME_BUYIN.exec(filename);
  return {
    tournamentId: tidMatch ? tidMatch[1]! : null,
    buyIn: buyMatch ? parseFloat(buyMatch[1]!.replace(',', '.')) : null,
    fee: buyMatch ? parseFloat(buyMatch[2]!.replace(',', '.')) : null,
    isTournament,
  };
}

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('fixture sweep — pokerstars/hh', () => {
  const files = readdirSync(HH_DIR).filter((f) => f.endsWith('.txt'));

  it('directory has fixtures', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files)('%s parses without silent block drop', (filename) => {
    const raw = readUtf8(join(HH_DIR, filename));
    const parsed = parsePokerStarsFile(raw);

    const oracle = parseFilenameOracle(filename);

    // Block-count sanity: count `PokerStars Hand #` headers and compare to
    // parsed count. A drop of more than the dedup ratio means we silently
    // skipped real hands.
    // Match both "PokerStars Hand #" and "PokerStars Zoom Hand #" variants.
    const headerCount = (raw.match(/Hand #\d+/g) || []).length;
    expect(headerCount).toBeGreaterThan(0);

    // Parsed count must be ≥ 50% of headers (dedup tolerance) and > 0.
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed.length).toBeGreaterThanOrEqual(Math.floor(headerCount * 0.5));

    if (oracle.isTournament && oracle.tournamentId) {
      const first = parsed[0]!;
      expect(first.hand.tournamentId).toBe(oracle.tournamentId);
    }

    if (oracle.isTournament && oracle.buyIn !== null) {
      const first = parsed[0]!;
      const t = first.tournament;
      expect(t.buyIn).toBeCloseTo(oracle.buyIn, 2);
      expect(t.fee).toBeCloseTo(oracle.fee!, 2);
      expect(t.currency).toBe('USD');
    }
  });
});

describe('fixture sweep — pokerstars/ts', () => {
  const files = readdirSync(TS_DIR).filter((f) => f.endsWith('.txt'));

  it('directory has fixtures', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files)('%s parses to a summary with matching id+buy-in', (filename) => {
    const raw = readUtf8(join(TS_DIR, filename));
    const summary = parseTournamentSummary(raw);

    expect(summary).not.toBeNull();
    if (!summary) return;

    const oracle = parseFilenameOracle(filename);

    if (oracle.tournamentId) {
      expect(summary.tournamentId).toBe(oracle.tournamentId);
    }

    if (oracle.buyIn !== null) {
      expect(summary.buyIn).toBeCloseTo(oracle.buyIn, 2);
      expect(summary.fee).toBeCloseTo(oracle.fee!, 2);
      expect(summary.currency).toBe('USD');
    }
  });
});

describe.todo('fixture sweep — ggpoker (zip fixtures, deferred)');
