import { describe, it, expect } from 'vitest';
import {
  detectSqueezeOpportunity,
  squeezeStats,
} from '../squeezeDetector';
import type { Action } from '../../types/hand';
import { makeAction as baseAction } from '../../test/factories';

function makeAction(overrides: Partial<Action> = {}): Action {
  return baseAction({ playerName: 'villain1', ...overrides });
}

describe('detectSqueezeOpportunity', () => {
  it('detects squeeze spot: open + caller + hero can squeeze', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'UTG', actionType: 'raise', amount: 50, sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'call', amount: 50, sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 150, sequence: 3 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'CO', 'AKs', 30, 20,
    );
    expect(result).not.toBeNull();
    expect(result!.heroAction).toBe('squeeze');
    expect(result!.callerCount).toBe(1);
    expect(result!.openerPosition).toBe('UTG');
  });

  it('detects squeeze spot with multiple callers', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'UTG', actionType: 'raise', amount: 50, sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'call', amount: 50, sequence: 2 }),
      makeAction({ playerName: 'HJ', actionType: 'call', amount: 50, sequence: 3 }),
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 200, sequence: 4 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'CO', 'QQ', 35, 20,
    );
    expect(result).not.toBeNull();
    expect(result!.callerCount).toBe(2);
    expect(result!.heroAction).toBe('squeeze');
  });

  it('detects missed squeeze (hero cold-called)', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'UTG', actionType: 'raise', amount: 50, sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'call', amount: 50, sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'call', amount: 50, sequence: 3 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'BTN', 'AJs', 40, 20,
    );
    expect(result).not.toBeNull();
    expect(result!.heroAction).toBe('call');
    expect(result!.note).toContain('cold call');
  });

  it('detects fold in squeeze spot', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'UTG', actionType: 'raise', amount: 50, sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'call', amount: 50, sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'fold', sequence: 3 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'CO', '72o', 25, 20,
    );
    expect(result).not.toBeNull();
    expect(result!.heroAction).toBe('fold');
  });

  it('returns null when no callers (standard 3-bet spot)', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'UTG', actionType: 'raise', amount: 50, sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'fold', sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 150, sequence: 3 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'CO', 'AKs', 30, 20,
    );
    expect(result).toBeNull();
  });

  it('returns null when no open raise', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'UTG', actionType: 'fold', sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'fold', sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 50, sequence: 3 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'CO', 'AKs', 30, 20,
    );
    expect(result).toBeNull();
  });

  it('returns null when someone already 3-bet before hero', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'UTG', actionType: 'raise', amount: 50, sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'call', amount: 50, sequence: 2 }),
      makeAction({ playerName: 'HJ', actionType: 'raise', amount: 150, sequence: 3 }), // 3-bet already happened
      makeAction({ playerName: 'hero', actionType: 'fold', sequence: 4 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'CO', 'AKs', 30, 20,
    );
    expect(result).toBeNull();
  });

  it('returns null when hero has no voluntary action', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'UTG', actionType: 'raise', amount: 50, sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'call', amount: 50, sequence: 2 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'CO', 'AKs', 30, 20,
    );
    expect(result).toBeNull();
  });

  it('skips forced actions (antes, blinds)', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'hero', actionType: 'post_bb', amount: 20, sequence: 0 }),
      makeAction({ playerName: 'UTG', actionType: 'raise', amount: 50, sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'call', amount: 50, sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 200, sequence: 3 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'BB', 'JJ', 30, 20,
    );
    expect(result).not.toBeNull();
    expect(result!.heroAction).toBe('squeeze');
  });

  it('calculates recommended sizing', () => {
    const actions: Action[] = [
      makeAction({ playerName: 'UTG', actionType: 'raise', amount: 50, sequence: 1 }),
      makeAction({ playerName: 'MP', actionType: 'call', amount: 50, sequence: 2 }),
      makeAction({ playerName: 'hero', actionType: 'raise', amount: 170, sequence: 3 }),
    ];

    const result = detectSqueezeOpportunity(
      actions, 'hero', 'SB', 'AKs', 30, 20,
    );
    expect(result).not.toBeNull();
    // recommendedSizing = openSize * 3 + BB * callerCount = 50 * 3 + 20 * 1 = 170
    expect(result!.recommendedSizing).toBe(170);
  });
});

describe('squeezeStats', () => {
  it('computes correct stats', () => {
    const spots = [
      { heroAction: 'squeeze' as const },
      { heroAction: 'squeeze' as const },
      { heroAction: 'fold' as const },
      { heroAction: 'call' as const },
    ].map((s) => ({
      handId: 'h',
      heroPosition: 'CO' as const,
      openerPosition: 'UTG',
      callerCount: 1,
      heroHandKey: 'AA',
      stackBb: 30,
      recommendedSizing: 170,
      note: '',
      ...s,
    }));

    const stats = squeezeStats(spots);
    expect(stats.totalOpportunities).toBe(4);
    expect(stats.squeezed).toBe(2);
    expect(stats.folded).toBe(1);
    expect(stats.coldCalled).toBe(1);
    expect(stats.squeezePct).toBe(50);
  });

  it('returns 0% with no opportunities', () => {
    expect(squeezeStats([]).squeezePct).toBe(0);
  });
});
