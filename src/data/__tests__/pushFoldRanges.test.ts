import { describe, it, expect } from 'vitest';
import {
  PUSH_RANGES,
  RESTEAL_RANGE,
  isInPushRange,
  isInRestealRange,
  getPushRange,
} from '../pushFoldRanges';

describe('PUSH_RANGES', () => {
  it('defines push ranges for all positions', () => {
    expect(PUSH_RANGES.UTG).toBeDefined();
    expect(PUSH_RANGES['UTG+1']).toBeDefined();
    expect(PUSH_RANGES.MP).toBeDefined();
    expect(PUSH_RANGES.HJ).toBeDefined();
    expect(PUSH_RANGES.CO).toBeDefined();
    expect(PUSH_RANGES.BTN).toBeDefined();
    expect(PUSH_RANGES.SB).toBeDefined();
    expect(PUSH_RANGES['BTN/SB']).toBeDefined();
  });

  it('has progressively wider ranges from UTG to SB', () => {
    const utg = PUSH_RANGES.UTG!.size;
    const hj = PUSH_RANGES.HJ!.size;
    const co = PUSH_RANGES.CO!.size;
    const btn = PUSH_RANGES.BTN!.size;
    const sb = PUSH_RANGES.SB!.size;

    expect(hj).toBeGreaterThan(utg);
    expect(co).toBeGreaterThan(hj);
    expect(btn).toBeGreaterThan(co);
    expect(sb).toBeGreaterThan(btn);
  });

  it('push ranges are wider than RFI ranges for same positions', () => {
    // Push ranges should be wider than RFI at 10bb
    // UTG push ~16% vs UTG RFI ~13.1%
    expect(PUSH_RANGES.UTG!.size).toBeGreaterThan(20); // UTG push has all pairs + suited aces + some broadways
  });

  it('UTG push includes all pairs', () => {
    const utg = PUSH_RANGES.UTG!;
    expect(utg.has('AA')).toBe(true);
    expect(utg.has('KK')).toBe(true);
    expect(utg.has('22')).toBe(true);
    expect(utg.has('55')).toBe(true);
  });

  it('UTG push includes all suited aces', () => {
    const utg = PUSH_RANGES.UTG!;
    expect(utg.has('AKs')).toBe(true);
    expect(utg.has('A2s')).toBe(true);
    expect(utg.has('A7s')).toBe(true);
  });

  it('UTG push includes A7o+ but not A6o', () => {
    const utg = PUSH_RANGES.UTG!;
    expect(utg.has('AKo')).toBe(true);
    expect(utg.has('A7o')).toBe(true);
    expect(utg.has('A6o')).toBe(false);
  });

  it('CO push is significantly wider than UTG push', () => {
    const utg = PUSH_RANGES.UTG!.size;
    const co = PUSH_RANGES.CO!.size;
    expect(co).toBeGreaterThan(utg * 1.5); // CO should be much wider
  });

  it('SB push is extremely wide', () => {
    // SB pushes ~69% of hands at 10bb
    expect(PUSH_RANGES.SB!.size).toBeGreaterThan(100);
  });

  it('BTN/SB uses SB range for HU play', () => {
    const sb = PUSH_RANGES.SB!;
    const btnSb = PUSH_RANGES['BTN/SB']!;
    expect(btnSb.size).toBe(sb.size);
  });
});

describe('RESTEAL_RANGE', () => {
  it('includes all pairs', () => {
    expect(RESTEAL_RANGE.has('AA')).toBe(true);
    expect(RESTEAL_RANGE.has('22')).toBe(true);
    expect(RESTEAL_RANGE.has('77')).toBe(true);
  });

  it('includes all suited aces', () => {
    expect(RESTEAL_RANGE.has('AKs')).toBe(true);
    expect(RESTEAL_RANGE.has('A2s')).toBe(true);
    expect(RESTEAL_RANGE.has('A9s')).toBe(true);
  });

  it('includes suited broadways', () => {
    expect(RESTEAL_RANGE.has('KQs')).toBe(true);
    expect(RESTEAL_RANGE.has('KTs')).toBe(true);
    expect(RESTEAL_RANGE.has('QJs')).toBe(true);
    expect(RESTEAL_RANGE.has('JTs')).toBe(true);
  });

  it('does not include offsuit non-ace hands', () => {
    expect(RESTEAL_RANGE.has('KQo')).toBe(false);
    expect(RESTEAL_RANGE.has('QJo')).toBe(false);
    expect(RESTEAL_RANGE.has('T9o')).toBe(false);
  });

  it('does not include weak suited non-broadways', () => {
    expect(RESTEAL_RANGE.has('98s')).toBe(false);
    expect(RESTEAL_RANGE.has('76s')).toBe(false);
    expect(RESTEAL_RANGE.has('54s')).toBe(false);
  });
});

describe('isInPushRange', () => {
  it('returns true for AA from any position', () => {
    expect(isInPushRange('AA', 'UTG')).toBe(true);
    expect(isInPushRange('AA', 'BTN')).toBe(true);
    expect(isInPushRange('AA', 'SB')).toBe(true);
  });

  it('returns false for weak hands from UTG', () => {
    expect(isInPushRange('72o', 'UTG')).toBe(false);
    expect(isInPushRange('93o', 'UTG')).toBe(false);
  });

  it('returns true for wide hands from SB', () => {
    expect(isInPushRange('T6o', 'SB')).toBe(true);
    expect(isInPushRange('85o', 'SB')).toBe(true);
  });

  it('returns false for BB (no push range)', () => {
    expect(isInPushRange('AA', 'BB')).toBe(false);
  });
});

describe('isInRestealRange', () => {
  it('returns true for pairs', () => {
    expect(isInRestealRange('AA')).toBe(true);
    expect(isInRestealRange('22')).toBe(true);
  });

  it('returns true for suited aces', () => {
    expect(isInRestealRange('A5s')).toBe(true);
  });

  it('returns false for weak offsuit hands', () => {
    expect(isInRestealRange('T9o')).toBe(false);
    expect(isInRestealRange('87o')).toBe(false);
  });
});

describe('getPushRange', () => {
  it('returns the range set for valid positions', () => {
    const range = getPushRange('CO');
    expect(range).toBeDefined();
    expect(range!.has('AA')).toBe(true);
  });

  it('returns undefined for BB', () => {
    expect(getPushRange('BB')).toBeUndefined();
  });
});
