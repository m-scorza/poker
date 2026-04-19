import type { Hand, PlayerInHand, Action, Tournament } from '../types/hand';
import type { Position } from '../types/analysis';
import type { ParsedHand } from './pokerstars';
import type { ParsedTournamentSummary } from './tournamentSummary';

const RE_HAND_ID = /(?:Poker Hand|GGPoker Hand|Hand) #(\w+):/;
const RE_TOURNAMENT_ID = /Tournament #(\d+)/;
const RE_BLINDS = /Level\s*(\d+)\s*\(([\d,]+)\/([\d,]+)(?:\(([\d,]+)\))?\)/;
const RE_BUTTON = /Seat #(\d+) is the button/;
const RE_MAXSEATS = /(\d+)-max/;
const RE_SEAT = /Seat (\d+): (.+?) \(([\d,]+) in chips\)/;
const RE_DEALT = /Dealt to (.+?) \[(.+)\]/;
const RE_ACTION = /^(.+?): (folds|calls|checks|raises|posts small blind|posts big blind|posts the ante|shows|mucks|collected|wins|bets) ?([\d,]+)? ?(?:to )?([\d,]+)?/;
const RE_BOARD = /Board \[(.+)\]/;
const RE_WINNER = /Seat (\d+): (.+?) (?:\(.+?\))? (?:showed \[(.+?)\] and )?(won) \(([\d,]+)\)/g;

/**
 * Parse GGPoker Hand History files. Scaffold: produces a best-effort
 * ParsedHand; many Hand fields are stubbed with defaults until the
 * GG-specific extraction logic is fleshed out.
 */
export function parseGGPokerFile(
  fileContent: string,
  heroName: string = 'scorza23'
): ParsedHand[] {
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
      if (tournamentId && headerLine.includes(tournamentId)) {
        const afterId = headerLine.slice(headerLine.indexOf(tournamentId) + tournamentId.length).trim();
        if (afterId.startsWith(',')) {
          const namePart = afterId.slice(1).split(' - ')[0];
          if (namePart) tournamentName = namePart.trim();
        }
      }

      const tournament: Partial<Tournament> = {
        id: tournamentId,
        name: tournamentName,
        buyIn: 0,
        fee: 0,
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

        if (line.startsWith('*** FLOP ***')) { currentStreet = 'flop'; continue; }
        if (line.startsWith('*** TURN ***')) { currentStreet = 'turn'; continue; }
        if (line.startsWith('*** RIVER ***')) { currentStreet = 'river'; continue; }
        if (line.startsWith('*** SUMMARY ***')) break;

        const actionMatch = RE_ACTION.exec(line);
        if (actionMatch) {
          const rawName = actionMatch[1]!;
          const name = rawName === 'Hero' ? heroName : rawName;
          const type = actionMatch[2]!;
          const amount = parseInt((actionMatch[4] || actionMatch[3] || '0').replace(/,/g, ''), 10);

          let actionType: Action['actionType'] = 'fold';
          if (type.includes('posts the ante')) actionType = 'post_ante';
          else if (type.includes('posts small blind')) actionType = 'post_sb';
          else if (type.includes('posts big blind')) actionType = 'post_bb';
          else if (type === 'folds') actionType = 'fold';
          else if (type === 'calls') actionType = 'call';
          else if (type === 'checks') actionType = 'check';
          else if (type === 'raises' || type === 'bets') actionType = 'raise';
          else continue;

          actions.push({
            handId,
            sequence: actions.length,
            playerName: name,
            street: currentStreet,
            actionType,
            amount,
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
        const boardMatch = RE_BOARD.exec(summary);
        if (boardMatch) board = boardMatch[1]!.split(' ');

        let m;
        while ((m = RE_WINNER.exec(summary)) !== null) {
          const winnerName = m[2] === 'Hero' ? heroName : m[2]!;
          showdownWinners.add(winnerName);
        }
      }

      const maxSeats = maxSeatsMatch ? parseInt(maxSeatsMatch[1]!, 10) : players.length;
      const boardFlop = board.length >= 3 ? board.slice(0, 3) : null;
      const boardTurn = board.length >= 4 ? board[3]! : null;
      const boardRiver = board.length >= 5 ? board[4]! : null;
      const heroChipsBefore = hero?.chipsBefore ?? 0;

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
        totalPot: 0,
        rake: 0,
        hasShowdown: showdownWinners.size > 0,
        heroChipsBefore,
        heroChipsAfter: heroChipsBefore,
        villainDeltas: [],
      };

      results.push({
        hand,
        players,
        actions,
        tournament,
        collectedAmounts: new Map(),
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

  const handResults = parseGGPokerFile(fileContent, heroName);
  if (handResults.length === 0) return null;

  const tournamentId = handResults[0]!.hand.tournamentId;

  return {
    tournamentId,
    finishPosition: null,
    prize: 0,
    bounty: 0,
    heroName,
  };
}
