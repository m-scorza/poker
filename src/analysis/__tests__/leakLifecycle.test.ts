import { describe, it, expect } from 'vitest';
import { reconcileLeakStatuses, deriveLeakLifecycle, type LeakStatusRecord } from '../leakLifecycle';

const NOW = new Date('2026-06-23T00:00:00.000Z');
const EARLIER = new Date('2026-06-01T00:00:00.000Z');

const studying = (leakId: string): LeakStatusRecord => ({ leakId, studyingSince: EARLIER, resolvedAt: null });
const resolved = (leakId: string): LeakStatusRecord => ({ leakId, studyingSince: EARLIER, resolvedAt: EARLIER });

describe('reconcileLeakStatuses (import-time re-measure)', () => {
  it('resolves a studied leak that stopped firing', () => {
    const r = reconcileLeakStatuses(new Set(['cbet_total']), [studying('vpip')], NOW);
    expect(r.newlyResolved).toEqual(['vpip']);
    expect(r.records[0]!.resolvedAt).toEqual(NOW);
  });

  it('regresses a beaten leak that came back', () => {
    const r = reconcileLeakStatuses(new Set(['vpip']), [resolved('vpip')], NOW);
    expect(r.newlyRegressed).toEqual(['vpip']);
    expect(r.records[0]!.resolvedAt).toBeNull();
  });

  it('does NOT tombstone a leak the user never marked studying', () => {
    // No records → an untouched leak dropping below threshold mints nothing.
    const r = reconcileLeakStatuses(new Set([]), [], NOW);
    expect(r.records).toHaveLength(0);
    expect(r.newlyResolved).toHaveLength(0);
    expect(r.newlyRegressed).toHaveLength(0);
  });

  it('leaves a still-firing studied leak untouched', () => {
    const r = reconcileLeakStatuses(new Set(['vpip']), [studying('vpip')], NOW);
    expect(r.newlyResolved).toHaveLength(0);
    expect(r.records[0]!.resolvedAt).toBeNull();
  });

  it('is idempotent — re-running with the same leak set yields no transitions', () => {
    const records = [studying('vpip'), resolved('cbet_total')];
    const ids = new Set(['vpip']); // vpip still active, cbet_total still gone
    const first = reconcileLeakStatuses(ids, records, NOW);
    expect(first.newlyResolved).toHaveLength(0);
    expect(first.newlyRegressed).toHaveLength(0);

    const second = reconcileLeakStatuses(ids, first.records, new Date('2026-07-01T00:00:00.000Z'));
    expect(second.newlyResolved).toHaveLength(0);
    expect(second.newlyRegressed).toHaveLength(0);
    expect(second.records).toEqual(first.records);
  });
});

describe('deriveLeakLifecycle (display projection)', () => {
  it('is active for an untouched, currently-firing leak', () => {
    expect(deriveLeakLifecycle(undefined, true)).toBe('active');
  });
  it('is studying for a marked leak still firing', () => {
    expect(deriveLeakLifecycle(studying('x'), true)).toBe('studying');
  });
  it('is resolved for a beaten leak no longer firing', () => {
    expect(deriveLeakLifecycle(resolved('x'), false)).toBe('resolved');
  });
  it('is regressed for a beaten leak firing again', () => {
    expect(deriveLeakLifecycle(resolved('x'), true)).toBe('regressed');
  });
});
