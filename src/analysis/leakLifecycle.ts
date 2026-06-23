/**
 * Leak lifecycle — turning leaks into living entities you can kill.
 *
 * Leaks themselves stay stateless (recomputed from decisions each load). What we
 * persist is *engagement*: which leaks the user is actively studying, and which
 * of those they have since beaten. The graveyard therefore means "leaks I killed",
 * not "leaks that happened to vanish" — only a leak you marked `studying` can
 * become `resolved`, which dissolves the threshold-flicker noise problem.
 *
 * The canonical transitions happen at import time (the discrete "re-measure"
 * event) via `reconcileLeakStatuses`, never on render. `active` is derived from
 * the live leak set, not stored, so it can't go stale against the current
 * computation. `deriveLeakLifecycle` is the read-only display projection.
 */

export interface LeakStatusRecord {
  leakId: string;
  /** When the user marked this leak as something they're working on. */
  studyingSince: Date;
  /** Set when a studied leak stopped firing; null while still active. */
  resolvedAt: Date | null;
}

export type LeakLifecycle = 'active' | 'studying' | 'resolved' | 'regressed';

export interface LeakReconcileResult {
  /** The records to persist (same length/order as input; unchanged ones reused). */
  records: LeakStatusRecord[];
  /** Studied leaks that stopped firing in this re-measure. */
  newlyResolved: string[];
  /** Beaten leaks that came back in this re-measure. */
  newlyRegressed: string[];
}

/**
 * Advance the lifecycle against a fresh leak computation. Pure and idempotent:
 * re-running with the same `currentLeakIds` produces no transitions.
 *
 * - A studied leak (resolvedAt null) no longer detected → resolved (set resolvedAt).
 * - A resolved leak detected again → regressed (clear resolvedAt; it's back in play).
 * - Untouched leaks are never persisted here, so a leak the user never marked
 *   silently dropping below threshold does NOT mint a tombstone.
 */
export function reconcileLeakStatuses(
  currentLeakIds: ReadonlySet<string>,
  records: readonly LeakStatusRecord[],
  now: Date,
): LeakReconcileResult {
  const newlyResolved: string[] = [];
  const newlyRegressed: string[] = [];

  const updated = records.map((record) => {
    const detected = currentLeakIds.has(record.leakId);

    if (record.resolvedAt === null && !detected) {
      newlyResolved.push(record.leakId);
      return { ...record, resolvedAt: now };
    }
    if (record.resolvedAt !== null && detected) {
      newlyRegressed.push(record.leakId);
      return { ...record, resolvedAt: null };
    }
    return record;
  });

  return { records: updated, newlyResolved, newlyRegressed };
}

/**
 * Read-only display projection of a leak's lifecycle from its persisted record
 * (if any) and whether it currently fires. No mutation, no inference beyond the
 * record + the live set.
 */
export function deriveLeakLifecycle(
  record: LeakStatusRecord | undefined,
  isCurrentlyDetected: boolean,
): LeakLifecycle {
  if (!record) return 'active'; // untouched — derived purely from the live set
  if (record.resolvedAt !== null) {
    // A beaten leak that's firing again is the high-value "regressed" signal.
    return isCurrentlyDetected ? 'regressed' : 'resolved';
  }
  return 'studying';
}
