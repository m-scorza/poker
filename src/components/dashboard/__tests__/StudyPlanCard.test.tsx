import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { StudyPlanCard } from '../StudyPlanCard';
import type { StudyQueueItem } from '../../../analysis/studyPlan';
import type { SpotPacketBundle } from '../../../analysis/spotPacket';
import type { DataHealthSummary } from '../../../data/importRuns';

const item: StudyQueueItem = {
  id: 'deviation-BB_FOLD_SUITED',
  title: 'Folded suited BB defense',
  source: 'deviation',
  severity: 'high',
  priorityScore: 92,
  sampleSize: 3,
  estimatedBbLoss: 12,
  confidence: 'low',
  evidence: {
    kind: 'tagged_decisions',
    label: 'Tagged decision cluster',
    details: ['3 tagged decisions'],
    trust: { kind: 'unsupported', citations: [] },
  },
  handIds: ['h1', 'h2'],
  cta: 'Review hand queue',
  explanation: 'Review these hands as a local study packet bundle.',
};

const bundle = {
  schemaVersion: 'spot-packet-bundle/v1',
  bundleId: 'spot-bundle-test',
  inputHash: 'test-hash',
  createdAt: '2026-06-29T12:00:00.000Z',
  target: 'gto_wizard',
  evidenceLabel: 'study_packet_only',
  externalReview: {
    status: 'setup_checklist_only',
    target: 'gto_wizard',
    targetLabel: 'GTO Wizard',
    packetCount: 1,
    packetsWithChecklist: 1,
    packetsMissingChecklist: 0,
    targetHints: [
      {
        family: 'postflop_tree_review',
        targets: ['gto_wizard', 'postflopizer'],
        targetLabels: ['GTO Wizard', 'Postflopizer'],
        reason: 'postflop_tree_or_line_review',
        status: 'suggested_only',
        packetCount: 1,
      },
    ],
    missingAssumptionCounts: [
      { assumption: 'calculation_model', packetCount: 1 },
      { assumption: 'range_assumptions', packetCount: 1 },
      { assumption: 'tree_configuration', packetCount: 1 },
    ],
    result: {
      status: 'not_attached',
      evidenceLabel: 'study_packet_only',
      solverBacked: false,
    },
  },
  localOnly: true,
  source: {
    type: 'study_queue',
    itemCount: 1,
    requestedHandCount: 2,
    packetCount: 1,
  },
  warnings: ['not_solver_backed'],
  queueItems: [
    {
      itemId: 'deviation-BB_FOLD_SUITED',
      title: 'Folded suited BB defense',
      source: 'deviation',
      priorityScore: 92,
      confidence: 'low',
      handIds: ['h1', 'h2'],
      packetIds: ['spot-test'],
      missingHandIds: [],
    },
  ],
  omittedHands: [],
  packetIds: ['spot-test'],
  packets: [
    {
      packetId: 'spot-test',
      source: { handId: 'h1', site: 'pokerstars', parserConfidence: 'high' },
      evidenceLabel: 'study_packet_only',
      warnings: ['not_solver_backed'],
      hero: { handKey: 'AKs', position: 'BB', scenario: 'BB_VS_RAISE' },
      trainerPrompt: {
        legalActions: [
          { id: 'fold', action: 'fold', label: 'Fold' },
          { id: 'call-2bb', action: 'call', label: 'Call 2 BB' },
          { id: 'raise', action: 'raise', label: 'Raise' },
        ],
      },
      reviewQuestion: { ask: 'external_review' },
    },
  ],
} as unknown as SpotPacketBundle;

function makeTwoPacketBundle(): SpotPacketBundle {
  const firstPacket = bundle.packets[0]!;
  const secondPacket = {
    ...firstPacket,
    packetId: 'spot-test-2',
    source: { ...firstPacket.source, handId: 'h2' },
    hero: { ...firstPacket.hero, handKey: 'QJs', position: 'CO', scenario: 'RFI' },
    trainerPrompt: {
      ...firstPacket.trainerPrompt,
      legalActions: [
        { id: 'fold', action: 'fold', label: 'Fold' },
        { id: 'raise-2bb', action: 'raise', label: 'Raise 2 BB' },
      ],
    },
    reviewQuestion: { ...firstPacket.reviewQuestion, ask: 'study_prompt' },
  };

  return {
    ...bundle,
    source: { ...bundle.source, requestedHandCount: 2, packetCount: 2 },
    externalReview: bundle.externalReview ? {
      ...bundle.externalReview,
      packetCount: 2,
      packetsWithChecklist: 2,
      missingAssumptionCounts: bundle.externalReview.missingAssumptionCounts.map((row) => ({
        ...row,
        packetCount: 2,
      })),
    } : undefined,
    packetIds: ['spot-test', 'spot-test-2'],
    queueItems: bundle.queueItems.map((queueItem) => ({
      ...queueItem,
      handIds: ['h1', 'h2'],
      packetIds: ['spot-test', 'spot-test-2'],
    })),
    packets: [firstPacket, secondPacket],
  } as unknown as SpotPacketBundle;
}

const dataHealthItem: StudyQueueItem = {
  ...item,
  id: 'data-health-source-context',
  title: 'Data Health source/context review',
  source: 'data_health',
  severity: 'medium',
  priorityScore: 80,
  sampleSize: 7,
  estimatedBbLoss: null,
  confidence: 'low',
  evidence: {
    kind: 'source_context',
    label: 'Import/source context',
    details: ['7 hands with source/context caveats'],
    trust: { kind: 'unsupported', citations: [], note: 'Import/source context review only.' },
  },
  cta: 'Review source caveats',
  explanation: 'Review retained parser warnings and per-hand source caveats before external study.',
};

const importedAt = new Date('2026-06-29T12:00:00.000Z');

const STUDY_PACKET_PROGRESS_STORAGE_KEY = 'poker-hermes.studyPacketProgress.v1';

function installMemoryStorage(): void {
  const backing = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return backing.size;
    },
    clear: () => backing.clear(),
    getItem: (key) => backing.get(key) ?? null,
    key: (index) => Array.from(backing.keys())[index] ?? null,
    removeItem: (key) => {
      backing.delete(key);
    },
    setItem: (key, value) => {
      backing.set(key, value);
    },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: memoryStorage });
}

const dataHealthSummary: DataHealthSummary = {
  status: 'ready',
  confidence: 'medium',
  lastImportedAt: importedAt,
  totalRuns: 2,
  recentFiles: 4,
  recentSavedHands: 48,
  recentSavedSummaries: 1,
  recentFailedFiles: 1,
  warnings: ['sample warning'],
  message: 'Latest import has warnings; analysis should be treated as directional.',
  ledger: {
    analysisPosture: 'directional',
    latestConfidence: 'medium',
    latestImportedAt: importedAt,
    totalRuns: 2,
    totalFiles: 4,
    parsedFiles: 3,
    failedFiles: 1,
    savedHands: 48,
    savedSummaries: 1,
    parsedFileRate: 0.75,
    confidenceCounts: { high: 1, medium: 1, low: 0 },
    warningCategories: [
      { category: 'unsupported_format', label: 'Unsupported format', count: 2, examples: ['room.txt: unsupported'] },
      { category: 'summary_gap', label: 'Summary recovery gap', count: 1, examples: ['summary missing finish'] },
    ],
    reviewFocus: 'Latest import has warnings; review the top warning categories.',
  },
};

describe('StudyPlanCard', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('downloads the local-only Study Queue SpotPacket bundle without raw names', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn((_blob: Blob | MediaSource) => 'blob:study-packet-bundle');
    const revokeObjectURL = vi.fn((_url: string) => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    try {
      render(
        <MemoryRouter>
          <StudyPlanCard items={[item]} spotPacketBundle={bundle} />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('study-queue-card')).toBeInTheDocument();
      expect(screen.getByTestId('study-queue-top-block')).toBeInTheDocument();
      expect(screen.getByTestId('study-queue-item-1')).toHaveTextContent('Folded suited BB defense');
      expect(screen.getByTestId('study-queue-packet-bundle-summary')).toHaveTextContent(
        'Local-only bundle: 1 packet from 2 queued hands',
      );
      expect(screen.getByTestId('study-queue-packet-progress-summary')).toHaveTextContent('0/1 reviewed · 0 starred · 0 snoozed · 0 due now');
      expect(screen.getByTestId('study-queue-packet-progress-overview-copy')).toHaveTextContent('Next packet: SRS repeat starts after first review');
      expect(screen.getByTestId('study-queue-packet-progress-overview-copy')).toHaveTextContent('Reset in the source/config drawer');
      expect(screen.getByTestId('study-queue-next-packet-progress')).toHaveTextContent('not started');
      expect(screen.getByTestId('study-queue-next-packet-srs')).toHaveTextContent('SRS repeat starts after first review');
      expect(screen.getByTestId('study-queue-packet-bundle-config')).toHaveTextContent('SpotPacket source/config drawer');
      expect(screen.getByTestId('study-queue-packet-bundle-config')).toHaveTextContent('1/2 packet built');
      expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('AKs · BB · BB VS RAISE');
      expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('pokerstars / high · 3 legal actions · external review');
      expect(screen.getByTestId('study-queue-external-review-summary')).toHaveTextContent('GTO Wizard: 1/1 packet checklist-ready');
      expect(screen.getByTestId('study-queue-external-review-summary')).toHaveTextContent('range assumptions 1/1');
      expect(screen.getByTestId('study-queue-external-review-summary')).toHaveTextContent('GTO Wizard / Postflopizer · postflop tree/line review 1/1');
      expect(screen.getByTestId('study-queue-external-review-summary')).toHaveTextContent('target hints are suggested-only metadata');
      expect(screen.getByTestId('study-queue-external-review-summary')).toHaveTextContent('no auto-upload, solver EV, frequencies, trainer answers, or scoring attached');
      expect(screen.getByTestId('study-queue-packet-bundle-warnings')).toHaveTextContent('not solver-backed');
      expect(screen.getByTestId('study-queue-next-packet-review-link')).toHaveAttribute(
        'href',
        '/hands?panel=spot-packet&reviewHand=h1#spot-packet',
      );
      expect(screen.getByTestId('study-queue-next-packet-arena-link')).toHaveAttribute(
        'href',
        '/arena?drill=study-queue&handId=h1#study-packet-drill',
      );
      fireEvent.click(screen.getByTestId('study-queue-packet-bundle-export'));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0]![0] as Blob;
      expect(blob.type).toBe('application/json');
      const json = await blob.text();
      expect(json).toContain('"schemaVersion": "spot-packet-bundle/v1"');
      expect(json).toContain('"bundleId": "spot-bundle-test"');
      expect(json).toContain('"externalReview"');
      expect(json).toContain('"missingAssumptionCounts"');
      expect(json).toContain('"range_assumptions"');
      expect(json).not.toContain('VillainA');
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:study-packet-bundle');
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
      click.mockRestore();
    }
  });

  it('encodes delimiter-sensitive packet IDs across Dashboard Hand Replay and Arena CTAs', () => {
    const firstPacket = {
      ...bundle.packets[0]!,
      packetId: 'spot,one/ä',
      source: { ...bundle.packets[0]!.source, handId: 'hand,one/ä' },
    };
    const secondPacket = {
      ...bundle.packets[0]!,
      packetId: 'spot two/ß',
      source: { ...bundle.packets[0]!.source, handId: 'hand two/ß' },
      hero: { ...bundle.packets[0]!.hero, handKey: 'T9s', position: 'BTN', scenario: 'RFI' },
    };
    const specialBundle = {
      ...bundle,
      source: { ...bundle.source, requestedHandCount: 2, packetCount: 2 },
      packetIds: [firstPacket.packetId, secondPacket.packetId],
      queueItems: bundle.queueItems.map((queueItem) => ({
        ...queueItem,
        handIds: [firstPacket.source.handId, secondPacket.source.handId],
        packetIds: [firstPacket.packetId, secondPacket.packetId],
      })),
      packets: [firstPacket, secondPacket],
    } as unknown as SpotPacketBundle;

    render(
      <MemoryRouter>
        <StudyPlanCard items={[item]} spotPacketBundle={specialBundle} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('study-queue-next-packet-review-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=hand%2Cone%2F%C3%A4#spot-packet',
    );
    expect(screen.getByTestId('study-queue-next-packet-arena-link')).toHaveAttribute(
      'href',
      '/arena?drill=study-queue&handId=hand%2Cone%2F%C3%A4&handIds=hand%2Cone%2F%C3%A4,hand%20two%2F%C3%9F&packetIds=spot%2Cone%2F%C3%A4,spot%20two%2F%C3%9F#study-packet-drill',
    );
  });

  it('stores browser-only reviewed, starred, snoozed, and SRS markers for the next packet', () => {
    render(
      <MemoryRouter>
        <StudyPlanCard items={[item]} spotPacketBundle={bundle} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('study-queue-next-packet-review-link'));
    fireEvent.click(screen.getByTestId('study-queue-toggle-star-button'));
    fireEvent.click(screen.getByTestId('study-queue-toggle-snooze-button'));

    expect(screen.getByTestId('study-queue-packet-progress-summary')).toHaveTextContent('1/1 reviewed · 1 starred · 1 snoozed · 0 due now');
    expect(screen.getByTestId('study-queue-next-packet-progress')).toHaveTextContent('reviewed · starred · snoozed');
    expect(screen.getByTestId('study-queue-next-packet-srs')).toHaveTextContent('SRS repeat snoozed');
    expect(screen.getByTestId('study-queue-mark-reviewed-button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('study-queue-toggle-star-button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('study-queue-toggle-snooze-button')).toHaveAttribute('aria-pressed', 'true');

    const stored = JSON.parse(window.localStorage.getItem(STUDY_PACKET_PROGRESS_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(stored['spot-test']).toMatchObject({
      packetId: 'spot-test',
      handId: 'h1',
      starred: true,
      repetitionCount: 1,
      intervalDays: 1,
    });
    const entry = stored['spot-test'] as Record<string, unknown>;
    expect(entry.reviewedAt).toEqual(expect.any(String));
    expect(entry.snoozedAt).toEqual(expect.any(String));
    expect(entry.lastDrilledAt).toEqual(expect.any(String));
    expect(entry.nextDueAt).toEqual(expect.any(String));
    expect(JSON.stringify(stored)).not.toContain('VillainA');

    fireEvent.click(screen.getByTestId('study-queue-reset-progress-button'));

    expect(screen.getByTestId('study-queue-packet-progress-summary')).toHaveTextContent('0/1 reviewed · 0 starred · 0 snoozed · 0 due now');
    expect(screen.getByTestId('study-queue-next-packet-progress')).toHaveTextContent('not started');
    expect(screen.getByTestId('study-queue-next-packet-srs')).toHaveTextContent('SRS repeat starts after first review');
    expect(screen.getByTestId('study-queue-mark-reviewed-button')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('study-queue-toggle-star-button')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('study-queue-toggle-snooze-button')).toHaveAttribute('aria-pressed', 'false');
    const resetStored = JSON.parse(window.localStorage.getItem(STUDY_PACKET_PROGRESS_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(resetStored['spot-test']).toBeUndefined();
    expect(JSON.stringify(resetStored)).not.toContain('VillainA');
  });

  it('routes due reviewed SpotPackets back into the local SRS loop before untouched packets', () => {
    window.localStorage.setItem(
      STUDY_PACKET_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        'spot-test': {
          packetId: 'spot-test',
          handId: 'h1',
          reviewedAt: '2026-06-20T12:00:00.000Z',
          lastDrilledAt: '2026-06-20T12:00:00.000Z',
          nextDueAt: '2026-06-21T12:00:00.000Z',
          repetitionCount: 1,
          intervalDays: 1,
          starred: false,
          updatedAt: '2026-06-20T12:00:00.000Z',
        },
      }),
    );

    render(
      <MemoryRouter>
        <StudyPlanCard items={[item]} spotPacketBundle={makeTwoPacketBundle()} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('study-queue-packet-progress-summary')).toHaveTextContent('1/2 reviewed · 0 starred · 0 snoozed · 1 due now');
    expect(screen.getByTestId('study-queue-packet-progress-overview-copy')).toHaveTextContent('1 packet due now');
    expect(screen.getByTestId('study-queue-packet-progress-overview-copy')).toHaveTextContent('Next packet: SRS repeat due now');
    expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('AKs · BB · BB VS RAISE');
    expect(screen.getByTestId('study-queue-next-packet-progress')).toHaveTextContent('reviewed · SRS due');
    expect(screen.getByTestId('study-queue-next-packet-srs')).toHaveTextContent('SRS repeat due now');
    expect(screen.getByTestId('study-queue-next-packet-review-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=h1#spot-packet',
    );
    expect(screen.getByTestId('study-queue-next-packet-arena-link')).toHaveAttribute(
      'href',
      '/arena?drill=study-queue&handId=h1&handIds=h1,h2&packetIds=spot-test,spot-test-2#study-packet-drill',
    );
  });

  it('advances the next actionable packet past browser-local snoozed markers', () => {
    window.localStorage.setItem(
      STUDY_PACKET_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        'spot-test': {
          packetId: 'spot-test',
          handId: 'h1',
          snoozedAt: '2026-06-29T12:30:00.000Z',
          starred: false,
          updatedAt: '2026-06-29T12:30:00.000Z',
        },
      }),
    );

    render(
      <MemoryRouter>
        <StudyPlanCard items={[item]} spotPacketBundle={makeTwoPacketBundle()} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('study-queue-packet-progress-summary')).toHaveTextContent('0/2 reviewed · 0 starred · 1 snoozed · 0 due now');
    expect(screen.getByTestId('study-queue-packet-progress-overview-copy')).toHaveTextContent('1 packet snoozed and skipped by routing');
    expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('QJs · CO · RFI');
    expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('pokerstars / high · 2 legal actions · study prompt');
    expect(screen.getByTestId('study-queue-next-packet-review-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=h2#spot-packet',
    );
    expect(screen.getByTestId('study-queue-next-packet-arena-link')).toHaveAttribute(
      'href',
      '/arena?drill=study-queue&handId=h2#study-packet-drill',
    );

    fireEvent.click(screen.getByTestId('study-queue-next-packet-review-link'));

    expect(screen.getByTestId('study-queue-packet-progress-summary')).toHaveTextContent('1/2 reviewed · 0 starred · 1 snoozed · 0 due now');
    const stored = JSON.parse(window.localStorage.getItem(STUDY_PACKET_PROGRESS_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(stored['spot-test-2']).toMatchObject({
      packetId: 'spot-test-2',
      handId: 'h2',
      repetitionCount: 1,
      intervalDays: 1,
      starred: false,
    });
    expect(JSON.stringify(stored)).not.toContain('VillainA');
  });

  it('withholds packet CTAs when every local packet is skipped but keeps marker controls recoverable', () => {
    window.localStorage.setItem(
      STUDY_PACKET_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        'spot-test': {
          packetId: 'spot-test',
          handId: 'h1',
          snoozedAt: '2026-06-29T12:30:00.000Z',
          starred: false,
          updatedAt: '2026-06-29T12:30:00.000Z',
        },
        'spot-test-2': {
          packetId: 'spot-test-2',
          handId: 'h2',
          snoozedAt: '2026-06-29T12:35:00.000Z',
          starred: false,
          updatedAt: '2026-06-29T12:35:00.000Z',
        },
      }),
    );

    render(
      <MemoryRouter>
        <StudyPlanCard items={[item]} spotPacketBundle={makeTwoPacketBundle()} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('study-queue-packet-progress-summary')).toHaveTextContent('0/2 reviewed · 0 starred · 2 snoozed · 0 due now');
    expect(screen.getByTestId('study-queue-packet-progress-overview-copy')).toHaveTextContent('2 packets snoozed and skipped by routing');
    expect(screen.getByTestId('study-queue-packet-progress-overview-copy')).toHaveTextContent('No actionable packet is due now');
    expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('No actionable packet due now');
    expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('snoozed packets stay skipped until unsnoozed or reset');
    expect(screen.queryByTestId('study-queue-next-packet-review-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('study-queue-next-packet-arena-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('study-queue-next-packet-progress')).toHaveTextContent('Skipped packet progress');
    expect(screen.getByTestId('study-queue-next-packet-progress')).toHaveTextContent('snoozed');
    expect(screen.getByTestId('study-queue-next-packet-srs')).toHaveTextContent('unsnooze or reset it if you want it to become actionable again');

    fireEvent.click(screen.getByTestId('study-queue-toggle-snooze-button'));

    expect(screen.getByTestId('study-queue-packet-progress-summary')).toHaveTextContent('0/2 reviewed · 0 starred · 1 snoozed · 0 due now');
    expect(screen.getByTestId('study-queue-next-packet-summary')).toHaveTextContent('AKs · BB · BB VS RAISE');
    expect(screen.getByTestId('study-queue-next-packet-review-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=h1#spot-packet',
    );
    expect(screen.getByTestId('study-queue-next-packet-arena-link')).toHaveAttribute(
      'href',
      '/arena?drill=study-queue&handId=h1#study-packet-drill',
    );
  });

  it('links Data Health queue items to the Hands importer panel and summarizes retained warning categories', () => {
    render(
      <MemoryRouter>
        <StudyPlanCard items={[dataHealthItem]} dataHealthSummary={dataHealthSummary} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('study-queue-item-1')).toHaveAttribute('href', '/hands?panel=data-health#data-health');
    expect(screen.getByTestId('study-queue-data-health-link')).toHaveAttribute('href', '/hands?panel=data-health#data-health');
    expect(screen.getByTestId('study-queue-data-health-summary')).toHaveTextContent('3/4 files parsed');
    expect(screen.getByTestId('study-queue-data-health-summary')).toHaveTextContent('Unsupported format 2');
    expect(screen.getByTestId('study-queue-data-health-summary')).toHaveTextContent('Summary recovery gap 1');
  });
});
