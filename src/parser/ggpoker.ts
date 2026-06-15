import type { Hand, PlayerInHand, Action, Tournament } from '../types/hand';
import type { Position } from '../types/analysis';
import type { ParsedHand } from './pokerstars';
import type { ParsedTournamentSummary } from './tournamentSummary';
import { assignPositions } from './position';
import { extractBuyIn } from './buyInExtractor';
import { MAX_HAND_HISTORY_INPUT_BYTES } from './pokerstars';
import { parseUsdCents, centsToUsd } from './money';

const RE_HAND_ID = /(?:Poker Hand|GGPoker Hand|Hand) #(\w+):/;
const RE_TOURNAMENT_ID = /Tournament #(\d+)/;
const RE_BLINDS = /Level\s*(\d+)\s*\(([\d,]+)\/([\d,]+)(?:\(([\d,]+)\))?\)/;
const RE_BUTTON = /Seat #(\d+) is the button/;
const RE_MAXSEATS = /(\d+)-max/;
const RE_SEAT = /Seat (\d+): (.+?) \(([\d,]+) in chips\)/;
const RE_DEALT = /Dealt to (.+?) \[(.+)\]/;
const RE_ACTION = /^(.+?): (folds|calls|checks|raises|posts small blind|posts big blind|posts the ante|shows|mucks|collected|wins|bets) ?([\d,]+)? ?(?:to )?([\d,]+)?/;
const RE_BOARD = /Board \[(.+)\]/;
const RE_WINNER = /Seat (\d+): (.+?) (?:\(.+?\))?\s*(?:showed \[(.+?)\] and won|won) \(([\d,]+)\)/g;
const RE_TOTAL_POT = /Total pot ([\d,]+) \| Rake ([\d,]+)/;
const RE_UNCALLED = /^Uncalled bet \(([\d,]+)\) returned to (.+)$/;

/**
 * Parse GGPoker Hand History files. Scaffold: produces a best-effort
 * ParsedHand; many Hand fields are stubbed with defaults until the
 * GG-specific extraction logic is fleshed out.
 */
export function parseGGPokerFile(
  fileContent: string,
  heroName: string = 'scorza23'
): ParsedHand[] {
  if (fileContent.length > MAX_HAND_HISTORY_INPUT_BYTES) return [];
  const content = fileContent
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const blocks = content.split(/\n\s*\n/).filter(b => {
    const trimmed = b.trim();
    return trimmed.length > 0 && (
      trimmed.includes('Poker Hand #') ||
      trimmed.includes('GGPoker Hand #') ||
      trimmed.includes('Hand #')
    );
  });
  const results: ParsedHand[] = [];

  for (const block of blocks) {
    try {
      const trimmedBlock = block.trim();
      const lines = trimmedBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const headerLine = lines.find(l =>
        l.includes('Poker Hand #') ||
        l.includes('GGPoker Hand #') ||
        l.includes('Hand #')
      ) || '';
      const handIdMatch = RE_HAND_ID.exec(headerLine);
      if (!handIdMatch) continue;

      const handId = handIdMatch[1]!;
      const tMatch = RE_TOURNAMENT_ID.exec(headerLine);
      const blindsMatch = RE_BLINDS.exec(headerLine);
      const maxSeatsMatch = RE_MAXSEATS.exec(lines[1] || '');

      const tournamentId = tMatch ? tMatch[1]! : '';

      let tournamentName = '';
      let parsedBuyIn = 0;
      let parsedFee = 0;
      let currency: 'USD' | 'T$' | 'PLAY' | 'TICKET' = 'USD';

      if (tournamentId && headerLine.includes(tournamentId)) {
        const afterId = headerLine.slice(headerLine.indexOf(tournamentId) + tournamentId.length).trim();
        if (afterId.startsWith(',')) {
          const namePart = afterId.slice(1).split(' - ')[0];
          if (namePart) {
            tournamentName = namePart.trim();
          }
        }
      }

      const extractedBuyIn = extractBuyIn(tournamentName, tournamentName || headerLine);
      currency = extractedBuyIn.currency;
      if (!extractedBuyIn.unresolved) {
        parsedBuyIn = extractedBuyIn.buyIn;
        parsedFee = extractedBuyIn.fee;
      }

      const tournament: Partial<Tournament> = {
        id: tournamentId,
        name: tournamentName,
        buyIn: parsedBuyIn,
        fee: parsedFee,
        currency,
      };

      const dateStr = lines[0]?.split(' - ')?.pop()?.trim() || '';
      const date = new Date(dateStr.replace(/\sUTC$/, ''));

      const players: PlayerInHand[] = [];
      const actions: Action[] = [];
      const showdownWinners = new Set<string>();
      let buttonSeat = 0;
      let heroHoleCards: [string, string] | null = null;
      let currentStreet: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop';
      let board: string[] = [];
      const smallBlind = blindsMatch ? parseInt(blindsMatch[2]!.replace(/,/g, ''), 10) : 0;
      const bigBlind = blindsMatch ? parseInt(blindsMatch[3]!.replace(/,/g, ''), 10) : 0;
      const ante = blindsMatch && blindsMatch[4] ? parseInt(blindsMatch[4]!.replace(/,/g, ''), 10) : 0;
      let totalPot = 0;
      let rake = 0;

      const totalInvested = new Map<string, number>();
      const collectedAmounts = new Map<string, number>();
      // Chips each player has committed toward the current street's bet level
      // (blinds + voluntary wagers; antes excluded). A "raises X to Y" adds
      // Y − streetInvested[player], not the "raises BY" increment X.
      const streetInvested = new Map<string, number>();

      const addInvestment = (name: string, amount: number) => {
        if (isNaN(amount)) return;
        totalInvested.set(name, (totalInvested.get(name) ?? 0) + amount);
      };

      const buttonLineMatch = RE_BUTTON.exec(block);
      if (buttonLineMatch) buttonSeat = parseInt(buttonLineMatch[1]!, 10);

      for (const line of lines) {
        const seatMatch = RE_SEAT.exec(line);
        if (seatMatch) {
          const seatNo = parseInt(seatMatch[1]!, 10);
          const rawName = seatMatch[2]!;
          const name = rawName === 'Hero' ? heroName : rawName;
          const chips = parseInt(seatMatch[3]!.replace(/,/g, ''), 10);

          players.push({
            handId,
            playerName: name,
            seatNumber: seatNo,
            chipsBefore: chips,
            position: 'BTN' as Position,
            isHero: rawName === 'Hero',
            holeCards: null,
          });
          continue;
        }

        const dealtMatch = RE_DEALT.exec(line);
        if (dealtMatch) {
          if (dealtMatch[1] === 'Hero') {
            const cards = dealtMatch[2]!.split(' ');
            if (cards.length >= 2) {
              heroHoleCards = [cards[0]!, cards[1]!];
            }
          }
          continue;
        }

        if (line.startsWith('*** FLOP ***')) { currentStreet = 'flop'; streetInvested.clear(); continue; }
        if (line.startsWith('*** TURN ***')) { currentStreet = 'turn'; streetInvested.clear(); continue; }
        if (line.startsWith('*** RIVER ***')) { currentStreet = 'river'; streetInvested.clear(); continue; }
        if (line.startsWith('*** SUMMARY ***')) break;

        const uncalledMatch = RE_UNCALLED.exec(line);
        if (uncalledMatch) {
          const returned = parseInt(uncalledMatch[1]!.replace(/,/g, ''), 10);
          addInvestment(uncalledMatch[2]!.trim() === 'Hero' ? heroName : uncalledMatch[2]!.trim(), -returned);
          continue;
        }

        const actionMatch = RE_ACTION.exec(line);
        if (actionMatch) {
          const rawName = actionMatch[1]!;
          const name = rawName === 'Hero' ? heroName : rawName;
          const type = actionMatch[2]!;
          const amount = parseInt((actionMatch[4] || actionMatch[3] || '0').replace(/,/g, ''), 10);

          let actionType: Action['actionType'] = 'fold';
          let investment = amount;
          let storedAmount = amount;
          // Whether this action commits chips toward the current street's bet
          // level (so the next raise's "to" amount is measured correctly).
          // Antes are excluded; folds/checks commit nothing.
          let commitsToStreet = true;
          if (type.includes('posts the ante')) { actionType = 'post_ante'; commitsToStreet = false; }
          else if (type.includes('posts small blind')) actionType = 'post_sb';
          else if (type.includes('posts big blind')) actionType = 'post_bb';
          else if (type === 'folds') { actionType = 'fold'; investment = 0; commitsToStreet = false; }
          else if (type === 'calls') actionType = 'call';
          else if (type === 'checks') { actionType = 'check'; investment = 0; commitsToStreet = false; }
          else if (type === 'raises') {
             actionType = 'raise';
             const to = actionMatch[4] ? parseInt(actionMatch[4].replace(/,/g, ''), 10) : 0;
             // Chips actually added = "to" minus what this player already has in
             // on this street, not the "raises BY" increment (actionMatch[3]).
             investment = to - (streetInvested.get(name) ?? 0);
             storedAmount = to || investment;
             streetInvested.set(name, to);
             addInvestment(name, investment);
             actions.push({
               handId,
               sequence: actions.length,
               playerName: name,
               street: currentStreet,
               actionType,
               amount: storedAmount,
               isAllIn: line.includes('all-in'),
             });
             continue;
          }
          else if (type === 'bets') actionType = 'bet';
          else continue;

          if (commitsToStreet) {
            streetInvested.set(name, (streetInvested.get(name) ?? 0) + investment);
          }
          addInvestment(name, investment);

          actions.push({
            handId,
            sequence: actions.length,
            playerName: name,
            street: currentStreet,
            actionType,
            amount: storedAmount,
            isAllIn: line.includes('all-in'),
          });
          continue;
        }
      }

      const hero = players.find(p => p.isHero);
      if (hero && heroHoleCards) hero.holeCards = heroHoleCards;

      const summaryStart = block.indexOf('*** SUMMARY ***');
      if (summaryStart !== -1) {
        const summary = block.slice(summaryStart);
        const potMatch = RE_TOTAL_POT.exec(summary);
        if (potMatch) {
          totalPot = parseInt(potMatch[1]!.replace(/,/g, ''), 10);
          rake = parseInt(potMatch[2]!.replace(/,/g, ''), 10);
        }

        const boardMatch = RE_BOARD.exec(summary);
        if (boardMatch) board = boardMatch[1]!.split(' ');

        let m;
        while ((m = RE_WINNER.exec(summary)) !== null) {
          const winnerName = m[2] === 'Hero' ? heroName : m[2]!;
          
          // Specifically check if they SHOWED cards to count as a showdown!
          // regex capture group 3 is the holecards inside the "showed" block
          if (m[3]) {
            showdownWinners.add(winnerName);
          }
          
          const wonAmt = parseInt(m[4]!.replace(/,/g, ''), 10);
          collectedAmounts.set(winnerName, (collectedAmounts.get(winnerName) ?? 0) + wonAmt);
        }
      }

      const maxSeats = maxSeatsMatch ? parseInt(maxSeatsMatch[1]!, 10) : players.length;
      const boardFlop = board.length >= 3 ? board.slice(0, 3) : null;
      const boardTurn = board.length >= 4 ? board[3]! : null;
      const boardRiver = board.length >= 5 ? board[4]! : null;

      const playersWhoFolded = new Set(actions.filter(a => a.actionType === 'fold').map(a => a.playerName));
      const playersAtShowdown = players.length - playersWhoFolded.size;
      const actualShowdownOccurred = playersAtShowdown >= 2;

      const positionMap = assignPositions(
        players.map(p => ({ seatNumber: p.seatNumber, playerName: p.playerName })),
        buttonSeat
      );
      for (const p of players) {
        p.position = positionMap.get(p.seatNumber) ?? 'BTN';
      }

      const heroChipsBefore = hero?.chipsBefore ?? 0;
      const heroPutIn = hero ? (totalInvested.get(heroName) ?? 0) : 0;
      const heroWon = hero ? (collectedAmounts.get(heroName) ?? 0) : 0;

      const hand: Hand = {
        id: handId,
        tournamentId,
        date,
        level: blindsMatch ? parseInt(blindsMatch[1]!, 10) : 0,
        smallBlind,
        bigBlind,
        ante,
        maxSeats,
        activePlayers: players.length,
        buttonSeat,
        boardFlop,
        boardTurn,
        boardRiver,
        totalPot,
        rake,
        hasShowdown: actualShowdownOccurred,
        heroChipsBefore,
        heroChipsAfter: heroChipsBefore - heroPutIn + heroWon,
        villainDeltas: players
          .filter(p => !p.isHero)
          .map(p => {
             const invested = totalInvested.get(p.playerName) ?? 0;
             const won = collectedAmounts.get(p.playerName) ?? 0;
             return { name: p.playerName, net: won - invested };
          }),
      };

      results.push({
        hand,
        players,
        actions,
        tournament,
        collectedAmounts,
        showdownWinners,
      });

    } catch (err) {
      console.error(`Error parsing GGPoker hand:`, err);
    }
  }

  return results;
}

/** Stub for GGPoker Tournament Summary parser. */
export function parseGGPokerSummary(
  fileContent: string,
  heroName: string = 'scorza23'
): ParsedTournamentSummary | null {
  if (!fileContent.includes('Tournament #')) return null;

  const content = fileContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = content.split('\n').map(l => l.trim());
  const heroLower = heroName.toLowerCase();
  
  let tournamentId = '';
  let finishPosition: number | null = null;
  let prize = 0;
  let buyIn = 0;
  let fee = 0;
  let currency: 'USD' | 'T$' | 'PLAY' | 'TICKET' = 'USD';
  
  for (const line of lines) {
    if (!tournamentId) {
      const tMatch = /Tournament #(\d+)/.exec(line);
      if (tMatch) tournamentId = tMatch[1]!;
    }
    const fMatch = /(\d+)(?:st|nd|rd|th)? :\s+([^,]+)/i.exec(line);
    if (fMatch) {
      const pos = parseInt(fMatch[1]!, 10);
      const name = fMatch[2]!.trim().toLowerCase();
      if (name.includes(heroLower) || heroLower.includes(name)) {
        finishPosition = pos;
      }
    }
    const yfMatch = /You finished the tournament in (\d+)/i.exec(line);
    if (yfMatch) {
      finishPosition = parseInt(yfMatch[1]!, 10);
    }
    const yrMatch = /You received a total of \$?([\d.,]+)/i.exec(line);
    if (yrMatch) {
      const cents = parseUsdCents(yrMatch[1]!);
      if (cents !== null) prize = centsToUsd(cents);
    }
    const shouldExtractBuyIn = /Tournament #/i.test(line) || line.toLowerCase().startsWith('buy-in:');
    if (shouldExtractBuyIn) {
      const extracted = extractBuyIn('', line);
      if (!extracted.unresolved) {
        buyIn = extracted.buyIn;
        fee = extracted.fee;
        currency = extracted.currency;
      } else if (extracted.currency !== 'USD') {
        buyIn = 0;
        fee = 0;
        currency = extracted.currency;
      }
    }
  }

  if (!tournamentId) return null;

  return {
    tournamentId,
    finishPosition,
    prize,
    bounty: 0,
    buyIn,
    fee,
    currency,
    heroName,
  };
}
