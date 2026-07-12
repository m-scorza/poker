import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '../../data/sessions';
import type { AggregateStats } from '../../analysis/leakDetector';

const saveMock = vi.fn();
const textMock = vi.fn();
const addPageMock = vi.fn();
const setPageMock = vi.fn();

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function (this: Record<string, unknown>) {
    let pages = 1;
    this.internal = { pageSize: { getWidth: () => 297, getHeight: () => 210 } };
    this.setFontSize = vi.fn();
    this.setTextColor = vi.fn();
    this.text = textMock;
    this.addPage = addPageMock.mockImplementation(() => {
      pages += 1;
    });
    this.getNumberOfPages = () => pages;
    this.setPage = setPageMock;
    this.save = saveMock;
  }),
}));

const autoTableMock = vi.fn();
vi.mock('jspdf-autotable', () => ({ default: autoTableMock }));

const { exportSessionsPDF } = await import('../pdfExport');

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

describe('exportSessionsPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates stats across sessions into the overview table', () => {
    const sessions = [
      makeSession(),
      makeSession({ id: 'session-2', totalBb: 7.5, bb100Hands: 100 }),
    ];
    exportSessionsPDF(sessions);

    const overview = autoTableMock.mock.calls[0]![1];
    expect(overview.head).toEqual([['Stat', 'Value']]);
    expect(overview.body).toEqual([
      ['Hands', '200'],
      ['BB/100', '10.0'], // (12.5 + 7.5) / 200 * 100
      ['Total BB', '20.0'],
      ['VPIP', '25.0%'], // 50 / 200
      ['PFR', '18.0%'],
      ['C-bet Total', '70.0%'],
      ['C-bet HU', '75.0%'],
      ['Double Barrel', '50.0%'],
      ['3-bet', '20.0%'],
      ['WTSD', '32.0%'], // 16 / 50
      ['Won at SD', '62.5%'],
      ['Compliance', '90.0%'],
      ['Limps', '4'],
    ]);
  });

  it('renders em-dash for zero denominators and zero bb sample', () => {
    const session = makeSession({
      totalBb: 0,
      bb100Hands: 0,
      stats: makeAggregateStats({
        cbetOpps: 0,
        cbetMade: 0,
        cbetHUOpps: 0,
        cbetHUMade: 0,
        wtsdHands: 0,
        wonSDHands: 0,
      }),
    });
    exportSessionsPDF([session]);

    const body: string[][] = autoTableMock.mock.calls[0]![1].body;
    const byStat = new Map(body.map(([k, v]) => [k, v]));
    expect(byStat.get('BB/100')).toBe('—');
    expect(byStat.get('Total BB')).toBe('—');
    expect(byStat.get('C-bet Total')).toBe('—');
    expect(byStat.get('C-bet HU')).toBe('—');
    expect(byStat.get('Won at SD')).toBe('—');
  });

  it('renders leak rows with severity labels and signed deviation', () => {
    const leaks = [
      {
        name: 'Overfolding BB',
        severity: 'critical',
        value: 48.2,
        target: [25, 35],
        deviation: 13.2,
      },
      {
        name: 'Low c-bet',
        severity: 'low',
        value: 52.1,
        target: [60, 70],
        deviation: -7.9,
      },
    ] as unknown as Parameters<typeof exportSessionsPDF>[1];

    exportSessionsPDF([makeSession()], leaks);

    const leakTable = autoTableMock.mock.calls[1]![1];
    expect(leakTable.head).toEqual([['Leak', 'Severity', 'Current', 'Target', 'Deviation']]);
    expect(leakTable.body).toEqual([
      ['Overfolding BB', 'CRITICAL', '48.2', '25–35', '+13.2'],
      ['Low c-bet', 'LOW', '52.1', '60–70', '-7.9'],
    ]);
  });

  it('adds a second page with one 17-column row per session', () => {
    exportSessionsPDF([makeSession()]);

    expect(addPageMock).toHaveBeenCalledWith('landscape');
    const sessionTable = autoTableMock.mock.calls[1]![1];
    expect(sessionTable.head![0]).toHaveLength(17);
    expect(sessionTable.body).toEqual([
      [
        'session-1', '06-01 10:00', '06-01 12:30', '100', '2',
        '25.0%', '18.0%', '70.0%', '75.0%', '32.0%', '62.5%', '90.0%',
        '12.5', '12.5', '2', '20.0%', '50.0%',
      ],
    ]);
  });

  it('saves a dated filename, stamps the hero on header and footer', () => {
    exportSessionsPDF([makeSession()], [], 'hero99');

    expect(saveMock).toHaveBeenCalledTimes(1);
    const filename: string = saveMock.mock.calls[0]![0];
    expect(filename).toMatch(/^poker-report-\d{4}-\d{2}-\d{2}\.pdf$/);

    const texts = textMock.mock.calls.map((c) => c[0] as string);
    expect(texts).toContain('Session Report — hero99');
    expect(texts.some((t) => t.startsWith('Poker Hand Analyzer — hero99 — Page 1/2'))).toBe(true);
  });

  it('skips both tables but still saves when there is nothing to render', () => {
    exportSessionsPDF([]);

    expect(autoTableMock).not.toHaveBeenCalled();
    expect(addPageMock).not.toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledTimes(1);
  });
});
