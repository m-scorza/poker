import { describe, expect, it } from 'vitest';
import { buildSpotPacketFromParsedHand, buildStudyQueueSpotPacketBundle } from '../spotPacket';
import type { ParsedHand } from '../../parser/pokerstars';
import type { HeroDecision } from '../../types/analysis';
import type { StudyQueueItem } from '../studyPlan';

const makeParsedHand = (): ParsedHand => ({
  hand: {
    id: '9001',
    tournamentId: 'T-77',
    date: new Date('2026-05-18T12:00:00Z'),
    level: 4,
    smallBlind: 50,
    bigBlind: 100,
    ante: 12,
    maxSeats: 6,
    activePlayers: 4,
    buttonSeat: 3,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 650,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: 2_200,
    heroChipsAfter: 1_950,
    villainDeltas: [],
  },
  players: [
    { handId: '9001', seatNumber: 1, playerName: 'VillainA', chipsBefore: 3_000, position: 'CO', isHero: false, holeCards: null },
    { handId: '9001', seatNumber: 3, playerName: 'VillainB', chipsBefore: 1_800, position: 'BTN', isHero: false, holeCards: null },
    { handId: '9001', seatNumber: 4, playerName: 'Hero', chipsBefore: 2_200, position: 'SB', isHero: true, holeCards: ['As', 'Kd'] },
    { handId: '9001', seatNumber: 5, playerName: 'VillainC', chipsBefore: 1_100, position: 'BB', isHero: false, holeCards: null },
  ],
  actions: [
    { handId: '9001', street: 'preflop', playerName: 'VillainA', actionType: 'post_ante', amount: 12, isAllIn: false, sequence: 1 },
    { handId: '9001', street: 'preflop', playerName: 'Hero', actionType: 'post_sb', amount: 50, isAllIn: false, sequence: 2 },
    { handId: '9001', street: 'preflop', playerName: 'VillainC', actionType: 'post_bb', amount: 100, isAllIn: false, sequence: 3 },
    { handId: '9001', street: 'preflop', playerName: 'VillainA', actionType: 'raise', amount: 250, isAllIn: false, sequence: 4 },
    { handId: '9001', street: 'preflop', playerName: 'Hero', actionType: 'call', amount: 200, isAllIn: false, sequence: 5 },
  ],
  tournament: {
    id: 'T-77',
    name: 'Example MTT',
    buyIn: 11,
    fee: 1,
    finishPosition: null,
    prize: null,
    bounty: null,
    handsPlayed: 1,
  },
  collectedAmounts: new Map(),
  showdownWinners: new Set(),
});

function makeParsedHandForId(handId: string): ParsedHand {
  const parsedHand = makeParsedHand();
  return {
    ...parsedHand,
    hand: { ...parsedHand.hand, id: handId },
    players: parsedHand.players.map((player) => ({ ...player, handId })),
    actions: parsedHand.actions.map((action) => ({ ...action, handId })),
    collectedAmounts: new Map(Array.from(parsedHand.collectedAmounts.entries())),
    showdownWinners: new Set(Array.from(parsedHand.showdownWinners)),
  };
}

function makeBbMultiwayParsedHand(): ParsedHand {
  const parsedHand = makeParsedHand();
  return {
    ...parsedHand,
    players: [
      { handId: '9001', seatNumber: 1, playerName: 'VillainA', chipsBefore: 3_000, position: 'CO', isHero: false, holeCards: null },
      { handId: '9001', seatNumber: 3, playerName: 'VillainB', chipsBefore: 1_800, position: 'BTN', isHero: false, holeCards: null },
      { handId: '9001', seatNumber: 4, playerName: 'VillainD', chipsBefore: 2_200, position: 'SB', isHero: false, holeCards: null },
      { handId: '9001', seatNumber: 5, playerName: 'Hero', chipsBefore: 1_100, position: 'BB', isHero: true, holeCards: ['7s', '2s'] },
    ],
    actions: [
      { handId: '9001', street: 'preflop', playerName: 'VillainA', actionType: 'raise', amount: 250, isAllIn: false, sequence: 1 },
      { handId: '9001', street: 'preflop', playerName: 'VillainB', actionType: 'call', amount: 250, isAllIn: false, sequence: 2 },
      { handId: '9001', street: 'preflop', playerName: 'VillainD', actionType: 'fold', amount: null, isAllIn: false, sequence: 3 },
      { handId: '9001', street: 'preflop', playerName: 'Hero', actionType: 'fold', amount: null, isAllIn: false, sequence: 4 },
    ],
  };
}

function makeMultiwayAllInParsedHand(): ParsedHand {
  const parsedHand = makeParsedHand();
  return {
    ...parsedHand,
    hand: {
      ...parsedHand.hand,
      totalPot: 3_250,
    },
    players: [
      { handId: '9001', seatNumber: 1, playerName: 'VillainA', chipsBefore: 1_000, position: 'CO', isHero: false, holeCards: null },
      { handId: '9001', seatNumber: 3, playerName: 'VillainB', chipsBefore: 950, position: 'BTN', isHero: false, holeCards: null },
      { handId: '9001', seatNumber: 4, playerName: 'Hero', chipsBefore: 2_200, position: 'SB', isHero: true, holeCards: ['As', 'Kd'] },
      { handId: '9001', seatNumber: 5, playerName: 'VillainC', chipsBefore: 1_100, position: 'BB', isHero: false, holeCards: null },
    ],
    actions: [
      { handId: '9001', street: 'preflop', playerName: 'VillainA', actionType: 'raise', amount: 1_000, isAllIn: true, sequence: 1 },
      { handId: '9001', street: 'preflop', playerName: 'VillainB', actionType: 'call', amount: 950, isAllIn: true, sequence: 2 },
      { handId: '9001', street: 'preflop', playerName: 'Hero', actionType: 'call', amount: 1_000, isAllIn: false, sequence: 3 },
    ],
  };
}

const makeDecision = (): HeroDecision => ({
  handId: '9001',
  position: 'SB',
  handKey: 'AKs',
  stackBb: 22,
  scenario: 'FACING_RAISE',
  action: 'call',
  isCompliant: false,
  deviationType: null,
  sawFlop: false,
  wasPreFlopRaiser: false,
  cbetOpportunity: false,
  cbetMade: false,
  cbetHU: false,
  doubleBarrelOpportunity: false,
  doubleBarrelMade: false,
  wentToShowdown: false,
  wonAtShowdown: false,
  wonAmount: 0,
  icmStage: 'mid',
  squeezeSpot: null,
  netProfit: -250,
  openerPosition: 'CO',
});

function makeBountyContext(
  overrides: Partial<NonNullable<HeroDecision['bountyContext']>> = {},
): NonNullable<HeroDecision['bountyContext']> {
  return {
    tournamentType: 'progressive_ko',
    equityDrop: 8.5,
    heroCoversVillain: true,
    bountyRatio: 0.5,
    stageAdjustment: 'late',
    note: 'Directional BPWR estimate only.',
    ...overrides,
  };
}

function makeDecisionForHand(handId: string, overrides: Partial<HeroDecision> = {}): HeroDecision {
  return { ...makeDecision(), handId, ...overrides };
}

function makeQueueItem(overrides: Partial<StudyQueueItem> = {}): StudyQueueItem {
  return {
    id: 'deviation-BB_FOLD_SUITED',
    title: 'Folded suited BB defense',
    source: 'deviation',
    severity: 'high',
    priorityScore: 92,
    sampleSize: 3,
    estimatedBbLoss: 12,
    confidence: 'low',
    evidence: {
      kind: 'tagged_decisions',
      label: 'Tagged decision cluster',
      details: ['3 tagged decisions'],
      trust: { kind: 'unsupported', citations: [] },
    },
    handIds: ['9002', '9001', 'missing-hand'],
    cta: 'Review hand queue',
    explanation: 'Review these hands as a local study packet bundle.',
    ...overrides,
  };
}

describe('SpotPacket builder', () => {
  it('builds a local study packet with source metadata and no solver-backed claim', () => {
    const packet = buildSpotPacketFromParsedHand(makeParsedHand(), makeDecision(), {
      createdAt: '2026-06-28T12:00:00.000Z',
      source: {
        site: 'pokerstars',
        fileType: 'hand_history',
        accessMethod: 'local_file',
        parserConfidence: 'high',
      },
    });

    expect(packet.schemaVersion).toBe('spot-packet/v1');
    expect(packet.source).toMatchObject({
      handId: '9001',
      site: 'pokerstars',
      fileType: 'hand_history',
      accessMethod: 'local_file',
      parserConfidence: 'high',
      localOnly: true,
    });
    expect(packet.evidenceLabel).toBe('study_packet_only');
    expect(packet.warnings).toContain('not_solver_backed');
    expect(packet.warnings).toContain('legal_action_menu_inferred');
    expect(packet.warnings).toContain('trainer_scoring_not_included');
    expect(packet.hero).toMatchObject({ position: 'SB', handKey: 'AKs', action: 'call' });
    expect(packet.players.map((player) => player.position)).toEqual(['CO', 'BTN', 'SB', 'BB']);
    expect(packet.trainerPrompt).toMatchObject({
      source: 'parsed_hand',
      scoring: { status: 'not_included', supportsMixedActions: true },
    });
    expect(packet.trainerPrompt.legalActions.map((action) => action.action)).toEqual(['fold', 'call', 'raise', 'all_in']);
    expect(packet.trainerPrompt.legalActions.find((action) => action.action === 'call')).toMatchObject({
      id: 'call-2bb',
      label: 'Call 2 BB',
      amountChips: 200,
      amountBb: 2,
      source: 'observed_hero_action',
    });
    expect(packet.trainerPrompt.legalActions.find((action) => action.action === 'raise')).toMatchObject({
      label: 'Raise',
      amountChips: null,
      source: 'scenario_inferred',
    });
  });

  it('uses persisted hand import source metadata when no explicit packet source is passed', () => {
    const parsedHand = makeParsedHand();
    parsedHand.hand.importSource = {
      site: 'pokerstars',
      fileType: 'hand_history',
      accessMethod: 'local_file',
      parserConfidence: 'high',
    };

    const packet = buildSpotPacketFromParsedHand(parsedHand, makeDecision(), {
      createdAt: '2026-06-28T12:00:00.000Z',
    });

    expect(packet.source).toMatchObject({
      handId: '9001',
      site: 'pokerstars',
      fileType: 'hand_history',
      accessMethod: 'local_file',
      parserConfidence: 'high',
      localOnly: true,
    });
  });

  it('accepts neutral trainer-config action menus without scoring answers', () => {
    const packet = buildSpotPacketFromParsedHand(makeParsedHand(), makeDecision(), {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
      trainerPrompt: {
        source: 'trainer_config',
        sourceId: 'S-AUTH-REGLIFE-005',
        configId: 'vsOPEN-UTG1-UTG-redacted',
        legalActions: [
          { action: 'fold', label: 'FOLD' },
          { action: 'call', label: 'CALL' },
          { action: 'raise', label: 'RAISE 5', amountChips: 500 },
          { action: 'raise', label: 'RAISE 6', amountChips: 600 },
          { action: 'all_in', label: 'ALL-IN' },
        ],
      },
    });

    expect(packet.trainerPrompt).toMatchObject({
      source: 'trainer_config',
      sourceId: 'S-AUTH-REGLIFE-005',
      configId: 'vsOPEN-UTG1-UTG-redacted',
      scoring: { status: 'not_included', supportsMixedActions: true },
    });
    expect(packet.trainerPrompt.legalActions.map((action) => action.label)).toEqual([
      'FOLD',
      'CALL',
      'RAISE 5',
      'RAISE 6',
      'ALL-IN',
    ]);
    expect(packet.trainerPrompt.legalActions.find((action) => action.label === 'RAISE 5')).toMatchObject({
      id: 'raise-5bb',
      amountChips: 500,
      amountBb: 5,
      source: 'trainer_config',
    });
    expect(packet.trainerPrompt.legalActions.every((action) => action.source === 'trainer_config')).toBe(true);
    expect(packet.warnings).not.toContain('legal_action_menu_inferred');
    expect(packet.warnings).toContain('trainer_scoring_not_included');
  });

  it('adds ICM missing-context warnings when tournament pressure needs payout data', () => {
    const decision = { ...makeDecision(), icmStage: 'final_table' as const };

    const packet = buildSpotPacketFromParsedHand(makeParsedHand(), decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
    });

    expect(packet.warnings).toEqual(expect.arrayContaining([
      'missing_payouts',
      'missing_players_remaining',
      'missing_paid_places',
      'missing_field_stack_distribution',
      'icm_risk_context_estimated',
      'source_summary_missing',
      'not_solver_backed',
    ]));
  });

  it('adds PKO missing-context warnings without solver-backed claims', () => {
    const decision = { ...makeDecision(), bountyContext: makeBountyContext() };

    const packet = buildSpotPacketFromParsedHand(makeParsedHand(), decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
    });

    expect(packet.evidenceLabel).toBe('study_packet_only');
    expect(packet.warnings).toEqual(expect.arrayContaining([
      'missing_bounty_context',
      'opponent_bounty_values_unknown',
      'pko_coverage_context_partial',
      'not_solver_backed',
      'trainer_scoring_not_included',
    ]));
    expect(packet.warnings).not.toContain('multi_bounty_context_missing');
  });

  it('records sanitized payout-table presence and clears payout/pay-jump warnings only for that context', () => {
    const decision = {
      ...makeDecision(),
      icmStage: 'final_table' as const,
      bountyContext: makeBountyContext(),
    };

    const packet = buildSpotPacketFromParsedHand(makeParsedHand(), decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
      tournamentContext: {
        playersRemaining: 4,
        paidPlaces: 3,
        payoutTable: {
          source: 'manual_entry',
          valuesAvailable: true,
          valuesIncluded: false,
        },
      },
    });

    expect(packet.tournament?.payoutTable).toEqual({
      source: 'manual_entry',
      valuesAvailable: true,
      valuesIncluded: false,
    });
    expect(packet.tournament?.payouts).toBeUndefined();
    expect(packet.warnings).not.toContain('missing_payouts');
    expect(packet.warnings).not.toContain('missing_players_remaining');
    expect(packet.warnings).not.toContain('missing_paid_places');
    expect(packet.warnings).not.toContain('missing_field_stack_distribution');
    expect(packet.warnings).not.toContain('pko_pay_jump_context_missing');
    expect(packet.warnings).toContain('opponent_bounty_values_unknown');
    expect(packet.warnings).toContain('missing_bounty_context');
    expect(packet.warnings).toContain('icm_risk_context_estimated');
    expect(packet.evidenceLabel).toBe('study_packet_only');
  });

  it('requires opponent bounty-table presence before clearing PKO bounty-value warnings', () => {
    const decision = { ...makeDecision(), bountyContext: makeBountyContext() };
    const payoutContext = {
      playersRemaining: 4,
      paidPlaces: 3,
      payoutTable: {
        source: 'manual_entry' as const,
        valuesAvailable: true as const,
        valuesIncluded: false,
      },
    };

    const withoutBountyTable = buildSpotPacketFromParsedHand(makeParsedHand(), decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
      tournamentContext: payoutContext,
    });
    const withBountyTable = buildSpotPacketFromParsedHand(makeParsedHand(), decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
      tournamentContext: {
        ...payoutContext,
        opponentBountyTable: {
          source: 'imported_summary',
          valuesAvailable: true,
          valuesIncluded: false,
          playerCount: 4.8,
        },
      },
    });

    expect(withoutBountyTable.warnings).toContain('opponent_bounty_values_unknown');
    expect(withoutBountyTable.warnings).toContain('missing_bounty_context');
    expect(withBountyTable.tournament?.opponentBountyTable).toEqual({
      source: 'imported_summary',
      valuesAvailable: true,
      valuesIncluded: false,
      playerCount: 4,
    });
    expect(withBountyTable.warnings).not.toContain('opponent_bounty_values_unknown');
    expect(withBountyTable.warnings).not.toContain('missing_bounty_context');
    expect(withBountyTable.warnings).toContain('pko_coverage_context_partial');
    expect(withBountyTable.warnings).toContain('not_solver_backed');
  });

  it('adds a sanitized external-review checklist for HRC without attaching solver output', () => {
    const decision = {
      ...makeDecision(),
      icmStage: 'final_table' as const,
      bountyContext: makeBountyContext(),
    };

    const packet = buildSpotPacketFromParsedHand(makeParsedHand(), decision, {
      target: 'hrc',
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
      tournamentContext: {
        playersRemaining: 9,
        paidPlaces: 3,
        payoutTable: {
          source: 'manual_entry',
          valuesAvailable: true,
          valuesIncluded: false,
        },
      },
    });

    expect(packet.target).toBe('hrc');
    expect(packet.evidenceLabel).toBe('study_packet_only');
    expect(packet.externalReview).toMatchObject({
      status: 'not_submitted',
      target: 'hrc',
      targetLabel: 'HoldemResources Calculator (HRC)',
      packetHash: packet.inputHash,
      targetHints: [
        {
          family: 'tournament_icm_push_fold',
          targets: ['hrc', 'icmizer'],
          targetLabels: ['HoldemResources Calculator (HRC)', 'ICMIZER'],
          reason: 'icm_pko_or_all_in_preflop',
          status: 'suggested_only',
        },
      ],
      result: {
        status: 'not_attached',
        evidenceLabel: 'study_packet_only',
        solverBacked: false,
      },
    });
    expect(packet.externalReview?.assumptions.present).toEqual(expect.arrayContaining([
      'source_metadata',
      'blinds_and_antes',
      'hero_cards',
      'table_stacks',
      'action_path',
      'payout_table',
      'players_remaining',
      'paid_places',
    ]));
    expect(packet.externalReview?.assumptions.missing).toEqual(expect.arrayContaining([
      'field_stack_distribution',
      'opponent_bounty_table',
      'range_assumptions',
      'tree_configuration',
      'calculation_model',
    ]));
    expect(packet.warnings).toEqual(expect.arrayContaining([
      'not_solver_backed',
      'external_tool_required',
      'tree_configuration_required',
      'range_assumptions_unknown',
      'opponent_bounty_values_unknown',
      'missing_field_stack_distribution',
    ]));
    expect(JSON.stringify(packet)).not.toContain('solverEV');
    expect(JSON.stringify(packet)).not.toContain('VillainA');
    expect(JSON.stringify(packet)).not.toContain('VillainB');
  });

  it('adds suggested-only target hints for postflop tree review without solver output', () => {
    const parsedHand = makeParsedHand();
    parsedHand.hand.boardFlop = ['Qs', '7d', '2c'];
    parsedHand.actions.push(
      { handId: '9001', street: 'flop', playerName: 'Hero', actionType: 'bet', amount: 200, isAllIn: false, sequence: 6 },
    );
    const decision = { ...makeDecision(), cbetOpportunity: true, cbetMade: true };

    const packet = buildSpotPacketFromParsedHand(parsedHand, decision, {
      createdAt: '2026-07-02T12:00:00.000Z',
      externalReview: { enabled: true },
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
    });

    expect(packet.target).toBe('generic');
    expect(packet.evidenceLabel).toBe('study_packet_only');
    expect(packet.externalReview?.targetHints).toEqual([
      {
        family: 'postflop_tree_review',
        targets: ['gto_wizard', 'postflopizer'],
        targetLabels: ['GTO Wizard', 'Postflopizer'],
        reason: 'postflop_tree_or_line_review',
        status: 'suggested_only',
      },
    ]);
    expect(packet.externalReview?.result).toMatchObject({
      status: 'not_attached',
      evidenceLabel: 'study_packet_only',
      solverBacked: false,
    });
    expect(JSON.stringify(packet)).not.toContain('solverEV');
    expect(JSON.stringify(packet)).not.toContain('VillainA');
  });

  it('flags multi-bounty all-in PKO packets as missing context instead of solved output', () => {
    const decision = {
      ...makeDecision(),
      scenario: 'FACING_ALL_IN' as const,
      action: 'call' as const,
      bountyContext: makeBountyContext({ equityDrop: 14 }),
    };

    const packet = buildSpotPacketFromParsedHand(makeMultiwayAllInParsedHand(), decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
    });

    expect(packet.evidenceLabel).toBe('study_packet_only');
    expect(packet.trainerPrompt.scoring.status).toBe('not_included');
    expect(packet.warnings).toEqual(expect.arrayContaining([
      'opponent_bounty_values_unknown',
      'pko_coverage_context_partial',
      'multi_bounty_context_missing',
      'not_solver_backed',
    ]));
    expect(packet.reviewQuestion.ask).toBe('external_review');
  });

  it('adds table-stack risk context without claiming exact risk premium', () => {
    const decision = { ...makeDecision(), icmStage: 'final_table' as const };

    const packet = buildSpotPacketFromParsedHand(makeParsedHand(), decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
    });

    expect(packet.riskContext).toMatchObject({
      source: 'table_stacks_only',
      exactRiskPremium: false,
      heroStackBb: 22,
      openerStackBb: 30,
      effectiveStackBb: 22,
      heroStackRank: 2,
      knownStackCount: 4,
      shortestKnownStackBb: 11,
      riskRelationship: 'opener_covers_hero',
    });
    expect(packet.warnings).not.toContain('risk_advantage_unknown');
  });

  it('warns when ICM risk advantage cannot be inferred from the opener stack', () => {
    const decision = { ...makeDecision(), icmStage: 'bubble' as const, openerPosition: null };

    const packet = buildSpotPacketFromParsedHand(makeParsedHand(), decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
    });

    expect(packet.riskContext?.riskRelationship).toBe('unknown');
    expect(packet.warnings).toContain('risk_advantage_unknown');
  });

  it('marks BB multiway defense packets as review context instead of heads-up BB grading', () => {
    const decision = makeDecisionForHand('9001', {
      position: 'BB',
      handKey: '72s',
      scenario: 'BB_VS_RAISE_MULTIWAY',
      action: 'fold',
      deviationType: null,
      openerPosition: 'CO',
    });

    const packet = buildSpotPacketFromParsedHand(makeBbMultiwayParsedHand(), decision, {
      source: { site: 'pokerstars', fileType: 'hand_history', accessMethod: 'local_file' },
    });

    expect(packet.evidenceLabel).toBe('study_packet_only');
    expect(packet.warnings).toContain('bb_multiway_defense_context');
    expect(packet.warnings).toContain('not_solver_backed');
    expect(packet.hero).toMatchObject({
      position: 'BB',
      scenario: 'BB_VS_RAISE_MULTIWAY',
      deviationType: null,
    });
    expect(packet.preflopContext).toMatchObject({
      reviewFocus: 'squeeze_or_iso_review',
      openerPosition: 'CO',
      raiseCountBeforeHero: 1,
      callerCountBeforeHero: 1,
      callerPositionsAfterOpen: ['BTN'],
      limperPositionsBeforeOpen: [],
      squeezeCandidate: true,
      isoRaiseOverLimp: false,
    });
    expect(packet.preflopContext.callersBeforeHero).toEqual([
      { sequence: 2, position: 'BTN', role: 'caller_after_open', amountBb: 2.5 },
    ]);
    expect(packet.trainerPrompt.legalActions.map((action) => action.action)).toEqual(['fold', 'call', 'raise', 'all_in']);
    expect(packet.reviewQuestion).toMatchObject({
      scenario: 'BB_VS_RAISE_MULTIWAY',
      ask: 'external_review',
    });
  });

  it('keeps stable packet identity without carrying raw hand text or player names', () => {
    const first = buildSpotPacketFromParsedHand(makeParsedHand(), makeDecision(), {
      createdAt: '2026-06-28T12:00:00.000Z',
      source: { site: 'ggpoker', fileType: 'hand_history', accessMethod: 'client_export' },
    });
    const second = buildSpotPacketFromParsedHand(makeParsedHand(), makeDecision(), {
      createdAt: '2026-06-29T12:00:00.000Z',
      source: { site: 'ggpoker', fileType: 'hand_history', accessMethod: 'client_export' },
    });

    expect(first.packetId).toBe(second.packetId);
    expect(first.inputHash).toBe(second.inputHash);
    expect(first.warnings).toContain('rake_excluded_or_unknown');
    expect(JSON.stringify(first)).not.toContain('PokerStars Hand #');
    expect(JSON.stringify(first)).not.toContain('VillainA');
    expect(JSON.stringify(first)).not.toContain('VillainB');
  });

  it('keeps recognized unsupported rooms as study prompts, not external solver packets', () => {
    const packet = buildSpotPacketFromParsedHand(makeParsedHand(), makeDecision(), {
      source: { site: 'known_unsupported', fileType: 'hand_history', accessMethod: 'local_file' },
    });

    expect(packet.warnings).toContain('unsupported_room_native_parser');
    expect(packet.reviewQuestion.ask).toBe('study_prompt');
  });

  it('promotes ranked Study Queue hand IDs into a local-only multi-packet bundle', () => {
    const queueItem = makeQueueItem();
    const bundle = buildStudyQueueSpotPacketBundle(
      [queueItem],
      [makeParsedHandForId('9001'), makeParsedHandForId('9002')],
      [makeDecisionForHand('9001'), makeDecisionForHand('9002', { handKey: 'QQ', action: 'raise' })],
      { createdAt: '2026-06-29T12:00:00.000Z', target: 'gto_wizard' },
    );

    expect(bundle.schemaVersion).toBe('spot-packet-bundle/v1');
    expect(bundle.localOnly).toBe(true);
    expect(bundle.evidenceLabel).toBe('study_packet_only');
    expect(bundle.target).toBe('gto_wizard');
    expect(bundle.externalReview).toMatchObject({
      status: 'setup_checklist_only',
      target: 'gto_wizard',
      targetLabel: 'GTO Wizard',
      packetCount: 2,
      packetsWithChecklist: 2,
      packetsMissingChecklist: 0,
      result: {
        status: 'not_attached',
        evidenceLabel: 'study_packet_only',
        solverBacked: false,
      },
    });
    expect(bundle.externalReview?.targetHints).toEqual([
      {
        family: 'preflop_solution_review',
        targets: ['gto_wizard', 'hrc'],
        targetLabels: ['GTO Wizard', 'HoldemResources Calculator (HRC)'],
        reason: 'preflop_range_configuration',
        status: 'suggested_only',
        packetCount: 2,
      },
    ]);
    expect(bundle.externalReview?.missingAssumptionCounts).toEqual(expect.arrayContaining([
      { assumption: 'calculation_model', packetCount: 2 },
      { assumption: 'range_assumptions', packetCount: 2 },
      { assumption: 'tree_configuration', packetCount: 2 },
    ]));
    expect(bundle.source).toMatchObject({
      type: 'study_queue',
      itemCount: 1,
      requestedHandCount: 3,
      packetCount: 2,
    });
    expect(bundle.packets.map((packet) => packet.source.handId)).toEqual(['9002', '9001']);
    expect(bundle.queueItems[0]).toMatchObject({
      itemId: 'deviation-BB_FOLD_SUITED',
      priorityScore: 92,
      handIds: ['9002', '9001', 'missing-hand'],
      packetIds: bundle.packets.map((packet) => packet.packetId),
      missingHandIds: ['missing-hand'],
    });
    expect(bundle.omittedHands).toEqual([
      { itemId: 'deviation-BB_FOLD_SUITED', handId: 'missing-hand', reason: 'missing_parsed_hand' },
    ]);
    expect(bundle.warnings).toContain('not_solver_backed');
    expect(bundle.warnings).toContain('trainer_scoring_not_included');
    expect(bundle.warnings).toContain('study_queue_hand_missing');
    expect(JSON.stringify(bundle)).not.toContain('VillainA');
    expect(JSON.stringify(bundle)).not.toContain('VillainB');
  });

  it('keeps bundle identity stable when only creation time changes', () => {
    const queue = [makeQueueItem({ handIds: ['9001'] })];
    const parsedHands = [makeParsedHandForId('9001')];
    const decisions = [makeDecisionForHand('9001')];
    const first = buildStudyQueueSpotPacketBundle(queue, parsedHands, decisions, {
      createdAt: '2026-06-29T12:00:00.000Z',
    });
    const second = buildStudyQueueSpotPacketBundle(queue, parsedHands, decisions, {
      createdAt: '2026-06-29T12:30:00.000Z',
    });

    expect(first.bundleId).toBe(second.bundleId);
    expect(first.inputHash).toBe(second.inputHash);
    expect(first.externalReview).toMatchObject({
      status: 'setup_checklist_only',
      target: 'generic',
      targetLabel: 'Generic external review',
      packetCount: 1,
      packetsWithChecklist: 1,
      packetsMissingChecklist: 0,
    });
    expect(first.packets[0]?.packetId).toBe(second.packets[0]?.packetId);

    const disabled = buildStudyQueueSpotPacketBundle(queue, parsedHands, decisions, {
      createdAt: '2026-06-29T12:00:00.000Z',
      packetOptions: { externalReview: { enabled: false } },
    });
    expect(disabled.externalReview).toBeUndefined();
  });
});
