export type PokerSite = 'pokerstars' | 'ggpoker' | 'open_hand_history' | 'known_unsupported' | 'unknown';
export type FileType = 'hand_history' | 'tournament_summary' | 'unknown';

export interface FileIdentity {
  site: PokerSite;
  type: FileType;
}

export function identifyFile(content: string): FileIdentity {
  const normalized = content.trim().slice(0, 65536); // Scan enough for email/export preambles before the first real hand.
  const lower = normalized.toLowerCase();

  if (looksLikeOpenHandHistoryJson(normalized)) {
    return { site: 'open_hand_history', type: 'hand_history' };
  }
  
  // PokerStars Hand History
  if (normalized.includes('PokerStars Hand #')) {
    return { site: 'pokerstars', type: 'hand_history' };
  }
  
  // PokerStars Tournament Summary
  if (normalized.includes('PokerStars Tournament #') && !normalized.includes('Hand #')) {
    return { site: 'pokerstars', type: 'tournament_summary' };
  }

  // Known networks that should not silently fall through to the GGPoker parser.
  // Native support needs real fixtures; standardized OHH exports are handled above.
  if (
    lower.includes('winning poker network') ||
    lower.includes('americas cardroom') ||
    lower.includes('america\'s cardroom') ||
    lower.includes('black chip poker') ||
    lower.includes('wpn') ||
    lower.includes('ipoker') ||
    lower.includes('888poker') ||
    lower.includes('888 poker') ||
    lower.includes('pacific poker') ||
    lower.includes('partypoker') ||
    lower.includes('party poker') ||
    lower.includes('chico network') ||
    lower.includes('betonline') ||
    lower.includes('sportsbetting.ag') ||
    lower.includes('tigergaming') ||
    lower.includes('winamax')
  ) {
    return { site: 'known_unsupported', type: 'hand_history' };
  }

  // GGPoker Tournament Summary
  if (normalized.includes('PokerCraft') && (normalized.includes('Summary') || normalized.includes('Result'))) {
    return { site: 'ggpoker', type: 'tournament_summary' };
  }
  if (normalized.includes('Tournament #') && normalized.includes('Buy-in:') && !normalized.includes('PokerStars') && !normalized.includes('Hand #') && !normalized.includes('Table \'')) {
    return { site: 'ggpoker', type: 'tournament_summary' };
  }

  // GGPoker Hand History. PokerStars and known unsupported networks already
  // returned above, so any remaining GGPoker/PokerCraft marker or bare
  // "Poker Hand #" / "Hand #" header is treated as GGPoker.
  if (
    normalized.includes('GGPoker') ||
    normalized.includes('PokerCraft') ||
    normalized.includes('Poker Hand #') ||
    normalized.includes('Hand #')
  ) {
    return { site: 'ggpoker', type: 'hand_history' };
  }

  return { site: 'unknown', type: 'unknown' };
}

function looksLikeOpenHandHistoryJson(content: string): boolean {
  const first = content.trim()[0];
  if (first !== '{' && first !== '[') return false;

  try {
    const parsed = JSON.parse(content);
    return containsOpenHandHistoryObject(parsed);
  } catch {
    return false;
  }
}

function containsOpenHandHistoryObject(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;

  if (Array.isArray(value)) {
    return value.some(containsOpenHandHistoryObject);
  }

  const obj = value as { spec_version?: unknown; ohh?: unknown; hands?: unknown };
  if (typeof obj.spec_version === 'string') return true;
  if (obj.ohh !== undefined && containsOpenHandHistoryObject(obj.ohh)) return true;
  if (obj.hands !== undefined && containsOpenHandHistoryObject(obj.hands)) return true;
  return false;
}
