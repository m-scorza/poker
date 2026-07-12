import { extractBuyIn, MAX_PLAUSIBLE_USD_BUYIN } from './buyInExtractor';
import { parseUsdCents, centsToUsd } from './money';
import { DEFAULT_HERO_NAME } from '../data/localStorage';

/**
 * Try US-locale parse first, fall back to locale-aware (comma-decimal) on
 * null. Keeps existing en-US behaviour identical while letting Brazilian /
 * European summary exports through ("US$ 1,40", "0,49").
 */
function parseMoneyAnyLocale(input: string): number | null {
  const us = parseUsdCents(input);
  if (us !== null) return us;
  return parseUsdCents(input, { localeAware: true });
}

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
const RE_FINISH_FLEX = /(\d+)(?:st|nd|rd|th)?:\s+([^,([\]]+)/i;
const RE_MONEY = /\$?([\d,]+\.?\d*)/;
const RE_BOUNTY_LINE = /(?:received|won|bounty).*?\$?([\d,]+\.?\d*).*?(?:bounties|eliminating)/i;


/**
 * Parse a PokerStars Tournament Summary file.
 * Enhanced for fuzzy matching and bounty support.
 */
export function parseTournamentSummary(
  fileContent: string,
  heroName: string = DEFAULT_HERO_NAME
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
  let prizeCents: number | null = null;
  let bountyCents: number | null = null;
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
      const contextHasHero = line.toLowerCase().includes(heroLower)
        || lines[i-1]?.toLowerCase().includes(heroLower)
        || lines[i+1]?.toLowerCase().includes(heroLower);
      if (bMatch && contextHasHero) {
        const addCents = parseMoneyAnyLocale(bMatch[1]!);
        if (addCents !== null) bountyCents = (bountyCents || 0) + addCents;
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
          const cents = parseMoneyAnyLocale(moneyMatch[1]!);
          if (cents !== null) prizeCents = cents;
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
      if (pMatch) {
        const cents = parseMoneyAnyLocale(pMatch[1]!);
        if (cents !== null) prizeCents = cents;
      }
    }

    // Try finding Buy-In explicitly (e.g. PokerStars: "Buy-In: $0.98/$0.12")
    if (line.toLowerCase().startsWith('buy-in:')) {
      // PokerStars summaries use slash, not plus, as the buy-in/fee separator
      // on this line: "Buy-In: $0.49/$0.06 USD". Normalize to `$X+$Y` so the
      // shared extractor can handle it. Two locale variants:
      //   en-US: "$0.49/$0.06"
      //   pt-BR: "US$ 0,49/US$ 0,06" (and freer spacing)
      const afterColon = line.slice(line.indexOf(':') + 1);
      const normalized = afterColon
        .replace(
          /US\$\s*(\d+(?:[.,]\d+)?)\s*\/\s*US\$\s*(\d+(?:[.,]\d+)?)/,
          'US$$ $1+US$$ $2',
        )
        .replace(/\$(\d+(?:[.,]\d+)?)\/\$(\d+(?:[.,]\d+)?)/, '$$$1+$$$2');
      const extracted = extractBuyIn(tournamentName, normalized);
      if (!extracted.unresolved) {
        buyIn = extracted.buyIn;
        fee = extracted.fee;
        currency = extracted.currency;
      } else {
        // Keep buyIn/fee null (= "undefined" on the way out) so importer
        // won't clobber a correct hand-history value with garbage.
        // Still capture currency classification if the extractor resolved it.
        if (extracted.currency !== 'USD') {
          currency = extracted.currency;
          buyIn = 0;
          fee = 0;
        }
      }
    }
  }

  // Tournament-name currency hint (covers summaries where the Buy-In
  // line is missing entirely — rare but seen in Brazilian exports).
  if (buyIn === null) {
    const nameExtract = extractBuyIn(tournamentName, tournamentName);
    if (!nameExtract.unresolved) {
      buyIn = nameExtract.buyIn;
      fee = nameExtract.fee;
      currency = nameExtract.currency;
    }
  }

  // Sanity net: a USD buy-in > the plausible ceiling is almost always a
  // leaked prize-pool guarantee. Drop to undefined so we don't overwrite
  // a correct hand-history value downstream.
  if (currency === 'USD' && buyIn !== null && buyIn + (fee ?? 0) > MAX_PLAUSIBLE_USD_BUYIN) {
    buyIn = null;
    fee = null;
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
    prize: prizeCents !== null ? centsToUsd(prizeCents) : 0,
    bounty: bountyCents !== null ? centsToUsd(bountyCents) : 0,
    buyIn: buyIn !== null ? buyIn : undefined,
    fee: fee !== null ? fee : undefined,
    currency,
    heroName,
  };
}
