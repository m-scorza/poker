import { describe, expect, it } from 'vitest';
import { buildLocalContributionPackage } from '../contributionPackage';

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

describe('buildLocalContributionPackage', () => {
  it('builds a local-only sanitized parser package without raw identifiers or filenames', () => {
    const pack = buildLocalContributionPackage({
      files: [
        { name: 'C:/Users/MICRO/Downloads/scorza23-private-hands.txt', content: RAW_POKERSTARS_HAND },
      ],
      heroName: 'scorza23',
      appVersion: 'test-version',
      createdAt: new Date('2026-05-18T02:30:00Z'),
    });

    expect(pack.schemaVersion).toBe(1);
    expect(pack.kind).toBe('local-sanitized-parser-fixture-package');
    expect(pack.createdAt).toBe('2026-05-18T02:30:00.000Z');
    expect(pack.appVersion).toBe('test-version');
    expect(pack.shareable).toBe(true);
    expect(pack.chunks).toHaveLength(1);
    expect(pack.chunks[0]).toMatchObject({
      id: 'chunk-1',
      sourceFileAlias: 'source-1.txt',
      site: 'pokerstars',
      type: 'hand_history',
      handCount: 1,
      redactionReport: {
        playerAliasCount: 4,
        handIdCount: 1,
        tournamentIdCount: 1,
        tableNameCount: 1,
      },
    });
    expect(pack.chunks[0]!.sanitizedText).toContain('PokerStars Hand #900000000001');
    expect(pack.chunks[0]!.sanitizedText).toContain('Dealt to Hero [Kc 5h]');
    expect(pack.parserReport).toEqual({
      totalFiles: 1,
      sanitizedFiles: 1,
      unsupportedFiles: 0,
      handsFound: 1,
      confidence: 'high',
      warnings: [],
    });
    expect(pack.forbiddenFindings).toEqual([]);

    const serialized = JSON.stringify(pack);
    expect(serialized).not.toContain('scorza23');
    expect(serialized).not.toContain('RealButton99');
    expect(serialized).not.toContain('Maria-Grinder');
    expect(serialized).not.toContain('Villain.With.Dots');
    expect(serialized).not.toContain('260356646368');
    expect(serialized).not.toContain('3989541132');
    expect(serialized).not.toContain('2026/04/05');
    expect(serialized).not.toContain('C:/Users/MICRO/Downloads');
    expect(serialized).not.toContain('scorza23-private-hands.txt');
  });

  it('keeps unsupported inputs out of chunks and reports sanitized generic warnings', () => {
    const pack = buildLocalContributionPackage({
      files: [
        { name: 'private-scorza23-notes.txt', content: 'not a supported hand history for RealButton99' },
      ],
      heroName: 'scorza23',
      appVersion: 'test-version',
      createdAt: new Date('2026-05-18T02:35:00Z'),
    });

    expect(pack.shareable).toBe(true);
    expect(pack.chunks).toEqual([]);
    expect(pack.parserReport).toEqual({
      totalFiles: 1,
      sanitizedFiles: 0,
      unsupportedFiles: 1,
      handsFound: 0,
      confidence: 'low',
      warnings: ['source-1.txt: unsupported or unrecognized poker file'],
    });
    expect(pack.forbiddenFindings).toEqual([]);
    expect(JSON.stringify(pack)).not.toContain('scorza23');
    expect(JSON.stringify(pack)).not.toContain('RealButton99');
    expect(JSON.stringify(pack)).not.toContain('private-scorza23-notes.txt');
  });
});
