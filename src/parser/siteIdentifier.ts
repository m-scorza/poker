export type PokerSite = 'pokerstars' | 'ggpoker' | 'unknown';
export type FileType = 'hand_history' | 'tournament_summary' | 'unknown';

export interface FileIdentity {
  site: PokerSite;
  type: FileType;
}

/**
 * Identifies the poker site and file type based on content.
 */
export function identifyFile(content: string): FileIdentity {
  const normalized = content.trim().slice(0, 2000); // Check the header
  
  // PokerStars Hand History
  if (normalized.includes('PokerStars Hand #')) {
    return { site: 'pokerstars', type: 'hand_history' };
  }
  
  // PokerStars Tournament Summary
  if (normalized.includes('PokerStars Tournament #') && !normalized.includes('Hand #')) {
    return { site: 'pokerstars', type: 'tournament_summary' };
  }

  // GGPoker Tournament Summary
  if (normalized.includes('PokerCraft') && (normalized.includes('Summary') || normalized.includes('Result'))) {
    return { site: 'ggpoker', type: 'tournament_summary' };
  }
  if (normalized.includes('Tournament #') && normalized.includes('Buy-in:') && !normalized.includes('PokerStars') && !normalized.includes('Hand #') && !normalized.includes('Table \'')) {
    return { site: 'ggpoker', type: 'tournament_summary' };
  }

  // GGPoker Hand History. PokerStars already returned above, so any
  // remaining GGPoker/PokerCraft marker or bare "Poker Hand #" / "Hand #"
  // header is GGPoker.
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
