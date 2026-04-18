import { describe, it, expect } from 'vitest';
import {
  estimateICMStage,
  estimateICMStageFromHand,
  icmStageLabel,
} from '../icmDetector';
import type { Hand, PlayerInHand } from '../../types/hand';

function makeHand(overrides: Partial<Hand>): Hand {
  return {
    id: 'test-1',
    tournamentId: 'T1',
    date: new Date(),
    level: 1,
    smallBlind: 10,
    bigBlind: 20,
    ante: 0,
    maxSeats: 9,
    activePlayers: 9,
    buttonSeat: 1,
    boardFlop: null,
    boardTurn: null,
    boardRiver: null,
    totalPot: 0,
    rake: 0,
    hasShowdown: false,
    heroChipsBefore: 1500,
    heroChipsAfter: 1500,
    villainDeltas: [],
    ...overrides,
  };
}

function makePlayers(count: number, chipsBefore: number): PlayerInHand[] {
  return Array.from({ length: count }, (_, i) => ({
    handId: 'test-1',
    seatNumber: i + 1,
    playerName: `player${i + 1}`,
    chipsBefore,
    position: 'UTG' as const,
    isHero: i === 0,
    holeCards: null,
  }));
}

describe('estimateICMStage', () => {
  it('detects early game (level 1-3, deep stacks)', () => {
    const hand = makeHand({ level: 1, bigBlind: 20, activePlayers: 9, maxSeats: 9 });
    const players = makePlayers(9, 1500); // 75bb avg
    const result = estimateICMStage(hand, players);
    expect(result.stage).toBe('early');
    expect(result.riskPremiumEstimate).toBe(0);
  });

  it('detects mid game (level 5-6, medium stacks)', () => {
    const hand = makeHand({ level: 6, bigBlind: 100, activePlayers: 7, maxSeats: 9 });
    const players = makePlayers(7, 3500); // 35bb avg
    const result = estimateICMStage(hand, players);
    expect(result.stage).toBe('mid');
  });

  it('detects bubble/late (high level, short stacks)', () => {
    const hand = makeHand({ level: 12, bigBlind: 400, activePlayers: 5, maxSeats: 9, ante: 50 });
    const players = makePlayers(5, 5000); // 12.5bb avg
    const result = estimateICMStage(hand, players);
    expect(['bubble', 'itm', 'final_table']).toContain(result.stage);
    expect(result.riskPremiumEstimate).toBeGreaterThan(0);
  });

  it('detects final table (3 players at 9-max)', () => {
    const hand = makeHand({ level: 15, bigBlind: 800, activePlayers: 3, maxSeats: 9, ante: 100 });
    const players = makePlayers(3, 10000); // 12.5bb avg
    const result = estimateICMStage(hand, players);
    expect(['final_table', 'itm']).toContain(result.stage);
  });

  it('recognizes ante as a signal of later tournament stage', () => {
    const handNoAnte = makeHand({ level: 5, bigBlind: 100, activePlayers: 8, maxSeats: 9 });
    const handAnte = makeHand({ level: 5, bigBlind: 100, activePlayers: 8, maxSeats: 9, ante: 25 });
    const players = makePlayers(8, 4000);

    const resultNoAnte = estimateICMStage(handNoAnte, players);
    const resultAnte = estimateICMStage(handAnte, players);

    // Ante version should have more signals
    expect(resultAnte.signals.length).toBeGreaterThanOrEqual(resultNoAnte.signals.length);
  });

  it('returns signals explaining the estimate', () => {
    const hand = makeHand({ level: 8, bigBlind: 200 });
    const players = makePlayers(6, 4000); // 20bb avg
    const result = estimateICMStage(hand, players);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals.some((s) => s.includes('Level'))).toBe(true);
  });

  it('handles empty player list', () => {
    const hand = makeHand({ level: 1 });
    const result = estimateICMStage(hand, []);
    expect(result.stage).toBeDefined();
  });
});

describe('estimateICMStageFromHand', () => {
  it('returns early for low level, full table', () => {
    expect(estimateICMStageFromHand(makeHand({ level: 2, activePlayers: 9, maxSeats: 9 }))).toBe('early');
  });

  it('returns mid for moderate level', () => {
    expect(estimateICMStageFromHand(makeHand({ level: 7, activePlayers: 7, maxSeats: 9 }))).toBe('mid');
  });

  it('returns bubble for high level', () => {
    expect(estimateICMStageFromHand(makeHand({ level: 11, activePlayers: 6, maxSeats: 9 }))).toBe('bubble');
  });

  it('returns final_table for 3 players at 9-max', () => {
    expect(estimateICMStageFromHand(makeHand({ level: 8, activePlayers: 3, maxSeats: 9 }))).toBe('final_table');
  });

  it('returns final_table for very high level', () => {
    expect(estimateICMStageFromHand(makeHand({ level: 16, activePlayers: 4, maxSeats: 6 }))).toBe('final_table');
  });

  it('returns bubble for 5 active at 9-max', () => {
    expect(estimateICMStageFromHand(makeHand({ level: 10, activePlayers: 5, maxSeats: 9 }))).toBe('bubble');
  });
});

describe('icmStageLabel', () => {
  it('returns Portuguese labels', () => {
    expect(icmStageLabel('early')).toBe('Início');
    expect(icmStageLabel('bubble')).toBe('Bolha');
    expect(icmStageLabel('final_table')).toBe('Mesa Final');
  });
});
