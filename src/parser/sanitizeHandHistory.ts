export interface SanitizeHandHistoryOptions {
  heroName?: string;
}

export interface SanitizedHandHistoryReport {
  playerAliasCount: number;
  handIdCount: number;
  tournamentIdCount: number;
  tableNameCount: number;
  timestampCount: number;
  aliases: string[];
}

export interface SanitizedHandHistory {
  text: string;
  report: SanitizedHandHistoryReport;
}

const DEFAULT_HERO_NAME = 'Hero';
const SYNTHETIC_HAND_ID_BASE = 900_000_000_000;
const SYNTHETIC_TOURNAMENT_ID_BASE = 800_000_000_000;

function uniqueMatches(input: string, regex: RegExp): string[] {
  const values = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const value = match[1];
    if (value) values.add(value);
  }
  return Array.from(values);
}

function replaceAllLiteral(input: string, needle: string, replacement: string): string {
  if (needle.length === 0) return input;
  return input.split(needle).join(replacement);
}

function buildPlayerAliasMap(input: string, heroName: string): Map<string, string> {
  const seatNames = uniqueMatches(input, /^Seat \d+: (.+?) \(/gm);
  const aliases = new Map<string, string>();
  let villainIndex = 1;

  for (const name of seatNames) {
    if (name === heroName || name === 'Hero') {
      aliases.set(name, 'Hero');
    } else if (!aliases.has(name)) {
      aliases.set(name, `Villain_${villainIndex}`);
      villainIndex += 1;
    }
  }

  if (!aliases.has(heroName)) aliases.set(heroName, 'Hero');
  aliases.set('Hero', 'Hero');
  return aliases;
}

function replaceMappedIds(input: string, regex: RegExp, base: number): { text: string; count: number } {
  const ids = uniqueMatches(input, regex);
  const idMap = new Map(ids.map((id, index) => [id, String(base + index + 1)]));
  let text = input;
  for (const [original, synthetic] of Array.from(idMap.entries())) {
    text = replaceAllLiteral(text, original, synthetic);
  }
  return { text, count: ids.length };
}

function replacePokerStarsTimestamps(input: string): { text: string; count: number } {
  let count = 0;
  const text = input.replace(
    /(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\s+UTC\s+\[[^\]]+\]/g,
    () => {
      count += 1;
      const seconds = String(count - 1).padStart(2, '0');
      return `2020/01/01 00:00:${seconds} UTC [2020/01/01 00:00:${seconds} ET]`;
    },
  );
  return { text, count };
}

function replaceTableNames(input: string): { text: string; count: number } {
  let count = 0;
  const text = input.replace(/Table '[^']+'/g, () => {
    count += 1;
    return `Table 'Sanitized Table ${count}'`;
  });
  return { text, count };
}

export function sanitizeHandHistory(
  rawText: string,
  options: SanitizeHandHistoryOptions = {},
): SanitizedHandHistory {
  const heroName = options.heroName ?? DEFAULT_HERO_NAME;
  let text = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const handIds = replaceMappedIds(text, /Hand #(\d+)/g, SYNTHETIC_HAND_ID_BASE);
  text = handIds.text;

  const tournamentIds = replaceMappedIds(text, /Tournament #(\d+)/g, SYNTHETIC_TOURNAMENT_ID_BASE);
  text = tournamentIds.text;

  const tables = replaceTableNames(text);
  text = tables.text;

  const timestamps = replacePokerStarsTimestamps(text);
  text = timestamps.text;

  const playerAliases = buildPlayerAliasMap(text, heroName);
  const sortedAliases = Array.from(playerAliases.entries()).sort((a, b) => b[0].length - a[0].length);
  for (const [original, alias] of sortedAliases) {
    text = replaceAllLiteral(text, original, alias);
  }

  const aliases = Array.from(new Set(playerAliases.values())).sort((a, b) => {
    if (a === 'Hero') return -1;
    if (b === 'Hero') return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  return {
    text,
    report: {
      playerAliasCount: aliases.length,
      handIdCount: handIds.count,
      tournamentIdCount: tournamentIds.count,
      tableNameCount: tables.count,
      timestampCount: timestamps.count,
      aliases,
    },
  };
}
