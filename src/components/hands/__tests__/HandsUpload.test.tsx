import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom';
import type { WorkerMessage } from '../../../parser/workerProcessor';

// jsdom runs with an opaque origin here, so `localStorage` is undefined. The
// Zustand `persist` middleware behind useAppStore calls storage.setItem on every
// setState, so provide an in-memory shim before the store module initializes.
vi.hoisted(() => {
  const backing = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return backing.size;
    },
    getItem: (key) => (backing.has(key) ? backing.get(key)! : null),
    setItem: (key, value) => {
      backing.set(key, String(value));
    },
    removeItem: (key) => {
      backing.delete(key);
    },
    clear: () => {
      backing.clear();
    },
    key: (index) => Array.from(backing.keys())[index] ?? null,
  };
  globalThis.localStorage = memoryStorage;
});

import { useAppStore } from '../../../data/appStore';

// HandsUpload is the only module in this tree that imports `../../../data/store`
// (after the importRuns->store cycle was removed), so mocking the DB layer here
// is self-contained.
const storeMocks = vi.hoisted(() => ({
  importHands: vi.fn(),
  importTournamentSummaries: vi.fn(),
  getTotalHandCount: vi.fn(),
  getRecentImportRuns: vi.fn(),
  saveImportRun: vi.fn(),
  clearImportRuns: vi.fn(),
}));

vi.mock('../../../data/store', () => storeMocks);

// useLiveQuery returns a per-test override (retained import runs) when one is
// set, else the component's default value — so most tests render without a live
// IndexedDB subscription.
const liveQuery = vi.hoisted(() => ({ runs: undefined as unknown }));
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (_querier: unknown, _deps: unknown, defaultValue: unknown) =>
    liveQuery.runs !== undefined ? liveQuery.runs : defaultValue,
}));

// Mock JSZip so the ZIP guard/extraction logic is exercised deterministically
// without building real archives (and without jsdom Blob/arrayBuffer quirks).
const jszipMock = vi.hoisted(() => ({ loadAsync: vi.fn() }));
vi.mock('jszip', () => ({ default: jszipMock }));

class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor(public url: unknown, public options?: unknown) {
    MockWorker.instances.push(this);
  }
}

import { HandsUpload } from '../HandsUpload';
import { buildImportRunRecord } from '../../../data/importRuns';
import type { ImportSummary } from '../../../parser/workerProcessor';

const MB = 1024 * 1024;

function makeRun(importedAt: Date, confidence: ImportSummary['confidence'] = 'high') {
  return buildImportRunRecord(
    { totalFiles: 1, parsedFiles: 1, failedFiles: 0, handsFound: 10, summariesFound: 0, confidence, warnings: [] },
    ['hands.txt'],
    { savedHands: 10, savedSummaries: 0 },
    importedAt,
  );
}

function makeFile(name: string, content = 'data', sizeOverride?: number): File {
  const file = new File([content], name, { type: 'text/plain' });
  // jsdom's File.text() is unreliable across versions; pin it explicitly.
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(content), configurable: true });
  if (sizeOverride !== undefined) {
    Object.defineProperty(file, 'size', { value: sizeOverride, configurable: true });
  }
  return file;
}

function selectFiles(container: HTMLElement, files: File[]) {
  const input = container.querySelector('input[accept=".txt,.json,.zip"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  fireEvent.change(input);
}

describe('HandsUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liveQuery.runs = undefined;
    jszipMock.loadAsync.mockReset();
    MockWorker.instances = [];
    storeMocks.importHands.mockResolvedValue(3);
    storeMocks.importTournamentSummaries.mockResolvedValue({ updated: 0, created: 1, buyInPreserved: 0 });
    storeMocks.getTotalHandCount.mockResolvedValue(3);
    storeMocks.getRecentImportRuns.mockResolvedValue([]);
    storeMocks.saveImportRun.mockResolvedValue(undefined);
    storeMocks.clearImportRuns.mockResolvedValue(undefined);
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    useAppStore.setState({ isImporting: false, totalHands: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the dropzone and an empty data-health state', () => {
    const { getByText } = render(<HandsUpload onUploadSuccess={vi.fn()} />);
    expect(getByText('Drag and Drop Poker Files')).toBeInTheDocument();
    expect(getByText('No import history recorded yet.')).toBeInTheDocument();
  });

  it('reports an error for unsupported file types without spawning a worker', async () => {
    const onUploadSuccess = vi.fn();
    const { container, findByText } = render(<HandsUpload onUploadSuccess={onUploadSuccess} />);

    selectFiles(container, [makeFile('notes.pdf')]);

    expect(await findByText(/Unsupported file type/i)).toBeInTheDocument();
    expect(storeMocks.importHands).not.toHaveBeenCalled();
    expect(MockWorker.instances).toHaveLength(0);
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it('rejects a hand-history file over the size limit', async () => {
    const { container, findByText } = render(<HandsUpload onUploadSuccess={vi.fn()} />);

    selectFiles(container, [makeFile('huge.txt', 'x', 16 * MB)]);

    expect(await findByText(/File too large/i)).toBeInTheDocument();
    expect(MockWorker.instances).toHaveLength(0);
  });

  it('rejects a ZIP archive over the size limit before extracting it', async () => {
    const { container, findByText } = render(<HandsUpload onUploadSuccess={vi.fn()} />);

    selectFiles(container, [makeFile('archive.zip', 'x', 60 * MB)]);

    expect(await findByText(/ZIP archive too large/i)).toBeInTheDocument();
    expect(MockWorker.instances).toHaveLength(0);
  });

  it('imports a valid hand-history file end to end', async () => {
    const onUploadSuccess = vi.fn();
    const { container } = render(<HandsUpload onUploadSuccess={onUploadSuccess} />);

    selectFiles(container, [makeFile('hand.txt', "PokerStars Hand #1: Hold'em No Limit")]);

    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0]!;
    expect(worker.postMessage).toHaveBeenCalledTimes(1);

    const completeMessage: WorkerMessage = {
      type: 'COMPLETE',
      hands: [],
      summaries: [],
      importSummary: {
        totalFiles: 1,
        parsedFiles: 1,
        failedFiles: 0,
        handsFound: 0,
        summariesFound: 0,
        confidence: 'high',
        warnings: [],
      },
    };

    await act(async () => {
      worker.onmessage?.({ data: completeMessage } as MessageEvent<WorkerMessage>);
    });

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
    expect(storeMocks.importHands).toHaveBeenCalledTimes(1);
    expect(storeMocks.importTournamentSummaries).toHaveBeenCalledTimes(1);
    expect(storeMocks.saveImportRun).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().totalHands).toBe(3);
    expect(useAppStore.getState().isImporting).toBe(false);
  });

  // CQ-3: a Dexie write failure on the COMPLETE path must not wedge the overlay.
  it('clears the import overlay and surfaces an error when the DB write fails', async () => {
    storeMocks.importHands.mockRejectedValue(new Error('QuotaExceededError'));
    const onUploadSuccess = vi.fn();
    const { container, findByText } = render(<HandsUpload onUploadSuccess={onUploadSuccess} />);

    selectFiles(container, [makeFile('hand.txt', "PokerStars Hand #1: Hold'em No Limit")]);

    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0]!;

    const completeMessage: WorkerMessage = {
      type: 'COMPLETE',
      hands: [],
      summaries: [],
      importSummary: {
        totalFiles: 1,
        parsedFiles: 1,
        failedFiles: 0,
        handsFound: 0,
        summariesFound: 0,
        confidence: 'high',
        warnings: [],
      },
    };

    await act(async () => {
      worker.onmessage?.({ data: completeMessage } as MessageEvent<WorkerMessage>);
    });

    expect(await findByText(/saving failed/i)).toBeInTheDocument();
    await waitFor(() => expect(useAppStore.getState().isImporting).toBe(false));
    expect(onUploadSuccess).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalled();
  });

  // CQ-3: a FATAL_ERROR from the worker must clear the overlay and report it.
  it('clears the overlay and reports a FATAL_ERROR from the worker', async () => {
    const { container, findByText } = render(<HandsUpload onUploadSuccess={vi.fn()} />);

    selectFiles(container, [makeFile('hand.txt', "PokerStars Hand #1: Hold'em No Limit")]);

    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0]!;

    await act(async () => {
      worker.onmessage?.({
        data: { type: 'FATAL_ERROR', error: 'worker exploded' },
      } as MessageEvent<WorkerMessage>);
    });

    expect(await findByText(/worker exploded/i)).toBeInTheDocument();
    await waitFor(() => expect(useAppStore.getState().isImporting).toBe(false));
    expect(worker.terminate).toHaveBeenCalled();
  });

  // --- ZIP extraction + guards ---

  it('extracts supported entries from a ZIP and skips unsupported entries and dirs', async () => {
    jszipMock.loadAsync.mockResolvedValue({
      files: {
        'hand.txt': { dir: false, _data: { uncompressedSize: 50 }, async: vi.fn().mockResolvedValue("PokerStars Hand #1: Hold'em No Limit") },
        'readme.md': { dir: false, _data: { uncompressedSize: 20 }, async: vi.fn() },
        'sub/': { dir: true, _data: { uncompressedSize: 0 }, async: vi.fn() },
      },
    });
    const { container } = render(<HandsUpload onUploadSuccess={vi.fn()} />);
    selectFiles(container, [makeFile('archive.zip', 'zip', 2000)]);

    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const files = MockWorker.instances[0]!.postMessage.mock.calls[0]![0].files as Array<{ name: string }>;
    expect(files.map((f) => f.name)).toEqual(['archive.zip/hand.txt']);
  });

  it('refuses a ZIP whose entry size metadata is missing, without spawning a worker', async () => {
    jszipMock.loadAsync.mockResolvedValue({
      files: { 'hand.txt': { dir: false, _data: undefined, async: vi.fn() } },
    });
    const { container, findByText } = render(<HandsUpload onUploadSuccess={vi.fn()} />);
    selectFiles(container, [makeFile('archive.zip', 'zip', 2000)]);

    expect(await findByText(/size metadata is unavailable/i)).toBeInTheDocument();
    expect(MockWorker.instances).toHaveLength(0);
  });

  it('refuses a ZIP that would decompress past the safety limit', async () => {
    jszipMock.loadAsync.mockResolvedValue({
      files: { 'hand.txt': { dir: false, _data: { uncompressedSize: 151 * MB }, async: vi.fn() } },
    });
    const { container, findByText } = render(<HandsUpload onUploadSuccess={vi.fn()} />);
    selectFiles(container, [makeFile('archive.zip', 'zip', 2000)]);

    expect(await findByText(/would decompress to/i)).toBeInTheDocument();
    expect(MockWorker.instances).toHaveLength(0);
  });

  // --- non-fatal + crash worker paths ---

  it('captures a per-file FILE_ERROR but still completes the import', async () => {
    const onUploadSuccess = vi.fn();
    const { container, findByText } = render(<HandsUpload onUploadSuccess={onUploadSuccess} />);
    selectFiles(container, [makeFile('hand.txt', "PokerStars Hand #1: Hold'em No Limit")]);
    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0]!;

    // A non-fatal per-file error mid-import, then the run completes anyway.
    await act(async () => {
      worker.onmessage?.({ data: { type: 'FILE_ERROR', filename: 'bad.txt', error: 'parse boom' } } as MessageEvent<WorkerMessage>);
    });
    await act(async () => {
      worker.onmessage?.({
        data: {
          type: 'COMPLETE', hands: [], summaries: [],
          importSummary: { totalFiles: 1, parsedFiles: 1, failedFiles: 1, handsFound: 0, summariesFound: 0, confidence: 'medium', warnings: [] },
        },
      } as MessageEvent<WorkerMessage>);
    });

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledTimes(1));
    expect(await findByText(/parse boom/i)).toBeInTheDocument();
  });

  it('clears the overlay and reports a worker onerror crash', async () => {
    const { container, findByText } = render(<HandsUpload onUploadSuccess={vi.fn()} />);
    selectFiles(container, [makeFile('hand.txt', "PokerStars Hand #1: Hold'em No Limit")]);
    await waitFor(() => expect(MockWorker.instances).toHaveLength(1));
    const worker = MockWorker.instances[0]!;

    await act(async () => {
      worker.onerror?.({ message: 'worker crashed' });
    });

    expect(await findByText(/worker crashed/i)).toBeInTheDocument();
    await waitFor(() => expect(useAppStore.getState().isImporting).toBe(false));
    expect(worker.terminate).toHaveBeenCalled();
  });

  // --- data-health + re-import notice (A1) ---

  it('shows the import-confidence badge when a run is retained', () => {
    liveQuery.runs = [makeRun(new Date('2026-06-21T00:00:00Z'), 'high')];
    const { getByText, queryByText } = render(<HandsUpload onUploadSuccess={vi.fn()} />);
    expect(getByText('high confidence')).toBeInTheDocument();
    expect(queryByText(/predate a chip-accounting fix/i)).not.toBeInTheDocument();
  });

  it('prompts a safe re-import when a retained run predates the chip-accounting fix', () => {
    liveQuery.runs = [makeRun(new Date('2026-06-01T00:00:00Z'), 'high')];
    const { getByText, getByRole } = render(<HandsUpload onUploadSuccess={vi.fn()} />);
    expect(getByText(/predate a chip-accounting fix/i)).toBeInTheDocument();
    expect(getByRole('button', { name: /re-import files/i })).toBeInTheDocument();
  });
});
