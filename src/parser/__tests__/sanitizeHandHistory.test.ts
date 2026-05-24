import { describe, expect, it } from 'vitest';
import { parseGGPokerFile } from '../ggpoker';
import { parsePokerStarsFile } from '../pokerstars';
import { sanitizeHandHistory } from '../sanitizeHandHistory';

const RAW_POKERSTARS_HAND = `PokerStars Hand #260356646368: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level I (10/20) - 2026/04/05 18:16:05 UTC [2026/04/05 14:16:05 ET]
Table '3989541132 1' 9-max Seat #1 is the button
Seat 1: RealButton99 (1500 in chips)
Seat 2: Maria-Grinder (1500 in chips)
Seat 3: scorza23 (1500 in chips)
Seat 4: Villain.With.Dots (1500 in chips)
RealButton99: posts the ante 3
Maria-Grinder: posts the ante 3
scorza23: posts the ante 3
Villain.With.Dots: posts the ante 3
Maria-Grinder: posts small blind 10
scorza23: posts big blind 20
*** HOLE CARDS ***
Dealt to scorza23 [Kc 5h]
Villain.With.Dots: folds
RealButton99: raises 40 to 60
Maria-Grinder: folds
scorza23: calls 40
*** FLOP *** [6d 2s Qh]
scorza23: checks
RealButton99: bets 60
scorza23: calls 60
*** TURN *** [6d 2s Qh] [Th]
scorza23: checks
RealButton99: checks
*** RIVER *** [6d 2s Qh Th] [Jc]
scorza23: checks
RealButton99: checks
*** SHOW DOWN ***
scorza23: shows [Kc 5h] (a pair of Kings)
RealButton99: shows [Kd As] (a pair of Kings - Ace kicker)
RealButton99 collected 326 from pot
*** SUMMARY ***
Total pot 326 | Rake 0
Board [6d 2s Qh Th Jc]
Seat 1: RealButton99 (button) showed [Kd As] and won (326)
Seat 2: Maria-Grinder (small blind) folded before Flop
Seat 3: scorza23 (big blind) showed [Kc 5h] and lost
Seat 4: Villain.With.Dots folded before Flop
`;

describe('sanitizeHandHistory', () => {
  it('redacts player, table, hand, tournament, and timestamp identifiers while preserving parseable poker semantics', () => {
    const sanitized = sanitizeHandHistory(RAW_POKERSTARS_HAND, { heroName: 'scorza23' });

    expect(sanitized.text).not.toContain('scorza23');
    expect(sanitized.text).not.toContain('RealButton99');
    expect(sanitized.text).not.toContain('Maria-Grinder');
    expect(sanitized.text).not.toContain('Villain.With.Dots');
    expect(sanitized.text).not.toContain('3989541132');
    expect(sanitized.text).not.toContain('260356646368');
    expect(sanitized.text).not.toContain('2026/04/05 18:16:05');

    expect(sanitized.text).toContain('Hand #900000000001');
    expect(sanitized.text).toContain('Tournament #800000000001');
    expect(sanitized.text).toContain("Table 'Sanitized Table 1'");
    expect(sanitized.text).toContain('Dealt to Hero [Kc 5h]');
    expect(sanitized.text).toContain('Hero: posts big blind 20');
    expect(sanitized.text).toContain('Villain_1: raises 40 to 60');
    expect(sanitized.text).toContain('Seat 1: Villain_1 (button) showed [Kd As] and won (326)');

    const reparsed = parsePokerStarsFile(sanitized.text, 'Hero');
    expect(reparsed).toHaveLength(1);
    expect(reparsed[0]!.hand.id).toBe('900000000001');
    expect(reparsed[0]!.hand.tournamentId).toBe('800000000001');
    expect(reparsed[0]!.players.map((p) => p.playerName).sort()).toEqual([
      'Hero',
      'Villain_1',
      'Villain_2',
      'Villain_3',
    ]);
    expect(reparsed[0]!.actions).toHaveLength(parsePokerStarsFile(RAW_POKERSTARS_HAND, 'scorza23')[0]!.actions.length);
  });

  it('returns a redaction report with counts and synthetic aliases but no original identifiers', () => {
    const sanitized = sanitizeHandHistory(RAW_POKERSTARS_HAND, { heroName: 'scorza23' });

    expect(sanitized.report.playerAliasCount).toBe(4);
    expect(sanitized.report.handIdCount).toBe(1);
    expect(sanitized.report.tournamentIdCount).toBe(1);
    expect(sanitized.report.tableNameCount).toBe(1);
    expect(sanitized.report.aliases).toEqual(['Hero', 'Villain_1', 'Villain_2', 'Villain_3']);
    expect(JSON.stringify(sanitized.report)).not.toContain('scorza23');
    expect(JSON.stringify(sanitized.report)).not.toContain('RealButton99');
    expect(JSON.stringify(sanitized.report)).not.toContain('3989541132');
  });

  it('redacts GGPoker hand histories while preserving GGPoker parser semantics', () => {
    const rawGgHand = `Poker Hand #BR1103011317: Tournament #279277562, Mystery Battle Royale $3 Hold'em No Limit - Level4(40/80(16)) - 2026/04/18 20:42:47
Table 'Private GG Table 59' 5-max Seat #1 is the button
Seat 1: 647abfe7 (2,499 in chips)
Seat 2: a81061d (376 in chips)
Seat 3: 707c8e6c (934 in chips)
Seat 4: 7d86368b (3,928 in chips)
Seat 5: Hero (259 in chips)
7d86368b: posts the ante 16
647abfe7: posts the ante 16
707c8e6c: posts the ante 16
Hero: posts the ante 16
a81061d: posts small blind 40
707c8e6c: posts big blind 80
*** HOLE CARDS ***
Dealt to Hero [7c 7s]
7d86368b: folds
Hero: raises 160 to 240
647abfe7: folds
a81061d: calls 200
707c8e6c: folds
*** FLOP *** [4h 9c Ts]
a81061d: bets 120 and is all-in
Hero: calls 3 and is all-in
*** SUMMARY ***
Total pot 646 | Rake 0
Board [4h 9c Ts Th 2s]
Seat 1: 647abfe7 (button) folded before Flop
Seat 2: a81061d (small blind) showed [Tc Kh] and won (646) with three of a kind, Tens
Seat 3: 707c8e6c (big blind) folded before Flop
Seat 4: 7d86368b folded before Flop
Seat 5: Hero showed [7c 7s] and lost with two pair, Tens and Sevens
`;

    const sanitized = sanitizeHandHistory(rawGgHand, { heroName: 'Hero' });

    expect(sanitized.text).not.toContain('BR1103011317');
    expect(sanitized.text).not.toContain('279277562');
    expect(sanitized.text).not.toContain('Private GG Table 59');
    expect(sanitized.text).not.toContain('647abfe7');
    expect(sanitized.text).not.toContain('a81061d');
    expect(sanitized.text).not.toContain('2026/04/18');

    expect(sanitized.text).toContain('Poker Hand #BR900000000001');
    expect(sanitized.text).toContain('Tournament #800000000001');
    expect(sanitized.text).toContain("Table 'Sanitized Table 1'");
    expect(sanitized.text).toContain('Villain_2: posts small blind 40');
    expect(sanitized.text).toContain('Hero: raises 160 to 240');

    const reparsed = parseGGPokerFile(sanitized.text, 'scorza23');
    expect(reparsed).toHaveLength(1);
    expect(reparsed[0]!.hand.id).toBe('BR900000000001');
    expect(reparsed[0]!.hand.tournamentId).toBe('800000000001');
    expect(reparsed[0]!.players.map((p) => p.playerName).sort()).toEqual([
      'Villain_1',
      'Villain_2',
      'Villain_3',
      'Villain_4',
      'scorza23',
    ]);
    expect(reparsed[0]!.players.find((p) => p.isHero)?.holeCards).toEqual(['7c', '7s']);
  });

  it('redacts Open Hand History JSON format while preserving OHH semantics', () => {
    const rawOhhJson = {
      spec_version: '1.0.0',
      hero_player_id: 'p1',
      game_number: '12345',
      table_name: 'My Table',
      start_date_utc: '2026-05-24T12:00:00',
      players: [
        { id: 'p1', name: 'scorza23' },
        { id: 'p2', name: 'villain123' },
      ],
      tournament_info: {
        tournament_number: '999',
        name: 'Big Tourney',
        start_date_utc: '2026-05-24T11:00:00',
      },
      rounds: [
        {
          actions: [
            { player_id: 'p1', action: 'raise' },
          ],
        },
      ],
      pots: [
        {
          player_wins: [
            { player_id: 'p1', amount: 100 },
          ],
        },
      ],
    };

    const sanitized = sanitizeHandHistory(JSON.stringify(rawOhhJson), { heroName: 'scorza23' });
    const parsed = JSON.parse(sanitized.text);

    // Verify redactions
    expect(parsed.hero_player_id).toBe('player-1');
    expect(parsed.game_number).toBe('900000000001');
    expect(parsed.table_name).toBe('Sanitized Table 1');
    expect(parsed.start_date_utc).toBe('2020-01-01T00:00:00');
    expect(parsed.players[0].name).toBe('Hero');
    expect(parsed.players[0].id).toBe('player-1');
    expect(parsed.players[1].name).toBe('Villain_1');
    expect(parsed.players[1].id).toBe('player-2');
    expect(parsed.tournament_info.tournament_number).toBe('800000000001');
    expect(parsed.tournament_info.name).toBe('Sanitized Tournament');
    expect(parsed.tournament_info.start_date_utc).toBe('2020-01-01T00:00:01');
    expect(parsed.rounds[0].actions[0].player_id).toBe('player-1');
    expect(parsed.pots[0].player_wins[0].player_id).toBe('player-1');

    // Verify report
    expect(sanitized.report.playerAliasCount).toBe(2);
    expect(sanitized.report.handIdCount).toBe(1);
    expect(sanitized.report.tournamentIdCount).toBe(1);
    expect(sanitized.report.tableNameCount).toBe(1);
    expect(sanitized.report.aliases).toEqual(['Hero', 'Villain_1']);
  });
});
