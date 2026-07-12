/**
 * Centralized, typed wrapper for localStorage.
 *
 * One source of truth for keys, versions, validation, and quota handling.
 * Reads return a fallback when stored data is missing, malformed, or fails
 * the caller-supplied validator. Writes surface quota errors as a result
 * value instead of throwing.
 */

export const KEYS = {
  customRange: (position: string) => `poker:range:${position}` as const,
  legacyCustomRange: (position: string) => `range:${position}` as const,
  appSettings: 'poker-app-settings' as const,
} as const;

export const LEGACY_RANGE_PREFIX = 'range:';
export const RANGE_PREFIX = 'poker:range:';

export const CURRENT_RANGE_VERSION = 1;
export const CURRENT_SETTINGS_VERSION = 1;

/**
 * Fallback hero name used when no hero is configured yet (fresh install,
 * missing settings row, or an explicit override wasn't supplied). Historical
 * fixtures/tests use this same value; user-facing docs keep the posture
 * generic.
 */
export const DEFAULT_HERO_NAME = 'scorza23';

export interface RangeEnvelopeV1 {
  version: 1;
  hands: string[];
}

export type Validator<T> = (raw: unknown) => T | null;

export type SafeSetResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unknown'; error: unknown };

/**
 * Read a key, JSON-parse it, validate the shape. Returns `fallback` on any
 * failure (missing, malformed JSON, validator rejection). `storage` is
 * injectable for tests.
 */
export function safeGet<T>(
  key: string,
  validate: Validator<T>,
  fallback: T,
  storage: Storage = localStorage,
): T {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return fallback;
  }
  if (raw === null) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  const validated = validate(parsed);
  return validated === null ? fallback : validated;
}

/**
 * Write a JSON-serialized value. Returns a discriminated result so callers
 * can react to quota-exceeded without try/catch. `storage` is injectable
 * for tests.
 */
export function safeSet(
  key: string,
  value: unknown,
  storage: Storage = localStorage,
): SafeSetResult {
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    if (isQuotaExceeded(error)) {
      return { ok: false, reason: 'quota', error };
    }
    return { ok: false, reason: 'unknown', error };
  }
}

export function safeRemove(key: string, storage: Storage = localStorage): void {
  try {
    storage.removeItem(key);
  } catch (error) {
    // safely ignore — removeItem failures are expected to be harmless and non-actionable (e.g. storage disabled in private browsing modes)
    console.warn(`[localStorage] Failed to remove key "${key}":`, error);
  }
}

/** Enumerate keys with a given prefix. Returns the full key strings. */
export function listKeysWithPrefix(prefix: string): string[] {
  const out: string[] = [];
  let length: number;
  try {
    length = localStorage.length;
  } catch {
    return out;
  }
  for (let i = 0; i < length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) out.push(key);
  }
  return out;
}

function isQuotaExceeded(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'QuotaExceededError') return true;
  if (error.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
  const code = (error as Error & { code?: number }).code;
  return code === 22 || code === 1014;
}

// --- Validators ---

/**
 * Accepts either the v1 envelope `{ version: 1, hands: string[] }` or a
 * legacy bare `string[]` (pre-versioning). Returns a normalized v1 envelope
 * so callers can treat reads uniformly.
 */
export function validateRangeEnvelope(raw: unknown): RangeEnvelopeV1 | null {
  if (Array.isArray(raw) && raw.every((h): h is string => typeof h === 'string')) {
    return { version: 1, hands: raw };
  }
  if (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as { version?: unknown }).version === 1 &&
    Array.isArray((raw as { hands?: unknown }).hands) &&
    (raw as { hands: unknown[] }).hands.every((h) => typeof h === 'string')
  ) {
    return { version: 1, hands: (raw as { hands: string[] }).hands };
  }
  return null;
}
