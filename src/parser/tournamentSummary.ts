export interface ParsedTournamentSummary {
  tournamentId: string;
  finishPosition: number | null;
  prize: number | null;
  heroName: string;
}

const RE_TOURNAMENT_ID_SUMMARY = /Tournament #(\d+)/;
// Matches lines like: "1: scorza23 (Brazil), $1,500.00 (15%)" or "10: scorza23, $50.00"
const RE_FINISH_AND_PRIZE = /^(\d+):\s+(.+?)(?:\s+\([^)]+\))?\s*,\s*\$?([\d,.]+)/;
// Matches lines without prize: "15: scorza23 (Brazil)"
const RE_FINISH_ONLY = /^(\d+):\s+(.+?)(?:\s+\([^)]+\))?$/;

/**
 * Parse a PokerStars Tournament Summary file.
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

  let tournamentId = '';
  let finishPosition: number | null = null;
  let prize: number | null = null;

  for (const line of lines) {
    if (!tournamentId) {
      const tMatch = RE_TOURNAMENT_ID_SUMMARY.exec(line);
      if (tMatch) {
        tournamentId = tMatch[1]!;
      }
    }

    // Try finding hero's finish position & prize
    const finishPrizeMatch = RE_FINISH_AND_PRIZE.exec(line);
    if (finishPrizeMatch) {
      const pos = parseInt(finishPrizeMatch[1]!, 10);
      const name = finishPrizeMatch[2]!.trim();
      const amount = parseFloat(finishPrizeMatch[3]!.replace(/,/g, ''));
      if (name === heroName) {
        finishPosition = pos;
        prize = amount;
        break; // Found hero, stop searching
      }
      continue;
    }

    const finishMatch = RE_FINISH_ONLY.exec(line);
    if (finishMatch) {
      const pos = parseInt(finishMatch[1]!, 10);
      const name = finishMatch[2]!.trim();
      if (name === heroName) {
        finishPosition = pos;
        prize = 0; // Finished but didn't cash
        break; // Found hero
      }
    }
  }

  if (!tournamentId) return null;

  return {
    tournamentId,
    finishPosition,
    prize,
    heroName,
  };
}
