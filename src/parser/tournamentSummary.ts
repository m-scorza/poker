
export interface ParsedTournamentSummary {
  tournamentId: string;
  finishPosition: number | null;
  prize: number | null;
  bounty: number | null;
  heroName: string;
}

const RE_TOURNAMENT_ID_SUMMARY = /Tournament #(\d+)/i;
// More flexible patterns for finish, prize, and bounties
const RE_FINISH_FLEX = /(\d+)(?:st|nd|rd|th)?:\s+([^,(\[\]]+)/i;
const RE_MONEY = /\$?([\d,]+\.?\d*)/;
const RE_BOUNTY_LINE = /(?:received|won|bounty).*?\$?([\d,]+\.?\d*).*?(?:bounties|eliminating)/i;
const RE_PRIZE_LINE = /(?:received|won).*?\$?([\d,]+\.?\d*)/i;

/**
 * Parse a PokerStars Tournament Summary file.
 * Enhanced for fuzzy matching and bounty support.
 */
export function parseTournamentSummary(
  fileContent: string,
  heroName: string = 'scorza23'
): ParsedTournamentSummary | null {
  const content = fileContent
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = content.split('\n').map((l) => l.trim());
  const heroLower = heroName.toLowerCase();

  let tournamentId = '';
  let finishPosition: number | null = null;
  let prize: number | null = null;
  let bounty: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    
    if (!tournamentId) {
      const tMatch = RE_TOURNAMENT_ID_SUMMARY.exec(line);
      if (tMatch) tournamentId = tMatch[1]!;
    }

    // Capture Bounty (often on separate lines near the end)
    if (line.toLowerCase().includes('received') || line.toLowerCase().includes('bounty')) {
      const bMatch = RE_BOUNTY_LINE.exec(line);
      if (bMatch && line.toLowerCase().includes(heroLower)) {
         bounty = (bounty || 0) + parseFloat(bMatch[1]!.replace(/,/g, ''));
      } else if (bMatch && (lines[i-1]?.toLowerCase().includes(heroLower) || lines[i+1]?.toLowerCase().includes(heroLower))) {
         // Check context lines for hero name
         bounty = (bounty || 0) + parseFloat(bMatch[1]!.replace(/,/g, ''));
      }
    }

    // Try finding hero's finish position
    const finishMatch = RE_FINISH_FLEX.exec(line);
    if (finishMatch) {
      const pos = parseInt(finishMatch[1]!, 10);
      const name = finishMatch[2]!.trim().toLowerCase();
      
      if (name.includes(heroLower) || heroLower.includes(name)) {
        finishPosition = pos;
        
        // Check same line for prize
        const moneyMatch = RE_MONEY.exec(line.slice(finishMatch[0].length));
        if (moneyMatch) {
          prize = parseFloat(moneyMatch[1]!.replace(/,/g, ''));
        }
      }
    }
    
    // Fallback: search for "You finished", "You received" type lines (common in summary headers)
    if (line.toLowerCase().startsWith('you finished')) {
      const posMatch = /(\d+)/.exec(line);
      if (posMatch) finishPosition = parseInt(posMatch[1]!, 10);
    }
    if (line.toLowerCase().startsWith('you received')) {
      const pMatch = RE_MONEY.exec(line);
      if (pMatch) prize = parseFloat(pMatch[1]!.replace(/,/g, ''));
    }
  }

  if (!tournamentId) return null;

  return {
    tournamentId,
    finishPosition: finishPosition || null,
    prize: prize || 0,
    bounty: bounty || 0,
    heroName,
  };
}
