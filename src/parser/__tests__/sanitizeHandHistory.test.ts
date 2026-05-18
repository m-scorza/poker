import { describe, expect, it } from 'vitest';
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
});
