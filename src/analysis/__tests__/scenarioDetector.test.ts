import { describe, it, expect } from 'vitest';
import { detectScenario, buildHeroDecision } from '../scenarioDetector';
import { parsePokerStarsFile, type ParsedHand } from '../../parser/pokerstars';
import type { Action, Hand, PlayerInHand, Tournament } from '../../types/hand';
import {
  HAND_FULL_STREETS,
  HAND_PREFLOP_ONLY,
  HAND_HEADS_UP,
  HAND_BB_VS_RAISE,
  HAND_BB_VS_ALLIN,
  HAND_BLIND_WAR,
  HAND_WALK,
  HAND_NON_CONTIGUOUS,
  HAND_FACING_LIMP,
  HAND_WON_WITHOUT_SHOWING,
  HAND_3WAY_FLOP_WITH_ALLIN,
} from '../../test/fixtures/sample-hands';
import {
  makeAction as baseAction,
  makeHand as baseHand,
  makePlayer as basePlayer,
} from '../../test/factories';

function parseFirst(text: string) {
  const results = parsePokerStarsFile(text);
  return results[0]!;
}

function makeHand(overrides: Partial<Hand> = {}): Hand {
  return baseHand({
    id: 'advanced-spot-1',
    date: new Date('2026-05-31T12:00:00Z'),
    level: 16,
    smallBlind: 200,
    bigBlind: 400,
    ante: 50,
    activePlayers: 4,
    totalPot: 1200,
    heroChipsBefore: 4800,
    heroChipsAfter: 4800,
    ...overrides,
  });
}

function makePlayer(overrides: Partial<PlayerInHand> = {}): PlayerInHand {
  return basePlayer({
    handId: 'advanced-spot-1',
    playerName: 'Hero',
    chipsBefore: 4800,
    chipsAfter: 4800,
    holeCards: ['Ah', 'Kh'],
    ...overrides,
  });
}

function makeAction(overrides: Partial<Action> = {}): Action {
  return baseAction({
    handId: 'advanced-spot-1',
    playerName: 'Hero',
    sequence: 1,
    ...overrides,
  });
}

function makeParsedHand(
  overrides: {
    hand?: Partial<Hand>;
    players?: PlayerInHand[];
    actions?: Action[];
    tournament?: Partial<Tournament>;
  } = {},
): ParsedHand {
  const hand = makeHand(overrides.hand);
  const players = overrides.players ?? [makePlayer({ handId: hand.id })];
  const actions = overrides.actions ?? [
    makeAction({ handId: hand.id, playerName: 'Hero', actionType: 'raise', amount: 3200 }),
  ];

  return {
    hand,
    players,
    actions,
    tournament: {
      id: hand.tournamentId,
      name: '$10 Progressive KO',
      buyIn: 10,
      fee: 1,
      format: 'Progressive KO',
      ...overrides.tournament,
    },
    collectedAmounts: new Map(),
    showdownWinners: new Set(),
  };
}

describe('detectScenario', () => {
  it('detects RFI — folded to hero at UTG', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const hero = parsed.players.find((p) => p.isHero)!;
    const { scenario } = detectScenario(
      parsed.actions,
      parsed.players,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('RFI');
  });

  it('detects RFI — folded to hero at UTG (preflop only)', () => {
    const parsed = parseFirst(HAND_PREFLOP_ONLY);
    const hero = parsed.players.find((p) => p.isHero)!;
    const { scenario } = detectScenario(
      parsed.actions,
      parsed.players,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('RFI');
  });

  it('detects HU_BTN — heads-up, hero is BTN/SB', () => {
    const parsed = parseFirst(HAND_HEADS_UP);
    const hero = parsed.players.find((p) => p.isHero)!;
    const { scenario } = detectScenario(
      parsed.actions,
      parsed.players,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('HU_BTN');
  });

  it('detects BB_VS_RAISE — hero in BB facing normal 2x open', () => {
    const parsed = parseFirst(HAND_BB_VS_RAISE);
    const hero = parsed.players.find((p) => p.isHero)!;
    const { scenario } = detectScenario(
      parsed.actions,
      parsed.players,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('BB_VS_RAISE');
  });

  it('detects FACING_3BET — open + 3-bet before a non-blind hero (B4)', () => {
    const players = [
      makePlayer({ playerName: 'opener', position: 'UTG', isHero: false }),
      makePlayer({ playerName: 'threebettor', position: 'CO', isHero: false }),
      makePlayer({ playerName: 'Hero', position: 'HJ', isHero: true }),
    ];
    const actions = [
      makeAction({ playerName: 'opener', street: 'preflop', actionType: 'raise', amount: 800, sequence: 1 }),
      makeAction({ playerName: 'threebettor', street: 'preflop', actionType: 'raise', amount: 2400, sequence: 2 }),
      makeAction({ playerName: 'Hero', street: 'preflop', actionType: 'fold', amount: null, sequence: 3 }),
    ];
    const { scenario } = detectScenario(actions, players, 'Hero', 'HJ', 400, 6);
    expect(scenario).toBe('FACING_3BET');
  });

  it('detects FACING_RAISE — a single open is not a 3-bet spot', () => {
    const players = [
      makePlayer({ playerName: 'opener', position: 'CO', isHero: false }),
      makePlayer({ playerName: 'Hero', position: 'BTN', isHero: true }),
    ];
    const actions = [
      makeAction({ playerName: 'opener', street: 'preflop', actionType: 'raise', amount: 800, sequence: 1 }),
      makeAction({ playerName: 'Hero', street: 'preflop', actionType: 'fold', amount: null, sequence: 2 }),
    ];
    const { scenario } = detectScenario(actions, players, 'Hero', 'BTN', 400, 6);
    expect(scenario).toBe('FACING_RAISE');
  });

  it('detects BLIND_WAR — folded to SB', () => {
    const parsed = parseFirst(HAND_BLIND_WAR);
    const hero = parsed.players.find((p) => p.isHero)!;
    const { scenario } = detectScenario(
      parsed.actions,
      parsed.players,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('BLIND_WAR');
  });

  it('detects WALK — everyone folds to BB', () => {
    const parsed = parseFirst(HAND_WALK);
    const hero = parsed.players.find((p) => p.isHero)!;
    const { scenario } = detectScenario(
      parsed.actions,
      parsed.players,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('WALK');
  });

  it('detects FACING_LIMP — someone limped before hero', () => {
    const parsed = parseFirst(HAND_FACING_LIMP);
    const hero = parsed.players.find((p) => p.isHero)!;
    const { scenario } = detectScenario(
      parsed.actions,
      parsed.players,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('FACING_LIMP');
  });

  it('detects BB_VS_RAISE for non-contiguous seats', () => {
    // Hero is BB (seat 1), player3 (CO) raises
    const parsed = parseFirst(HAND_NON_CONTIGUOUS);
    const hero = parsed.players.find((p) => p.isHero)!;
    const { scenario } = detectScenario(
      parsed.actions,
      parsed.players,
      'scorza23',
      hero.position,
      parsed.hand.bigBlind,
      parsed.hand.activePlayers,
    );
    expect(scenario).toBe('BB_VS_RAISE');
  });

  describe('Bug prevention', () => {
    it('Bug #1: NEVER classifies fold facing a raise as RFI', () => {
      // Hero (seat 3, CO) faces an all-in from UTG (seat 1).
      // BTN=4, 6-max: UTG(1) shoves, HJ(2) folds, CO(3=hero) folds.
      // Hero should see FACING_ALL_IN, NOT RFI.
      const parsed = parseFirst(HAND_BB_VS_ALLIN);
      const hero = parsed.players.find((p) => p.isHero)!;
      expect(hero.position).toBe('CO');
      const { scenario } = detectScenario(
        parsed.actions,
        parsed.players,
        'scorza23',
        hero.position,
        parsed.hand.bigBlind,
        parsed.hand.activePlayers,
      );
      expect(scenario).toBe('FACING_ALL_IN');
    });

    it('Bug #2: BB facing all-in is BB_VS_LARGE_RAISE, not BB_VS_RAISE', () => {
      // Create a scenario where BB faces an all-in
      const parsed = parseFirst(HAND_BB_VS_ALLIN);
      // player6 is BB (seat 6, BTN=4: BTN(4), SB(5), BB(6))
      const { scenario } = detectScenario(
        parsed.actions,
        parsed.players,
        'player6',
        'BB',
        parsed.hand.bigBlind,
        parsed.hand.activePlayers,
      );
      expect(scenario).toBe('BB_VS_LARGE_RAISE');
    });
  });
});

describe('buildHeroDecision', () => {
  it('builds a decision for a standard RFI hand', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const decision = buildHeroDecision(parsed);
    expect(decision).not.toBeNull();
    expect(decision!.handId).toBe('260356646368');
    expect(decision!.position).toBe('UTG');
    expect(decision!.handKey).toBe('AKs');
    expect(decision!.scenario).toBe('RFI');
    expect(decision!.action).toBe('raise');
    expect(decision!.sawFlop).toBe(true);
    expect(decision!.wasPreFlopRaiser).toBe(true);
  });

  it('computes stackBb correctly', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const decision = buildHeroDecision(parsed);
    expect(decision!.stackBb).toBe(1600 / 50); // 32bb
  });

  it('detects c-bet opportunity and execution', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const decision = buildHeroDecision(parsed);
    expect(decision!.cbetOpportunity).toBe(true);
    expect(decision!.cbetMade).toBe(true);
  });

  it('uses preflop pot size for c-bet sizing analysis', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const decision = buildHeroDecision(parsed);
    const cbet = decision!.postflopActions?.find((a) => a.spot === 'CBET_HU');
    expect(cbet?.sizing).toBeCloseTo(66 / 265, 3);
  });

  it('does not create a c-bet opportunity when villain donk-bets before hero', () => {
    const parsed = parseFirst(`PokerStars Hand #260356800001: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level IV (50/100) - 2026/04/05 18:45:00 UTC [2026/04/05 14:45:00 ET]
Table '3989541132 1' 6-max Seat #1 is the button
Seat 1: scorza23 (3000 in chips)
Seat 2: player2 (3000 in chips)
Seat 3: player3 (3000 in chips)
Seat 4: player4 (3000 in chips)
Seat 5: player5 (3000 in chips)
Seat 6: player6 (3000 in chips)
player2: posts small blind 50
player3: posts big blind 100
*** HOLE CARDS ***
Dealt to scorza23 [Ah Kh]
scorza23: raises 100 to 200
player2: folds
player3: calls 100
*** FLOP *** [Ad 7d 2c]
player3: bets 250
scorza23: calls 250
*** SUMMARY ***
Total pot 950 | Rake 0
Board [Ad 7d 2c]
Seat 1: scorza23 (button) folded on the Flop
Seat 3: player3 (big blind) collected (950)
`);
    const decision = buildHeroDecision(parsed);
    expect(decision!.sawFlop).toBe(true);
    expect(decision!.wasPreFlopRaiser).toBe(true);
    expect(decision!.cbetOpportunity).toBe(false);
    expect(decision!.cbetMade).toBe(false);
    expect(decision!.postflopActions?.some((a) => a.spot === 'MISSED_CBET')).toBe(false);
  });

  it('handles preflop-only hand (no flop)', () => {
    const parsed = parseFirst(HAND_PREFLOP_ONLY);
    const decision = buildHeroDecision(parsed);
    expect(decision!.sawFlop).toBe(false);
    expect(decision!.cbetOpportunity).toBe(false);
  });

  it('does not analyze postflop missed c-bet spots after hero folded preflop', () => {
    const parsed = parseFirst(`PokerStars Hand #260356800002: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level IV (50/100) - 2026/04/05 18:45:00 UTC [2026/04/05 14:45:00 ET]
Table '3989541132 1' 6-max Seat #1 is the button
Seat 1: scorza23 (3000 in chips)
Seat 2: player2 (3000 in chips)
Seat 3: player3 (3000 in chips)
Seat 4: player4 (3000 in chips)
Seat 5: player5 (3000 in chips)
Seat 6: player6 (3000 in chips)
player2: posts small blind 50
player3: posts big blind 100
*** HOLE CARDS ***
Dealt to scorza23 [Ah Kh]
scorza23: raises 100 to 200
player2: raises 450 to 650
player3: folds
scorza23: folds
*** FLOP *** [Ad 7d 2c]
player2: bets 400
*** SUMMARY ***
Total pot 1050 | Rake 0
Board [Ad 7d 2c]
Seat 1: scorza23 (button) folded before Flop
Seat 2: player2 (small blind) collected (1050)
`);
    const decision = buildHeroDecision(parsed);
    expect(decision!.sawFlop).toBe(false);
    expect(decision!.wasPreFlopRaiser).toBe(true);
    expect(decision!.cbetOpportunity).toBe(false);
    expect(decision!.postflopActions).toHaveLength(0);
  });

  it('detects hero fold action', () => {
    const parsed = parseFirst(HAND_BB_VS_ALLIN);
    const decision = buildHeroDecision(parsed);
    expect(decision!.action).toBe('fold');
  });

  it('handles heads-up canonical key', () => {
    const parsed = parseFirst(HAND_HEADS_UP);
    const decision = buildHeroDecision(parsed);
    expect(decision!.handKey).toBe('98s'); // 9c 8c -> 98s
    expect(decision!.position).toBe('BTN/SB');
  });

  it('returns null if hero has no hole cards', () => {
    const parsed = parseFirst(HAND_BB_VS_ALLIN);
    // player2 folds and never shows cards — no hole cards available
    const decision = buildHeroDecision(parsed, 'player2');
    expect(decision).toBeNull();
  });

  it('handles walk (BB with no action needed)', () => {
    const parsed = parseFirst(HAND_WALK);
    const decision = buildHeroDecision(parsed);
    expect(decision).not.toBeNull();
    expect(decision!.scenario).toBe('WALK');
  });

  it('stubs compliance fields', () => {
    const parsed = parseFirst(HAND_FULL_STREETS);
    const decision = buildHeroDecision(parsed);
    expect(decision!.isCompliant).toBe(false);
    expect(decision!.deviationType).toBeNull();
  });

  it('attaches bounty context for progressive KO hands', () => {
    const hand = makeHand({ id: 'bounty-spot', level: 7, activePlayers: 6, maxSeats: 9, totalPot: 1600 });
    const villain = makePlayer({
      handId: hand.id,
      playerName: 'Villain',
      seatNumber: 2,
      chipsBefore: 3000,
      chipsAfter: 3000,
      position: 'HJ',
      isHero: false,
      holeCards: null,
    });
    const hero = makePlayer({ handId: hand.id, chipsBefore: 5000, chipsAfter: 5000, position: 'CO' });
    const parsed = makeParsedHand({
      hand,
      players: [villain, hero],
      actions: [
        makeAction({ handId: hand.id, playerName: 'Villain', actionType: 'raise', amount: 800, sequence: 1 }),
        makeAction({ handId: hand.id, playerName: 'Hero', actionType: 'call', amount: 800, sequence: 2 }),
      ],
    });

    const decision = buildHeroDecision(parsed, 'Hero');

    expect(decision!.bountyContext).toMatchObject({
      tournamentType: 'progressive_ko',
      heroCoversVillain: true,
      stageAdjustment: 'mid',
    });
    expect(decision!.bountyContext!.equityDrop).toBeGreaterThan(0);
  });

  it('attaches fake shove context for final table large non-all-in raises', () => {
    const hand = makeHand({ id: 'fake-shove-spot', level: 16, activePlayers: 4, maxSeats: 9, bigBlind: 400 });
    const hero = makePlayer({ handId: hand.id, chipsBefore: 4800, chipsAfter: 4800, position: 'BTN' });
    const parsed = makeParsedHand({
      hand,
      players: [
        hero,
        makePlayer({ handId: hand.id, playerName: 'SB', seatNumber: 2, chipsBefore: 5200, position: 'SB', isHero: false, holeCards: null }),
        makePlayer({ handId: hand.id, playerName: 'BB', seatNumber: 3, chipsBefore: 7000, position: 'BB', isHero: false, holeCards: null }),
      ],
      actions: [
        makeAction({ handId: hand.id, playerName: 'Hero', actionType: 'raise', amount: 3200, sequence: 1, isAllIn: false }),
      ],
      tournament: { name: '$20 Freezeout', format: '9-max', buyIn: 20 },
    });

    const decision = buildHeroDecision(parsed, 'Hero');

    expect(decision!.icmStage).toBe('final_table');
    expect(decision!.fakeShoveSpot).toMatchObject({
      handId: hand.id,
      heroPosition: 'BTN',
      isFakeShove: true,
      raiseSize: 3200,
    });
  });

  it('attaches resteal context for final table late-position defense', () => {
    const hand = makeHand({ id: 'resteal-spot', level: 16, activePlayers: 4, maxSeats: 9, bigBlind: 400 });
    const opener = makePlayer({
      handId: hand.id,
      playerName: 'ChipLeader',
      seatNumber: 1,
      chipsBefore: 20000,
      position: 'CO',
      isHero: false,
      holeCards: null,
    });
    const hero = makePlayer({
      handId: hand.id,
      seatNumber: 4,
      chipsBefore: 6000,
      chipsAfter: 6000,
      position: 'BB',
    });
    const parsed = makeParsedHand({
      hand,
      players: [
        opener,
        makePlayer({ handId: hand.id, playerName: 'BTN', seatNumber: 2, chipsBefore: 4500, position: 'BTN', isHero: false, holeCards: null }),
        makePlayer({ handId: hand.id, playerName: 'SB', seatNumber: 3, chipsBefore: 3000, position: 'SB', isHero: false, holeCards: null }),
        hero,
      ],
      actions: [
        makeAction({ handId: hand.id, playerName: 'ChipLeader', actionType: 'raise', amount: 800, sequence: 1 }),
        makeAction({ handId: hand.id, playerName: 'BTN', actionType: 'fold', sequence: 2 }),
        makeAction({ handId: hand.id, playerName: 'SB', actionType: 'fold', sequence: 3 }),
        makeAction({ handId: hand.id, playerName: 'Hero', actionType: 'raise', amount: 6000, sequence: 4, isAllIn: true }),
      ],
      tournament: { name: '$20 Final Table', format: '9-max', buyIn: 20 },
    });

    const decision = buildHeroDecision(parsed, 'Hero');

    expect(decision!.icmStage).toBe('final_table');
    expect(decision!.restealSpot).toMatchObject({
      handId: hand.id,
      heroPosition: 'BB',
      villainStackType: 'chip_leader',
      heroAction: 'resteal',
    });
  });

  describe('W$SD detection', () => {
    it('sets wonAtShowdown=false when hero wins pot without showing (Bug #7 regression)', () => {
      // Hero reaches showdown (*** SHOW DOWN *** section present) and collects
      // the pot after villain shows a losing hand, but hero mucks — no
      // "showed [cards] and won" line for hero in SUMMARY. Current buggy
      // behaviour: wonAmount > 0 inflates W$SD. Expected: W$SD = false.
      const parsed = parseFirst(HAND_WON_WITHOUT_SHOWING);
      expect(parsed.hand.hasShowdown).toBe(true);
      expect(parsed.collectedAmounts.get('scorza23')).toBeGreaterThan(0);
      expect(parsed.showdownWinners.has('scorza23')).toBe(false);

      const decision = buildHeroDecision(parsed);
      expect(decision!.wentToShowdown).toBe(true);
      expect(decision!.wonAmount).toBeGreaterThan(0);
      expect(decision!.wonAtShowdown).toBe(false);
    });

    it('treats a flop as HU when the 3rd player is all-in preflop (H14 regression)', () => {
      // Three players technically reach the flop, but one is all-in preflop
      // with no chips behind. For c-bet "HU on flop" semantics, only count
      // players who can actually act on the flop — so hero's c-bet is a CBET_HU
      // spot, not multiway.
      const parsed = parseFirst(HAND_3WAY_FLOP_WITH_ALLIN);
      const decision = buildHeroDecision(parsed);
      expect(decision).not.toBeNull();
      expect(decision!.wasPreFlopRaiser).toBe(true);
      expect(decision!.sawFlop).toBe(true);
      expect(decision!.cbetOpportunity).toBe(true);
      expect(decision!.cbetMade).toBe(true);
      // Hero c-bets first (out of position), so the HU c-bet counter (which is
      // gated on hero being IN POSITION, B1) does not count this spot...
      expect(decision!.cbetHU).toBe(false);
      // ...but the all-in 3rd player is still excluded, so this is detected as a
      // heads-up c-bet, not a multiway one.
      expect(decision!.postflopActions?.some((s) => s.spot === 'CBET_HU')).toBe(true);
      expect(decision!.postflopActions?.some((s) => s.spot === 'CBET_MULTIWAY')).toBe(false);
    });

    it('counts cbetHU when hero c-bets in position (B1)', () => {
      // HU: hero is BTN/SB (acts last postflop = in position). Villain (BB)
      // checks, hero c-bets → this is a genuine HU IP c-bet opportunity.
      const ipHand = `PokerStars Hand #260356700002: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level V (50/100) - 2026/04/05 19:10:00 UTC [2026/04/05 15:10:00 ET]
Table '3989541132 1' 2-max Seat #1 is the button
Seat 1: scorza23 (1500 in chips)
Seat 2: villain (1500 in chips)
scorza23: posts small blind 50
villain: posts big blind 100
*** HOLE CARDS ***
Dealt to scorza23 [Ah Kh]
scorza23: raises 100 to 200
villain: calls 100
*** FLOP *** [2c 7d Th]
villain: checks
scorza23: bets 100
villain: folds
scorza23 collected 400 from pot
*** SUMMARY ***
Total pot 400 | Rake 0
Board [2c 7d Th]
Seat 1: scorza23 (button) collected (400)
Seat 2: villain (big blind) folded on the Flop`;
      const decision = buildHeroDecision(parseFirst(ipHand));
      expect(decision).not.toBeNull();
      expect(decision!.cbetOpportunity).toBe(true);
      expect(decision!.cbetHU).toBe(true);
      expect(decision!.cbetMade).toBe(true);
    });

    it('sets wonAtShowdown=true when hero explicitly "showed and won"', () => {
      // Sanity check: the reverse case — hero in "showed [cards] and won"
      // line in SUMMARY — must still count as W$SD.
      const parsed = parseFirst(HAND_BB_VS_ALLIN);
      expect(parsed.showdownWinners.has('player6')).toBe(true);

      const decision = buildHeroDecision(parsed, 'player6');
      expect(decision!.wentToShowdown).toBe(true);
      expect(decision!.wonAtShowdown).toBe(true);
    });
  });

  describe('double barrel gating (B3)', () => {
    // HU: hero is BTN/SB and the preflop raiser; villain (BB) calls. Only the
    // flop/turn action varies between cases.
    const barrelHand = (flopTurn: string) => `PokerStars Hand #260356710000: Tournament #3989541132, $0.85+$0.15 USD Hold'em No Limit - Level V (50/100) - 2026/04/05 20:00:00 UTC [2026/04/05 16:00:00 ET]
Table '3989541132 1' 2-max Seat #1 is the button
Seat 1: scorza23 (3000 in chips)
Seat 2: villain (3000 in chips)
scorza23: posts small blind 50
villain: posts big blind 100
*** HOLE CARDS ***
Dealt to scorza23 [Ah Kh]
scorza23: raises 100 to 200
villain: calls 100
${flopTurn}
*** SHOW DOWN ***
scorza23: shows [Ah Kh] (high card Ace)
villain: shows [Qd Jd] (high card Queen)
scorza23 collected 600 from pot
*** SUMMARY ***
Total pot 600 | Rake 0`;

    it('counts an opportunity for a called c-bet then a checked turn', () => {
      const hand = barrelHand(`*** FLOP *** [2c 7d Th]
villain: checks
scorza23: bets 100
villain: calls 100
*** TURN *** [2c 7d Th] [3s]
villain: checks
scorza23: checks`);
      const decision = buildHeroDecision(parseFirst(hand));
      expect(decision!.cbetMade).toBe(true);
      expect(decision!.doubleBarrelOpportunity).toBe(true);
      expect(decision!.doubleBarrelMade).toBe(false);
    });

    it('counts a made double barrel when hero bets the turn', () => {
      const hand = barrelHand(`*** FLOP *** [2c 7d Th]
villain: checks
scorza23: bets 100
villain: calls 100
*** TURN *** [2c 7d Th] [3s]
villain: checks
scorza23: bets 200`);
      const decision = buildHeroDecision(parseFirst(hand));
      expect(decision!.doubleBarrelOpportunity).toBe(true);
      expect(decision!.doubleBarrelMade).toBe(true);
    });

    it('does not count an opportunity when the c-bet was check-raised (B3)', () => {
      const hand = barrelHand(`*** FLOP *** [2c 7d Th]
villain: checks
scorza23: bets 100
villain: raises 200 to 300
scorza23: calls 200
*** TURN *** [2c 7d Th] [3s]
villain: checks
scorza23: checks`);
      const decision = buildHeroDecision(parseFirst(hand));
      expect(decision!.cbetMade).toBe(true);
      expect(decision!.doubleBarrelOpportunity).toBe(false);
    });
  });
});
