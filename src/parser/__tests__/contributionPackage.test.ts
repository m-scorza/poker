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

const RAW_GGPOKER_HAND = `Poker Hand #BR1103011317: Tournament #279277562, Mystery Battle Royale $3 Hold'em No Limit - Level4(40/80(16)) - 2026/04/18 20:42:47
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

const RAW_OHH_JSON = JSON.stringify({
  ohh: {
    spec_version: '1.2.2',
    network_name: 'iPoker Network',
    site_name: 'iPoker',
    game_type: 'Holdem',
    start_date_utc: '2018-05-25T14:35:34',
    table_name: 'Private Final 926126756',
    table_size: 6,
    game_number: '7948166852',
    ante_amount: 16,
    small_blind_amount: 80,
    big_blind_amount: 160,
    dealer_seat: 2,
    hero_player_id: 'real-hero-guid',
    tournament_info: {
      name: '€100 Private Rebuy',
      buyin_amount: 0.45,
      fee_amount: 0.05,
      currency: 'EUR',
      tournament_number: '925681798',
    },
    players: [
      { id: 'real-villain-guid', name: 'KnownReg99', seat: 2, starting_stack: 12953 },
      { id: 'real-hero-guid', name: 'scorza23', seat: 4, starting_stack: 9193 },
      { id: 'real-whale-guid', name: 'Whale Friend', seat: 6, starting_stack: 9972 },
    ],
    rounds: [
      {
        street: 'Preflop',
        actions: [
          { player_id: 'real-hero-guid', action: 'Post Ante', amount: 16, is_allin: false },
          { player_id: 'real-villain-guid', action: 'Post SB', amount: 80, is_allin: false },
          { player_id: 'real-whale-guid', action: 'Post BB', amount: 160, is_allin: false },
          { player_id: 'real-hero-guid', action: 'Dealt Cards', amount: 0, cards: ['Qh', 'Qc'], is_allin: false },
          { player_id: 'real-hero-guid', action: 'Raise', amount: 480, is_allin: false },
          { player_id: 'real-villain-guid', action: 'Fold', amount: 0, is_allin: false },
          { player_id: 'real-whale-guid', action: 'Call', amount: 320, is_allin: false },
        ],
      },
      {
        street: 'Flop',
        cards: ['4s', 'Jc', '7d'],
        actions: [
          { player_id: 'real-hero-guid', action: 'Bet', amount: 929, is_allin: false },
          { player_id: 'real-whale-guid', action: 'Fold', amount: 0, is_allin: false },
        ],
      },
    ],
    pots: [{ amount: 1120, rake: 0, player_wins: [{ player_id: 'real-hero-guid', win_amount: 1120 }] }],
  },
});

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

  it('sanitizes GGPoker hand histories into package chunks without raw identifiers', () => {
    const pack = buildLocalContributionPackage({
      files: [
        { name: 'C:/Users/MICRO/Downloads/private-gg-export.txt', content: RAW_GGPOKER_HAND },
      ],
      heroName: 'Hero',
      appVersion: 'test-version',
      createdAt: new Date('2026-05-18T02:40:00Z'),
    });

    expect(pack.shareable).toBe(true);
    expect(pack.chunks).toHaveLength(1);
    expect(pack.chunks[0]).toMatchObject({
      id: 'chunk-1',
      sourceFileAlias: 'source-1.txt',
      site: 'ggpoker',
      type: 'hand_history',
      handCount: 1,
    });
    expect(pack.chunks[0]!.sanitizedText).toContain('Poker Hand #BR900000000001');
    expect(pack.chunks[0]!.sanitizedText).toContain('Tournament #800000000001');
    expect(pack.parserReport).toMatchObject({
      totalFiles: 1,
      sanitizedFiles: 1,
      unsupportedFiles: 0,
      handsFound: 1,
      confidence: 'high',
    });

    const serialized = JSON.stringify(pack);
    expect(serialized).not.toContain('BR1103011317');
    expect(serialized).not.toContain('279277562');
    expect(serialized).not.toContain('Private GG Table 59');
    expect(serialized).not.toContain('a81061d');
    expect(serialized).not.toContain('2026/04/18');
    expect(serialized).not.toContain('private-gg-export.txt');
  });

  it('sanitizes Open Hand History JSON into package chunks without raw identifiers', () => {
    const pack = buildLocalContributionPackage({
      files: [{ name: 'private-ohh-export.json', content: RAW_OHH_JSON }],
      heroName: 'scorza23',
      appVersion: 'test-version',
      createdAt: new Date('2026-05-18T02:45:00Z'),
    });

    expect(pack.shareable).toBe(true);
    expect(pack.chunks).toHaveLength(1);
    expect(pack.chunks[0]).toMatchObject({
      id: 'chunk-1',
      sourceFileAlias: 'source-1.txt',
      site: 'open_hand_history',
      type: 'hand_history',
      handCount: 1,
    });
    expect(pack.chunks[0]!.sanitizedText).toContain('900000000001');
    expect(pack.chunks[0]!.sanitizedText).toContain('800000000001');
    expect(pack.chunks[0]!.sanitizedText).toContain('Sanitized Table 1');
    expect(pack.chunks[0]!.sanitizedText).toContain('Hero');
    expect(pack.chunks[0]!.sanitizedText).toContain('Villain_1');

    const serialized = JSON.stringify(pack);
    expect(serialized).not.toContain('7948166852');
    expect(serialized).not.toContain('925681798');
    expect(serialized).not.toContain('Private Final 926126756');
    expect(serialized).not.toContain('real-hero-guid');
    expect(serialized).not.toContain('KnownReg99');
    expect(serialized).not.toContain('Whale Friend');
    expect(serialized).not.toContain('2018-05-25');
    expect(serialized).not.toContain('private-ohh-export.json');
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
