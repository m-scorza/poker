export interface ParsedTournamentSummary {
  tournamentId: string;
  name?: string;
  finishPosition: number | null;
  prize: number | null;
  bounty: number | null;
  buyIn?: number;
  fee?: number;
  currency?: 'USD' | 'T$' | 'PLAY' | 'TICKET';
  heroName: string;
}

const RE_TOURNAMENT_ID_SUMMARY = /Tournament #(\d+)/i;
// More flexible patterns for finish, prize, and bounties
const RE_FINISH_FLEX = /(\d+)(?:st|nd|rd|th)?:\s+([^,(\[\]]+)/i;
const RE_MONEY = /\$?([\d,]+\.?\d*)/;
const RE_BOUNTY_LINE = /(?:received|won|bounty).*?\$?([\d,]+\.?\d*).*?(?:bounties|eliminating)/i;


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
  let tournamentName = '';
  let finishPosition: number | null = null;
  let prize: number | null = null;
  let bounty: number | null = null;
  let buyIn: number | null = null;
  let fee: number | null = null;
  let currency: 'USD' | 'T$' | 'PLAY' | 'TICKET' = 'USD';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    
    if (!tournamentId) {
      const tMatch = RE_TOURNAMENT_ID_SUMMARY.exec(line);
      if (tMatch) {
        tournamentId = tMatch[1]!;
        // Extract name from this line
        const afterId = line.slice(line.indexOf(tournamentId) + tournamentId.length).trim();
        if (afterId.startsWith(',')) {
          tournamentName = afterId.slice(1).trim();
        }
      }
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

    // Try finding Buy-In explicitly (e.g. PokerStars: "Buy-In: $0.98/$0.12")
    if (line.toLowerCase().startsWith('buy-in:')) {
      if (line.toLowerCase().includes('freeroll')) {
        buyIn = 0; fee = 0; currency = 'PLAY';
      } else if (line.toLowerCase().includes('fpp') || line.toLowerCase().includes('starscoin')) {
        buyIn = 0; fee = 0; currency = 'PLAY';
      } else if (line.toLowerCase().includes('ticket')) {
        buyIn = 0; fee = 0; currency = 'TICKET';
      } else if (line.toLowerCase().includes('t$')) {
        currency = 'T$';
      } else if (line.toLowerCase().includes('play money')) {
        currency = 'PLAY';
      }
      const parts = line.split(':');
      if (parts[1]) {
        const numbers = parts[1].match(/\d+(?:\.\d+)?/g);
        if (numbers && numbers.length >= 1) {
          buyIn = parseFloat(numbers[0]!);
          if (numbers.length >= 2) fee = parseFloat(numbers[1]!);
        }
      }
    }
  }

  // Detect play money from tournament name
  if (tournamentName.toLowerCase().includes('play money') || tournamentName.toLowerCase().includes('freeroll')) {
    currency = 'PLAY';
  }

  if (!tournamentId) return null;

  return {
    tournamentId,
    name: tournamentName,
    finishPosition: finishPosition || null,
    prize: prize || 0,
    bounty: bounty || 0,
    buyIn: buyIn !== null ? buyIn : undefined,
    fee: fee !== null ? fee : undefined,
    currency,
    heroName,
  };
}
