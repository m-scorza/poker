import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parsePokerStarsFile } from '../pokerstars';
import { parseTournamentSummary } from '../tournamentSummary';
import { parseOpenHandHistoryFile } from '../openHandHistory';

const HH_DIR = join(__dirname, '..', '..', 'test', 'fixtures', 'pokerstars', 'hh');
const TS_DIR = join(__dirname, '..', '..', 'test', 'fixtures', 'pokerstars', 'ts');
const OHH_DIR = join(__dirname, '..', '..', 'test', 'fixtures', 'ohh');

const RE_FILENAME_TID = /\bT(\d{6,})\b/;
const RE_FILENAME_BUYIN = /US\$\s*(\d+(?:,\d+)?)\s*\+\s*US\$\s*(\d+(?:,\d+)?)/;

const NON_TOURNAMENT_HH = /Isonoe|Praxedis|Dinheiro Fictício|Play Money|Freeroll|Ticket|Step \d/i;

interface FilenameOracle {
  tournamentId: string | null;
  buyIn: number | null;
  fee: number | null;
  isTournament: boolean;
}

interface OhhFixtureOracle {
  handId: string;
  tournamentId: string;
  buyIn: number;
  fee: number;
  bigBlind: number;
  boardFlop: string[];
  boardTurn: string;
  heroCards: string[];
}

const OHH_ORACLES: Record<string, OhhFixtureOracle> = {
  '888-pacific-tournament-array.json': {
    handId: '591212284',
    tournamentId: '53999979',
    buyIn: 0.1,
    fee: 0.01,
    bigBlind: 60,
    boardFlop: ['7s', '6d', '5d'],
    boardTurn: '4c',
    heroCards: ['9d', '7c'],
  },
  'ipoker-tournament.json': {
    handId: '7948166852',
    tournamentId: '925681798',
    buyIn: 0.45,
    fee: 0.05,
    bigBlind: 160,
    boardFlop: ['4s', 'Jc', '7d'],
    boardTurn: '7s',
    heroCards: ['Qh', 'Qc'],
  },
};

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

  it('parses all fixtures without silent block drops', () => {
    for (const filename of files) {
      const raw = readUtf8(join(HH_DIR, filename));
      const parsed = parsePokerStarsFile(raw);

      const oracle = parseFilenameOracle(filename);

      // Block-count sanity: count `PokerStars Hand #` headers and compare to
      // parsed count. A drop of more than the dedup ratio means we silently
      // skipped real hands.
      // Match both "PokerStars Hand #" and "PokerStars Zoom Hand #" variants.
      const headerCount = (raw.match(/Hand #\d+/g) || []).length;
      expect(headerCount, filename).toBeGreaterThan(0);

      // Parsed count must be ≥ 50% of headers (dedup tolerance) and > 0.
      expect(parsed.length, filename).toBeGreaterThan(0);
      expect(parsed.length, filename).toBeGreaterThanOrEqual(Math.floor(headerCount * 0.5));

      if (oracle.isTournament && oracle.tournamentId) {
        const first = parsed[0]!;
        expect(first.hand.tournamentId, filename).toBe(oracle.tournamentId);
      }

      if (oracle.isTournament && oracle.buyIn !== null) {
        const first = parsed[0]!;
        const t = first.tournament;
        expect(t.buyIn, filename).toBeCloseTo(oracle.buyIn, 2);
        expect(t.fee, filename).toBeCloseTo(oracle.fee!, 2);
        expect(t.currency, filename).toBe('USD');
      }
    }
  }, 300_000);

  // Chip conservation (EPIC A2): in every hand, chips in === chips out, so the
  // sum of every player's net (hero + all villains, including sat-out players
  // who posted antes) must equal −rake. This is the corpus-wide guard against
  // any regression of the A1 raise / uncalled-bet accounting.
  it('conserves chips in every parsed hand (Σ nets === −rake)', () => {
    let checked = 0;
    let skippedSitOutHero = 0;
    for (const filename of files) {
      const raw = readUtf8(join(HH_DIR, filename));
      for (const { hand } of parsePokerStarsFile(raw)) {
        // Documented carve-out: when the hero is sitting out it has no seat, so
        // the parser reports heroChipsBefore/After = 0 (a dead-ante non-event,
        // not a hand the hero played) and its posted ante is unattributable.
        // Fixing it would mint an involuntary auto-fold hero decision and skew
        // fold stats. Villain-only sit-outs still conserve via the villainDeltas
        // union, so they remain checked.
        if (hand.heroChipsBefore === 0) { skippedSitOutHero++; continue; }
        const heroNet = hand.heroChipsAfter - hand.heroChipsBefore;
        const villainNet = hand.villainDeltas.reduce((sum, v) => sum + v.net, 0);
        expect(
          Math.abs(heroNet + villainNet + hand.rake),
          `${filename} #${hand.id}`,
        ).toBeLessThan(0.005);
        checked++;
      }
    }
    // The corpus is ~3285 hands; the sit-out-hero carve-out is a small minority.
    expect(checked).toBeGreaterThan(3000);
    expect(skippedSitOutHero).toBeLessThan(checked);
  }, 300_000);
});

describe('fixture sweep — pokerstars/ts', () => {
  const files = readdirSync(TS_DIR).filter((f) => f.endsWith('.txt'));

  it('directory has fixtures', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('parses all summaries with matching id+buy-in', () => {
    for (const filename of files) {
      const raw = readUtf8(join(TS_DIR, filename));
      const summary = parseTournamentSummary(raw);

      expect(summary, filename).not.toBeNull();
      if (!summary) continue;

      const oracle = parseFilenameOracle(filename);

      if (oracle.tournamentId) {
        expect(summary.tournamentId, filename).toBe(oracle.tournamentId);
      }

      if (oracle.buyIn !== null) {
        expect(summary.buyIn, filename).toBeCloseTo(oracle.buyIn, 2);
        expect(summary.fee, filename).toBeCloseTo(oracle.fee!, 2);
        expect(summary.currency, filename).toBe('USD');
      }
    }
  }, 300_000);
});

describe.todo('fixture sweep — ggpoker (zip fixtures, deferred)');

describe('fixture sweep - open-hand-history/json', () => {
  const files = readdirSync(OHH_DIR).filter((f) => f.endsWith('.json'));

  it('directory has fixtures', () => {
    expect(files.length).toBeGreaterThanOrEqual(Object.keys(OHH_ORACLES).length);
  });

  it('parses all standardized OHH fixtures with matching hand metadata', () => {
    for (const filename of files) {
      const oracle = OHH_ORACLES[filename];
      expect(oracle, filename).toBeDefined();
      if (!oracle) continue;

      const raw = readUtf8(join(OHH_DIR, filename));
      const parsed = parseOpenHandHistoryFile(raw, 'scorza23');

      expect(parsed.length, filename).toBe(1);
      const first = parsed[0]!;
      expect(first.hand.id, filename).toBe(oracle.handId);
      expect(first.hand.tournamentId, filename).toBe(oracle.tournamentId);
      expect(first.hand.bigBlind, filename).toBe(oracle.bigBlind);
      expect(first.hand.boardFlop, filename).toEqual(oracle.boardFlop);
      expect(first.hand.boardTurn, filename).toBe(oracle.boardTurn);
      expect(first.tournament.buyIn, filename).toBeCloseTo(oracle.buyIn, 2);
      expect(first.tournament.fee, filename).toBeCloseTo(oracle.fee, 2);
      expect(first.players.find((p) => p.isHero)?.holeCards, filename).toEqual(oracle.heroCards);
    }
  });
});

describe('specialized variant fixture checks', () => {
  it('parses Zoom tournament fixture successfully', () => {
    const raw = readUtf8(join(HH_DIR, 'HH20260216 T3974766292 No Limit Hold\'em US$ 4,90 + US$ 0,60 Zoom.txt'));
    const parsed = parsePokerStarsFile(raw);
    expect(parsed.length).toBeGreaterThan(0);
    const first = parsed[0]!;
    expect(first.hand.tournamentId).toBe('3974766292');
    expect(first.tournament.buyIn).toBe(4.90);
    expect(first.tournament.fee).toBe(0.60);
  });

  it('parses Cap cash game fixture successfully', () => {
    const raw = readUtf8(join(HH_DIR, 'HH20260216 Isonoe III Cap - US$ 0,05-US$ 0,10 - USD No Limit All-in Poker.txt'));
    const parsed = parsePokerStarsFile(raw);
    expect(parsed.length).toBeGreaterThan(0);
    const first = parsed[0]!;
    expect(first.hand.bigBlind).toBe(0.10);
    expect(first.hand.smallBlind).toBe(0.05);
    // Since cash game, tournamentId is empty
    expect(first.hand.tournamentId).toBe('');
  });

  it('parses 6+ Hold\'em tournament fixture successfully', () => {
    const raw = readUtf8(join(HH_DIR, 'HH20260217 T3974762738 No Limit 6+ Hold\'em 220K + 30K.txt'));
    const parsed = parsePokerStarsFile(raw);
    expect(parsed.length).toBeGreaterThan(0);
    const first = parsed[0]!;
    expect(first.hand.tournamentId).toBe('3974762738');
    expect(first.hand.bigBlind).toBe(15);
    expect(first.hand.smallBlind).toBe(0);
    
    // Check that ante action exists
    const anteAction = first.actions.find(a => a.actionType === 'post_ante');
    expect(anteAction).toBeDefined();
    expect(anteAction!.amount).toBe(15);

    // Check that button blind BB posting exists
    const bbAction = first.actions.find(a => a.actionType === 'post_bb');
    expect(bbAction).toBeDefined();
    expect(bbAction!.amount).toBe(15);
  });

  it('parses play money cash game fixture successfully', () => {
    const raw = readUtf8(join(HH_DIR, 'HH20260217 NLHE 100-200 6 Max - 100-200 - Dinheiro Fictício No Limit Hold\'em.txt'));
    const parsed = parsePokerStarsFile(raw);
    expect(parsed.length).toBeGreaterThan(0);
    const first = parsed[0]!;
    expect(first.hand.bigBlind).toBe(200);
    expect(first.hand.smallBlind).toBe(100);
    expect(first.tournament.currency).toBe('PLAY');
  });
});
