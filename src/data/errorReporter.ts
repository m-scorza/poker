import { buildErrorLogRecord, type ErrorLogInput } from './errorLog';
import { saveErrorLogRecord } from './store';

function currentRoute(): string {
  if (typeof window === 'undefined') return '(unknown)';
  return `${window.location.pathname}${window.location.hash}`;
}

function currentEnvironment(): ErrorLogInput['environment'] {
  if (typeof navigator === 'undefined') return undefined;
  const ua = navigator.userAgent;
  const family = /Firefox\//.test(ua)
    ? 'Firefox'
    : /Edg\//.test(ua)
      ? 'Edge'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Other';

  return { browserFamily: family, language: navigator.language };
}

/**
 * Record a failure to the local crash log. Deliberately swallows its own
 * errors: a logging failure must never replace or mask the original one, and
 * must never surface a second error dialog to the user.
 */
export function reportError(input: Omit<ErrorLogInput, 'route' | 'environment'>): void {
  try {
    const record = buildErrorLogRecord({
      ...input,
      route: currentRoute(),
      environment: currentEnvironment(),
    });
    void saveErrorLogRecord(record).catch(() => {});
  } catch {
    // Intentionally ignored — see above.
  }
}

/**
 * Async failures never reach an ErrorBoundary, so without this every rejected
 * promise outside the import pipeline is lost. Idempotent.
 */
let rejectionHandlerRegistered = false;

export function registerGlobalErrorHandlers(): void {
  if (rejectionHandlerRegistered) return;
  if (typeof window === 'undefined') return;
  rejectionHandlerRegistered = true;

  window.addEventListener('unhandledrejection', (event) => {
    reportError({ kind: 'unhandled_rejection', error: event.reason });
  });
}
