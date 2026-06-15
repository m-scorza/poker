import type { Hand, PlayerInHand, Action, Tournament } from '../types/hand';
import { assignPositions } from './position';
import { extractBuyIn } from './buyInExtractor';
import { parseUsdCents, centsToUsd, parseLocaleChips } from './money';


export interface ParsedHand {
  hand: Hand;
  players: PlayerInHand[];
  actions: Action[];
  tournament: Partial<Tournament>;
  /** Map of playerName → total chips collected from pot(s). */
  collectedAmounts: Map<string, number>;
  /** Players who appear on a SUMMARY "showed [cards] and won" line. */
  showdownWinners: Set<string>;
}

type Street = 'preflop' | 'flop' | 'turn' | 'river';

// --- Regex patterns from CLAUDE.md ---
const RE_HAND_ID = /Hand #(\d+)/;
const RE_TOURNAMENT_ID = /Tournament #(\d+)/;
const RE_LEVEL_BLINDS = /Level [IVXLCDM]+ \((\d+)\/(\d+)\)/;
const RE_CASH_BLINDS = /\(\$(\d+(?:\.\d+)?)\/\$(\d+(?:\.\d+)?)/;
const RE_DATE = /(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})\s+\w+/;
const RE_TABLE_FORMAT = /(\d+)-max/;
const RE_BUTTON_SEAT = /Seat #(\d+) is the button/;
const RE_SEAT = /Seat (\d+): (.+?) \(\$?([\d,]+(?:\.\d+)?) in chips/;
const RE_SITTING_OUT = /is sitting out/;
const RE_ANTE = /^(.+?): posts the ante \$?([\d.]+)/;
const RE_SMALL_BLIND = /^(.+?): posts small blind \$?([\d.]+)/;
const RE_BIG_BLIND = /^(.+?): posts big blind \$?([\d.]+)/;
const RE_BUTTON_BLIND = /^(.+?): posts button blind \$?([\d.]+)/;
const RE_FLOP = /\*\*\* FLOP \*\*\* \[([^\]]+)\]/;
const RE_TURN = /\*\*\* TURN \*\*\* \[[^\]]+\] \[([^\]]+)\]/;
const RE_RIVER = /\*\*\* RIVER \*\*\* \[[^\]]+\] \[([^\]]+)\]/;
const RE_TOTAL_POT = /Total pot \$?([\d.]+)/;
const RE_RAKE = /Rake \$?([\d.]+)/;
const RE_SHOWED = /Seat \d+: (.+?) (?:\(.+?\) )?showed \[([^\]]+)\]/;
const RE_SHOWED_AND_WON = /Seat \d+: (.+?) (?:\(.+?\) )?showed \[[^\]]+\] and won/;
const RE_FINISH = /finished the tournament in (\d+)\w+ place/;
const RE_PRIZE = /received \$([0-9.]+)/;
const RE_COLLECTED = /^(.+?):? collected \$?([\d.,]+) from/;

// Action patterns
const RE_FOLDS = /^(.+?): folds/;
const RE_CHECKS = /^(.+?): checks/;
const RE_CALLS = /^(.+?): calls \$?([\d.]+)/;
const RE_RAISES = /^(.+?): raises \$?([\d.]+) to \$?([\d.]+)/;
const RE_BETS = /^(.+?): bets \$?([\d.]+)/;
const RE_ALL_IN = /and is all-in/;
const RE_BOUNTY_WINS = /^(.+?) wins (?:the )?(?:\$([\d.]+)|[\d.]+|) (?:bounty )?for eliminating/;

/**
 * Parse a PokerStars hand history file into structured data.
 * Handles BOM encoding (Bug #6) and deduplicates by hand ID (Bug #5).
 */
export const MAX_HAND_HISTORY_INPUT_BYTES = 20 * 1024 * 1024;

/** Result of a file parse, including how many hand blocks were dropped. */
export interface ParseFileResult {
  hands: ParsedHand[];
  /**
   * Blocks that carried a `Hand #` header (i.e. were meant to be hands) but
   * could not be parsed — either they threw or produced no hand. Duplicates do
   * not count. Surfaced so the import confidence ledger can report silent
   * per-hand drops instead of claiming "high confidence" (CQ-4).
   */
  skippedBlocks: number;
}

export function parsePokerStarsFile(
  fileContent: string,
  heroName: string = 'scorza23',
): ParsedHand[] {
  return parsePokerStarsFileWithDiagnostics(fileContent, heroName).hands;
}

export function parsePokerStarsFileWithDiagnostics(
  fileContent: string,
  heroName: string = 'scorza23',
): ParseFileResult {
  if (fileContent.length > MAX_HAND_HISTORY_INPUT_BYTES) return { hands: [], skippedBlocks: 0 };
  // Bug #6: Strip UTF-8 BOM + normalize line endings (CRLF → LF)
  const content = fileContent
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Split into hand blocks (separated by 2+ blank lines)
  const blocks = content.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  const results: ParsedHand[] = [];
  const seenIds = new Set<string>();
  let skippedBlocks = 0;

  for (const block of blocks) {
    // A block carrying a `Hand #` header is meant to be a hand; if it fails to
    // parse we count it as skipped rather than dropping it silently (CQ-4).
    const looksLikeHand = RE_HAND_ID.test(block);
    try {
      const parsed = parseHandBlock(block, heroName);
      if (!parsed) {
        if (looksLikeHand) skippedBlocks++;
        continue;
      }

      // Bug #5: Deduplicate by hand ID
      if (seenIds.has(parsed.hand.id)) continue;
      seenIds.add(parsed.hand.id);

      results.push(parsed);
    } catch (err) {
      if (looksLikeHand) skippedBlocks++;
      console.warn('Failed to parse hand block:', err);
      // Graceful degradation: skip unparseable hands, don't crash the file
      continue;
    }
  }

  return { hands: results, skippedBlocks };
}

function parseHandBlock(block: string, heroName: string): ParsedHand | null {
  const lines = block.split('\n').map((l) => l.trim());

  // --- Header line ---
  const headerLine = lines[0];
  if (!headerLine) return null;

  const handIdMatch = RE_HAND_ID.exec(headerLine);
  if (!handIdMatch) return null;
  const handId = handIdMatch[1]!;

  const tournamentIdMatch = RE_TOURNAMENT_ID.exec(headerLine);
  const tournamentId = tournamentIdMatch?.[1] ?? '';
  
  // Extract tournament name (everything after ID and before Level/Blinds)
  let tournamentName = '';
  if (tournamentId) {
    const afterId = headerLine.slice(headerLine.indexOf(tournamentId) + tournamentId.length).trim();
    if (afterId.startsWith(',')) {
      const namePart = afterId.slice(1).split(' - ')[0];
      if (namePart) tournamentName = namePart.trim();
    }
  }

  const extracted = tournamentId
    ? extractBuyIn(tournamentName, headerLine)
    : { buyIn: 0, fee: 0, currency: 'USD' as const, isBounty: false };
  const buyIn = extracted.buyIn;
  const fee = extracted.fee;
  const blindsMatch = RE_LEVEL_BLINDS.exec(headerLine);
  const cashBlindsMatch = !blindsMatch ? RE_CASH_BLINDS.exec(headerLine) : null;
  const buttonBlindsMatch = !blindsMatch && !cashBlindsMatch
    ? /Level [IVXLCDM]+ \(Button Blind\s+([\d,.]+)\s*-\s*Ante\s+([\d,.]+)\s*\)/i.exec(headerLine)
    : null;
  const playMoneyBlindsMatch = !blindsMatch && !cashBlindsMatch && !buttonBlindsMatch
    ? /\((\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\)/.exec(headerLine)
    : null;

  const smallBlind = blindsMatch ? parseInt(blindsMatch[1]!, 10)
    : cashBlindsMatch ? parseFloat(cashBlindsMatch[1]!)
    : playMoneyBlindsMatch ? parseFloat(playMoneyBlindsMatch[1]!) : 0;
  const bigBlind = blindsMatch ? parseInt(blindsMatch[2]!, 10)
    : cashBlindsMatch ? parseFloat(cashBlindsMatch[2]!)
    : buttonBlindsMatch ? parseFloat(buttonBlindsMatch[1]!.replace(',', '.'))
    : playMoneyBlindsMatch ? parseFloat(playMoneyBlindsMatch[2]!) : 0;

  const currency: 'USD' | 'T$' | 'PLAY' | 'TICKET' = tournamentId
    ? extracted.currency
    : playMoneyBlindsMatch ? 'PLAY' : 'USD';

  // Extract level number from roman numerals position (use index as approximation)
  const levelMatch = /Level ([IVXLCDM]+)/.exec(headerLine);
  const level = levelMatch ? romanToInt(levelMatch[1]!) : 0;

  const dateMatch = RE_DATE.exec(headerLine);
  if (!dateMatch) return null; // Bug #6: Require valid date
  const date = new Date(Date.UTC(
    parseInt(dateMatch[1]!, 10),
    parseInt(dateMatch[2]!, 10) - 1,
    parseInt(dateMatch[3]!, 10),
    parseInt(dateMatch[4]!, 10),
    parseInt(dateMatch[5]!, 10),
    parseInt(dateMatch[6]!, 10),
  ));

  // --- Table line ---
  const tableLine = lines[1];
  if (!tableLine) return null;

  const formatMatch = RE_TABLE_FORMAT.exec(tableLine);
  const maxSeats = formatMatch ? parseInt(formatMatch[1]!, 10) : 9;

  const buttonMatch = RE_BUTTON_SEAT.exec(tableLine);
  if (!buttonMatch) return null;
  const buttonSeat = parseInt(buttonMatch[1]!, 10);

  // --- Seat lines ---
  const seats: { seatNumber: number; playerName: string; chips: number }[] = [];
  for (const line of lines) {
    // Skip players marked as sitting out
    if (RE_SITTING_OUT.test(line)) continue;
    const seatMatch = RE_SEAT.exec(line);
    if (seatMatch) {
      seats.push({
        seatNumber: parseInt(seatMatch[1]!, 10),
        playerName: seatMatch[2]!,
        chips: parseLocaleChips(seatMatch[3]!),
      });
    }
  }

  if (seats.length === 0) return null;
  // Skip single-player hands (tournament end — no action possible)
  if (seats.length === 1) return null;

  // Assign positions (Bug #3 & #4 handled inside assignPositions)
  const positionMap = assignPositions(
    seats.map((s) => ({ seatNumber: s.seatNumber, playerName: s.playerName })),
    buttonSeat,
  );

  // --- Parse actions ---
  const actions: Action[] = [];
  let currentStreet: Street = 'preflop';
  let sequence = 0;
  let ante = 0;
  let boardFlop: string[] | null = null;
  let boardTurn: string | null = null;
  let boardRiver: string | null = null;
  let heroCards: [string, string] | null = null;
  let hasShowdown = false;
  let handBountyCents = 0;

  // Track shown cards per player
  const shownCards = new Map<string, [string, string]>();
  // Track total cents put into the pot by each player (using integer cents)
  const totalInvested = new Map<string, number>();

  const addInvestment = (name: string, amountCents: number) => {
    if (isNaN(amountCents)) return;
    totalInvested.set(name, (totalInvested.get(name) ?? 0) + amountCents);
  };

  // Hero cards pattern
  const reHeroCards = new RegExp(
    `Dealt to ${escapeRegex(heroName)} \\[([^\\]]+)\\]`,
  );

  for (const line of lines) {
    // Street markers
    if (line.startsWith('*** FLOP ***')) {
      currentStreet = 'flop';
      const flopMatch = RE_FLOP.exec(line);
      if (flopMatch) {
        boardFlop = flopMatch[1]!.split(' ').map((c) => c.trim());
      }
      continue;
    }
    if (line.startsWith('*** TURN ***')) {
      currentStreet = 'turn';
      const turnMatch = RE_TURN.exec(line);
      if (turnMatch) {
        boardTurn = turnMatch[1]!.trim();
      }
      continue;
    }
    if (line.startsWith('*** RIVER ***')) {
      currentStreet = 'river';
      const riverMatch = RE_RIVER.exec(line);
      if (riverMatch) {
        boardRiver = riverMatch[1]!.trim();
      }
      continue;
    }
    if (line.startsWith('*** SHOW DOWN ***')) {
      hasShowdown = true;
      break; // Stop parsing actions
    }
    if (line.startsWith('*** SUMMARY ***')) {
      break; // Stop parsing actions
    }

    // Hero cards
    const heroMatch = reHeroCards.exec(line);
    if (heroMatch) {
      const cards = heroMatch[1]!.split(' ').map((c) => c.trim());
      if (cards.length >= 2) {
        heroCards = [cards[0]!, cards[1]!];
      }
      continue;
    }

    // Forced bets
    const anteMatch = RE_ANTE.exec(line);
    if (anteMatch) {
      const amountCents = Math.round(parseFloat(anteMatch[2]!) * 100);
      ante = amountCents / 100;
      addInvestment(anteMatch[1]!, amountCents);
      actions.push({
        handId,
        street: 'preflop',
        playerName: anteMatch[1]!,
        actionType: 'post_ante',
        amount: amountCents / 100,
        isAllIn: false,
        sequence: sequence++,
      });
      continue;
    }

    const sbMatch = RE_SMALL_BLIND.exec(line);
    if (sbMatch) {
      const amountCents = Math.round(parseFloat(sbMatch[2]!) * 100);
      addInvestment(sbMatch[1]!, amountCents);
      actions.push({
        handId,
        street: 'preflop',
        playerName: sbMatch[1]!,
        actionType: 'post_sb',
        amount: amountCents / 100,
        isAllIn: false,
        sequence: sequence++,
      });
      continue;
    }

    const buttonBlindMatch = RE_BUTTON_BLIND.exec(line);
    if (buttonBlindMatch) {
      const amountCents = Math.round(parseFloat(buttonBlindMatch[2]!) * 100);
      addInvestment(buttonBlindMatch[1]!, amountCents);
      actions.push({
        handId,
        street: 'preflop',
        playerName: buttonBlindMatch[1]!,
        actionType: 'post_bb',
        amount: amountCents / 100,
        isAllIn: false,
        sequence: sequence++,
      });
      continue;
    }

    const bbMatch = RE_BIG_BLIND.exec(line);
    if (bbMatch) {
      const amountCents = Math.round(parseFloat(bbMatch[2]!) * 100);
      addInvestment(bbMatch[1]!, amountCents);
      actions.push({
        handId,
        street: 'preflop',
        playerName: bbMatch[1]!,
        actionType: 'post_bb',
        amount: amountCents / 100,
        isAllIn: false,
        sequence: sequence++,
      });
      continue;
    }

    // Voluntary actions
    const isAllIn = RE_ALL_IN.test(line);

    const foldMatch = RE_FOLDS.exec(line);
    if (foldMatch) {
      actions.push({
        handId,
        street: currentStreet,
        playerName: foldMatch[1]!,
        actionType: 'fold',
        amount: null,
        isAllIn: false,
        sequence: sequence++,
      });
      continue;
    }

    const checkMatch = RE_CHECKS.exec(line);
    if (checkMatch) {
      actions.push({
        handId,
        street: currentStreet,
        playerName: checkMatch[1]!,
        actionType: 'check',
        amount: null,
        isAllIn: false,
        sequence: sequence++,
      });
      continue;
    }

    const callMatch = RE_CALLS.exec(line);
    if (callMatch) {
      const amountCents = Math.round(parseFloat(callMatch[2]!) * 100);
      addInvestment(callMatch[1]!, amountCents);
      actions.push({
        handId,
        street: currentStreet,
        playerName: callMatch[1]!,
        actionType: 'call',
        amount: amountCents / 100,
        isAllIn,
        sequence: sequence++,
      });
      continue;
    }

    const raiseMatch = RE_RAISES.exec(line);
    if (raiseMatch) {
      const addedCents = Math.round(parseFloat(raiseMatch[2]!) * 100);
      const totalCents = Math.round(parseFloat(raiseMatch[3]!) * 100);
      addInvestment(raiseMatch[1]!, addedCents);
      actions.push({
        handId,
        street: currentStreet,
        playerName: raiseMatch[1]!,
        actionType: 'raise',
        amount: totalCents / 100, // Store "to" amount
        isAllIn,
        sequence: sequence++,
      });
      continue;
    }

    const betMatch = RE_BETS.exec(line);
    if (betMatch) {
      const amountCents = Math.round(parseFloat(betMatch[2]!) * 100);
      addInvestment(betMatch[1]!, amountCents);
      actions.push({
        handId,
        street: currentStreet,
        playerName: betMatch[1]!,
        actionType: 'bet',
        amount: amountCents / 100,
        isAllIn,
        sequence: sequence++,
      });
      continue;
    }

    // Check for bounties won by hero
    const bountyMatch = RE_BOUNTY_WINS.exec(line);
    if (bountyMatch && bountyMatch[1] === heroName) {
      const amountRegex = /\$([\d.]+)/.exec(line);
      if (amountRegex) {
        const cents = parseUsdCents(amountRegex[1]!);
        if (cents !== null) handBountyCents += cents;
      }
    }
  }

  // Parse showdown cards from SUMMARY section
  for (const line of lines) {
    const showMatch = RE_SHOWED.exec(line);
    if (showMatch) {
      const playerName = showMatch[1]!.trim();
      const cards = showMatch[2]!.split(' ').map((c) => c.trim());
      if (cards.length >= 2) {
        shownCards.set(playerName, [cards[0]!, cards[1]!]);
      }
    }
  }

  // Parse collected amounts (for wonAmount tracking) and showdown winners
  const collectedAmounts = new Map<string, number>(); // Stores cents internally
  const showdownWinners = new Set<string>();
  for (const line of lines) {
    const showedWonMatch = RE_SHOWED_AND_WON.exec(line);
    if (showedWonMatch) {
      showdownWinners.add(showedWonMatch[1]!.trim());
    }
    const collectedMatch = RE_COLLECTED.exec(line);
    if (collectedMatch) {
      const name = collectedMatch[1]!.trim();
      const amountStr = collectedMatch[2]!.replace(/,/g, '');
      const amountCents = Math.round(parseFloat(amountStr) * 100);
      if (!isNaN(amountCents)) {
        collectedAmounts.set(name, (collectedAmounts.get(name) ?? 0) + amountCents);
      }
      continue;
    }
  }

  // Parse total pot and rake from summary
  let totalPot = 0;
  let rake = 0;
  for (const line of lines) {
    const potMatch = RE_TOTAL_POT.exec(line);
    if (potMatch) {
      totalPot = parseFloat(potMatch[1]!);
      const rakeMatch = RE_RAKE.exec(line);
      if (rakeMatch) {
        rake = parseFloat(rakeMatch[1]!);
      }
      break;
    }
  }

  // Tournament finish position
  let finishPosition: number | null = null;
  let prize: number | null = null;
  for (const line of lines) {
    const finishMatch = RE_FINISH.exec(line);
    if (finishMatch) {
      finishPosition = parseInt(finishMatch[1]!, 10);
    }
    const prizeMatch = RE_PRIZE.exec(line);
    if (prizeMatch) {
      const cents = parseUsdCents(prizeMatch[1]!);
      if (cents !== null) prize = centsToUsd(cents);
    }
  }

  const heroSeat = seats.find((s) => s.playerName === heroName);
  const heroPutIn = heroSeat ? (totalInvested.get(heroName) ?? 0) : 0;
  const heroWon = heroSeat ? (collectedAmounts.get(heroName) ?? 0) : 0;

  // Build Hand object
  const hand: Hand = {
    id: handId,
    tournamentId,
    date,
    level,
    smallBlind,
    bigBlind,
    ante,
    maxSeats,
    activePlayers: seats.length,
    buttonSeat,
    boardFlop,
    boardTurn,
    boardRiver,
    totalPot,
    rake,
    hasShowdown,
    heroChipsBefore: heroSeat?.chips ?? 0,
    heroChipsAfter: heroSeat ? (Math.round(heroSeat.chips * 100) - heroPutIn + heroWon) / 100 : 0,
    villainDeltas: seats
      .filter((s) => s.playerName !== heroName)
      .map((s) => {
        const invested = totalInvested.get(s.playerName) ?? 0;
        const won = collectedAmounts.get(s.playerName) ?? 0;
        return { name: s.playerName, net: (won - invested) / 100 };
      }),
    bountyCollected: handBountyCents > 0 ? centsToUsd(handBountyCents) : null,
  };

  // Build PlayerInHand array
  const players: PlayerInHand[] = seats.map((seat) => {
    const position = positionMap.get(seat.seatNumber)!;
    const isHero = seat.playerName === heroName;
    let holeCards: [string, string] | null = null;

    if (isHero && heroCards) {
      holeCards = normalizeHoleCards(heroCards);
    } else if (shownCards.has(seat.playerName)) {
      holeCards = normalizeHoleCards(shownCards.get(seat.playerName)!);
    }

    const totalPutIn = totalInvested.get(seat.playerName) ?? 0;
    const totalWon = collectedAmounts.get(seat.playerName) ?? 0;

    return {
      handId,
      seatNumber: seat.seatNumber,
      playerName: seat.playerName,
      chipsBefore: seat.chips,
      chipsAfter: (Math.round(seat.chips * 100) - totalPutIn + totalWon) / 100,
      position,
      isHero,
      holeCards,
    };
  });

  // Build tournament partial
  const tournament: Partial<Tournament> = {
    id: tournamentId,
    name: tournamentName,
    buyIn,
    fee,
    currency,
    format: `${maxSeats}-max`,
    finishPosition,
    prize,
    category: extracted.isBounty ? 'Progressive KO' : undefined,
  };

  // Convert collectedAmounts to float for returned map representation
  const collectedAmountsFloat = new Map<string, number>();
  for (const [name, cents] of collectedAmounts.entries()) {
    collectedAmountsFloat.set(name, cents / 100);
  }

  return { hand, players, actions, tournament, collectedAmounts: collectedAmountsFloat, showdownWinners };
}

/** Convert Roman numeral string to integer. */
function romanToInt(roman: string): number {
  const map: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = map[roman[i]!] ?? 0;
    const next = map[roman[i + 1]!] ?? 0;
    if (current < next) {
      result -= current;
    } else {
      result += current;
    }
  }
  return result;
}

/** Escape special regex characters in a string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalize hole cards to have highest rank first (Bug #3) */
function normalizeHoleCards(cards: [string, string]): [string, string] {
  const rankOrder: Record<string, number> = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
  const r1 = rankOrder[cards[0]![0]!] ?? 0;
  const r2 = rankOrder[cards[1]![0]!] ?? 0;
  return r1 >= r2 ? [cards[0]!, cards[1]!] : [cards[1]!, cards[0]!];
}
