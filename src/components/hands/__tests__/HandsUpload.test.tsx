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
  hasPreFixImportRuns: vi.fn().mockResolvedValue(false),
  CHIP_ACCOUNTING_FIX_DATE: new Date('2026-06-15T00:00:00Z'),
}));

vi.mock('../../../data/store', () => storeMocks);

// useLiveQuery just returns its default value so the component renders without
// a live IndexedDB subscription.
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (_querier: unknown, _deps: unknown, defaultValue: unknown) => defaultValue,
}));

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

const MB = 1024 * 1024;

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
});
