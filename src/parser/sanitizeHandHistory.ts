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

function syntheticHandId(original: string, index: number): string {
  const prefix = original.match(/^[A-Za-z]+/)?.[0] ?? '';
  return `${prefix}${SYNTHETIC_HAND_ID_BASE + index + 1}`;
}

function replaceMappedHandIds(input: string): { text: string; count: number } {
  const ids = uniqueMatches(input, /(?:PokerStars Hand|Poker Hand|GGPoker Hand|Hand) #([A-Za-z0-9]+)/g);
  const idMap = new Map(ids.map((id, index) => [id, syntheticHandId(id, index)]));
  let text = input;
  for (const [original, synthetic] of Array.from(idMap.entries())) {
    text = replaceAllLiteral(text, original, synthetic);
  }
  return { text, count: ids.length };
}

function replacePokerTimestamps(input: string): { text: string; count: number } {
  let count = 0;
  let text = input.replace(
    /(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\s+UTC\s+\[[^\]]+\]/g,
    () => {
      count += 1;
      const seconds = String(count - 1).padStart(2, '0');
      return `2020/01/01 00:00:${seconds} UTC [2020/01/01 00:00:${seconds} ET]`;
    },
  );
  text = text.replace(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/g, () => {
    count += 1;
    const seconds = String(count - 1).padStart(2, '0');
    return `2020/01/01 00:00:${seconds}`;
  });
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

function sanitizeOpenHandHistoryJson(input: string, heroName: string): SanitizedHandHistory | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }

  const hands = collectOpenHandHistoryObjects(parsed);
  if (hands.length === 0) return null;

  const playerIdMap = new Map<string, string>();
  const aliases = new Set<string>();
  let playerIndex = 1;
  let handIdCount = 0;
  let tournamentIdCount = 0;
  let tableNameCount = 0;
  let timestampCount = 0;

  for (const hand of hands) {
    const obj = hand as Record<string, unknown>;
    const heroPlayerId = obj.hero_player_id !== undefined ? String(obj.hero_player_id) : '';
    const players = Array.isArray(obj.players) ? obj.players as Array<Record<string, unknown>> : [];

    for (const player of players) {
      const id = player.id ?? player.player_id;
      if (id === undefined) continue;
      const idText = String(id);
      if (!playerIdMap.has(idText)) playerIdMap.set(idText, `player-${playerIdMap.size + 1}`);
    }

    for (const player of players) {
      const id = player.id ?? player.player_id;
      const idText = id !== undefined ? String(id) : '';
      const rawName = String(player.name ?? player.player_name ?? '').trim();
      const isHero = idText === heroPlayerId || rawName === 'Hero' || rawName.toLowerCase() === heroName.toLowerCase();
      const alias = isHero ? 'Hero' : `Villain_${playerIndex++}`;
      aliases.add(alias);
      if (player.id !== undefined) player.id = playerIdMap.get(String(player.id));
      if (player.player_id !== undefined) player.player_id = playerIdMap.get(String(player.player_id));
      if (player.name !== undefined) player.name = alias;
      if (player.player_name !== undefined) player.player_name = alias;
    }

    if (obj.hero_player_id !== undefined) obj.hero_player_id = playerIdMap.get(String(obj.hero_player_id));
    if (obj.game_number !== undefined) {
      obj.game_number = String(SYNTHETIC_HAND_ID_BASE + handIdCount + 1);
      handIdCount += 1;
    }
    if (typeof obj.table_name === 'string') {
      tableNameCount += 1;
      obj.table_name = `Sanitized Table ${tableNameCount}`;
    }
    if (typeof obj.start_date_utc === 'string') {
      const seconds = String(timestampCount).padStart(2, '0');
      obj.start_date_utc = `2020-01-01T00:00:${seconds}`;
      timestampCount += 1;
    }

    const tournamentInfo = obj.tournament_info as Record<string, unknown> | undefined;
    if (tournamentInfo) {
      if (tournamentInfo.tournament_number !== undefined) {
        tournamentInfo.tournament_number = String(SYNTHETIC_TOURNAMENT_ID_BASE + tournamentIdCount + 1);
        tournamentIdCount += 1;
      }
      if (typeof tournamentInfo.name === 'string') tournamentInfo.name = 'Sanitized Tournament';
      if (typeof tournamentInfo.start_date_utc === 'string') {
        const seconds = String(timestampCount).padStart(2, '0');
        tournamentInfo.start_date_utc = `2020-01-01T00:00:${seconds}`;
        timestampCount += 1;
      }
    }

    remapOpenHandHistoryActionPlayerIds(obj.rounds, playerIdMap);
    remapOpenHandHistoryPotPlayerIds(obj.pots, playerIdMap);
  }

  aliases.add('Hero');
  const aliasList = Array.from(aliases).sort((a, b) => {
    if (a === 'Hero') return -1;
    if (b === 'Hero') return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  return {
    text: JSON.stringify(parsed, null, 2),
    report: {
      playerAliasCount: aliasList.length,
      handIdCount,
      tournamentIdCount,
      tableNameCount,
      timestampCount,
      aliases: aliasList,
    },
  };
}

function collectOpenHandHistoryObjects(value: unknown): Array<Record<string, unknown>> {
  const hands: Array<Record<string, unknown>> = [];
  const visit = (candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') return;
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    const obj = candidate as Record<string, unknown>;
    if (typeof obj.spec_version === 'string') hands.push(obj);
    visit(obj.ohh);
    visit(obj.hands);
  };
  visit(value);
  return hands;
}

function remapOpenHandHistoryActionPlayerIds(rounds: unknown, idMap: Map<string, string>): void {
  if (!Array.isArray(rounds)) return;
  for (const round of rounds as Array<Record<string, unknown>>) {
    if (!Array.isArray(round.actions)) continue;
    for (const action of round.actions as Array<Record<string, unknown>>) {
      if (action.player_id !== undefined) action.player_id = idMap.get(String(action.player_id));
    }
  }
}

function remapOpenHandHistoryPotPlayerIds(pots: unknown, idMap: Map<string, string>): void {
  if (!Array.isArray(pots)) return;
  for (const pot of pots as Array<Record<string, unknown>>) {
    if (!Array.isArray(pot.player_wins)) continue;
    for (const win of pot.player_wins as Array<Record<string, unknown>>) {
      if (win.player_id !== undefined) win.player_id = idMap.get(String(win.player_id));
    }
  }
}

export function sanitizeHandHistory(
  rawText: string,
  options: SanitizeHandHistoryOptions = {},
): SanitizedHandHistory {
  const heroName = options.heroName ?? DEFAULT_HERO_NAME;
  const normalizedText = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const ohhSanitized = sanitizeOpenHandHistoryJson(normalizedText, heroName);
  if (ohhSanitized) return ohhSanitized;

  let text = normalizedText;

  const handIds = replaceMappedHandIds(text);
  text = handIds.text;

  const tournamentIds = replaceMappedIds(text, /Tournament #(\d+)/g, SYNTHETIC_TOURNAMENT_ID_BASE);
  text = tournamentIds.text;

  const tables = replaceTableNames(text);
  text = tables.text;

  const timestamps = replacePokerTimestamps(text);
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
