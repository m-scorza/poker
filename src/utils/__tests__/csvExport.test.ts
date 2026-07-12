// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { format } from 'date-fns';
import { exportSessionsCSV } from '../csvExport';
import type { Session } from '../../data/sessions';
import type { AggregateStats } from '../../analysis/leakDetector';

function makeAggregateStats(overrides: Partial<AggregateStats> = {}): AggregateStats {
  return {
    totalHands: 100,
    vpipHands: 25,
    pfrHands: 18,
    sawFlopHands: 20,
    threeBetOpps: 15,
    threeBetMade: 3,
    threeBetShoveOpps: 0,
    threeBetShoveMissed: 0,
    cbetOpps: 10,
    cbetMade: 7,
    cbetHUOpps: 8,
    cbetHUMade: 6,
    doubleBarrelOpps: 4,
    doubleBarrelMade: 2,
    wtsdHands: 8,
    wonSDHands: 5,
    limpHands: 2,
    totalBets: 10,
    totalRaises: 20,
    totalCalls: 15,
    complianceEligible: 50,
    complianceCompliant: 45,
    postflopErrors: new Map(),
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    startTime: new Date(2026, 5, 1, 10, 0, 0),
    endTime: new Date(2026, 5, 1, 12, 30, 0),
    tournamentIds: ['T1', 'T2'],
    hands: [],
    totalHands: 100,
    stats: makeAggregateStats(),
    buyIns: 20,
    prizes: 35,
    pnl: 15,
    roi: 0.75,
    totalBb: 12.5,
    bb100: 12.5,
    bb100Hands: 100,
    ...overrides,
  };
}

describe('exportSessionsCSV', () => {
  let capturedBlob: Blob | null;
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    capturedBlob = null;
    createObjectURLMock = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-csv-url';
    });
    revokeObjectURLMock = vi.fn();

    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds a CSV string with headers and data rows and triggers a download', async () => {
    const session = makeSession();
    exportSessionsCSV([session]);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(capturedBlob).not.toBeNull();
    expect(capturedBlob!.type).toBe('text/csv;charset=utf-8;');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-csv-url');

    const csvText = await capturedBlob!.text();
    expect(csvText.startsWith('\uFEFF')).toBe(true);
    const lines = csvText.slice(1).split('\n');
    const expectedHeader =
      'Session,Start Time,End Time,Hands,Tournaments,VPIP %,PFR %,C-bet Total %,C-bet HU %,WTSD %,Won at SD %,Compliance %,BB/100,Total BB,BB Sample Hands,Limps,3-bet %,Double Barrel %';
    const expectedDataRow =
      '"session-1","2026-06-01 10:00","2026-06-01 12:30","100","2","25.0","18.0","70.0","75.0","32.0","62.5","90.0","12.5","12.5","100","2","20.0","50.0"';

    expect(lines[0]).toBe(expectedHeader);
    expect(lines[1]).toBe(expectedDataRow);
  });

  it('handles sessions with zero bb100 hands by leaving BB columns empty', async () => {
    const session = makeSession({
      id: 'session-empty-bb',
      bb100Hands: 0,
      bb100: 0,
      totalBb: 0,
    });

    exportSessionsCSV([session]);

    const csvText = await capturedBlob!.text();
    const lines = csvText.replace(/^\uFEFF/, '').split('\n');
    expect(lines).toHaveLength(2);

    const expectedDataRow =
      '"session-empty-bb","2026-06-01 10:00","2026-06-01 12:30","100","2","25.0","18.0","70.0","75.0","32.0","62.5","90.0","","","0","2","20.0","50.0"';
    expect(lines[1]).toBe(expectedDataRow);
  });
});
