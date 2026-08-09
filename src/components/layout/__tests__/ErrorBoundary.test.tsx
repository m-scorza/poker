import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../ErrorBoundary';
import { registerGlobalErrorHandlers, reportError } from '../../../data/errorReporter';
import { clearAllData, getRecentErrorLogRecords } from '../../../data/store';

function Boom(): never {
  throw new Error('render exploded');
}

describe('ErrorBoundary error logging', () => {
  beforeEach(async () => {
    await clearAllData();
    // The boundary logs the caught error; keep the suite output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists a caught render error to the local log', async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    await waitFor(async () => {
      const records = await getRecentErrorLogRecords();
      expect(records).toHaveLength(1);
    });

    const [record] = await getRecentErrorLogRecords();
    expect(record!.kind).toBe('render');
    expect(record!.message).toBe('render exploded');
  });

  it('still shows the fallback UI, and does not blame a robot', async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(await screen.findByText(/could not recover from/i)).toBeInTheDocument();
    expect(screen.queryByText(/robot assistant/i)).not.toBeInTheDocument();
  });

  it('does not surface a second failure when persistence itself fails', async () => {
    // A logging failure must never mask the original error.
    expect(() => reportError({ kind: 'render', error: undefined })).not.toThrow();
  });
});

describe('global unhandled rejection handler', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('records an unhandled rejection, which no ErrorBoundary can catch', async () => {
    registerGlobalErrorHandlers();

    // jsdom does not fire unhandledrejection on its own; dispatch the event
    // shape the handler listens for.
    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    event.reason = new Error('async exploded');
    window.dispatchEvent(event);

    await waitFor(async () => {
      const records = await getRecentErrorLogRecords();
      expect(records).toHaveLength(1);
    });

    const [record] = await getRecentErrorLogRecords();
    expect(record!.kind).toBe('unhandled_rejection');
    expect(record!.message).toBe('async exploded');
  });
});
