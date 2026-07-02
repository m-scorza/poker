import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoachsNote, CoachStudyPacketFocus } from '../../analysis/coachsNote';
import type { SpotPacket } from '../../analysis/spotPacket';
import { CoachsNotePage } from '../CoachsNotePage';

const liveQuery = vi.hoisted(() => ({ value: undefined as CoachsNote | undefined }));

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => liveQuery.value,
}));

vi.mock('../../data/appStore', () => ({
  useAppStore: () => ({
    strategyProfile: 'game_plan',
    setDemoSeedProgress: vi.fn(),
  }),
}));

vi.mock('../../data/store', () => ({
  db: {
    heroDecisions: {},
    hands: {},
    tournaments: {},
    players: {},
    actions: {},
  },
}));

vi.mock('../../components/shared/DemoDataButton', () => ({
  DemoDataButton: () => <button type="button">Load demo dataset</button>,
}));

function makePacket(overrides: { packetId?: string; handId?: string; handKey?: string } = {}): SpotPacket {
  const packetId = overrides.packetId ?? 'spot-h1';
  const handId = overrides.handId ?? 'h1';
  const handKey = overrides.handKey ?? 'QJs';
  return {
    packetId,
    source: {
      handId,
      site: 'pokerstars',
      parserConfidence: 'high',
    },
    hero: {
      handKey,
      position: 'BB',
      scenario: 'BB_VS_RAISE',
    },
    warnings: ['not_solver_backed', 'missing_payouts'],
    trainerPrompt: {
      legalActions: [
        { id: 'fold', action: 'fold', label: 'Fold' },
        { id: 'call-2bb', action: 'call', label: 'Call 2 BB' },
        { id: 'raise', action: 'raise', label: 'Raise' },
      ],
    },
  } as unknown as SpotPacket;
}

function makeFocusNote(studyPacketFocus: CoachStudyPacketFocus | null = {
  packet: makePacket(),
  srsStatus: 'SRS repeat due now',
}): CoachsNote {
  return {
    kind: 'focus',
    handsAnalyzed: 42,
    focus: {
      leakTitle: 'Folded suited BB defense',
      explanation: 'Review this leak before expanding the queue.',
      severity: 'high',
      confidence: 'medium',
      estimatedBbLoss: 12.5,
      evidence: {
        kind: 'tagged_decisions',
        label: 'Tagged decision cluster',
        details: ['3 tagged decisions'],
        trust: { kind: 'unsupported', citations: [] },
      },
      cta: 'Review hand queue',
    },
    ...(studyPacketFocus ? { studyPacketFocus } : {}),
    receipts: [{ handId: 'h1', reasons: [] }],
    noDecisiveHand: false,
    drillCta: 'Open the Arena and drill this pattern',
  } as CoachsNote;
}

describe('CoachsNotePage Study Queue packet panel', () => {
  beforeEach(() => {
    liveQuery.value = makeFocusNote();
  });

  it('renders the loading state while local hand data is being read', () => {
    liveQuery.value = undefined;

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Reading your hands…')).toBeInTheDocument();
    expect(screen.queryByTestId('coachs-note-study-packet')).not.toBeInTheDocument();
  });

  it('renders an import CTA without a packet panel when there is insufficient data', () => {
    liveQuery.value = {
      kind: 'insufficient_data',
      handsAnalyzed: 3,
      message: 'Only 3 decisions analysed so far — import at least 20 before we name your top leak.',
    };

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Not enough hands yet')).toBeInTheDocument();
    expect(screen.getByText(/Only 3 decisions analysed/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /import hands/i })).toHaveAttribute('href', '/hands');
    expect(screen.queryByTestId('coachs-note-study-packet')).not.toBeInTheDocument();
  });

  it('renders an all-clear state without creating a drill packet', () => {
    liveQuery.value = {
      kind: 'all_clear',
      handsAnalyzed: 32,
      message: 'No single leak stands out across this sample. Keep it up — re-check after your next session.',
    };

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No single leak stands out')).toBeInTheDocument();
    expect(screen.getByText('32 decisions analysed.')).toBeInTheDocument();
    expect(screen.queryByTestId('coachs-note-study-packet')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /drill packet/i })).not.toBeInTheDocument();
  });

  it('renders the selected local Study Queue packet with source boundaries and drill links', () => {
    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    const panel = screen.getByTestId('coachs-note-study-packet');
    expect(panel).toHaveTextContent('Next Study Queue packet');
    expect(panel).toHaveTextContent('Study-only · no EV');
    expect(panel).toHaveTextContent('QJs · BB · BB VS RAISE');
    expect(panel).toHaveTextContent('SRS repeat due now');
    expect(panel).toHaveTextContent('3 legal actions');
    expect(panel).toHaveTextContent('2 caveats');
    expect(panel).toHaveTextContent('Source: pokerstars / high');
    expect(panel).toHaveTextContent('no solver EV, trainer answer, trainer score');

    expect(screen.getByTestId('coachs-note-study-packet-review-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=h1#spot-packet',
    );
    const expectedArenaRoute = '/arena?drill=study-queue&handId=h1#study-packet-drill';
    expect(screen.getByTestId('coachs-note-study-packet-arena-link')).toHaveAttribute(
      'href',
      expectedArenaRoute,
    );
    expect(screen.getByTestId('coachs-note-final-drill-link')).toHaveAttribute('href', expectedArenaRoute);
    expect(screen.getByTestId('coachs-note-final-drill-link')).toHaveTextContent('Drill packet');
    expect(screen.queryByText(/EV loss|correct answer|trainer score:/i)).not.toBeInTheDocument();
  });

  it('carries the ordered multi-packet Arena drill route from the Study Queue router', () => {
    const packet = makePacket({ packetId: 'spot-h1', handId: 'h1' });
    liveQuery.value = makeFocusNote({
      packet,
      srsStatus: 'SRS repeat due now',
      arenaSessionHandIds: ['h1', 'h2'],
      arenaSessionPacketIds: ['spot-h1', 'spot-h2'],
    });

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    const expectedArenaRoute = '/arena?drill=study-queue&handId=h1&handIds=h1,h2&packetIds=spot-h1,spot-h2#study-packet-drill';
    expect(screen.getByTestId('coachs-note-study-packet-arena-link')).toHaveAttribute(
      'href',
      expectedArenaRoute,
    );
    expect(screen.getByTestId('coachs-note-final-drill-link')).toHaveAttribute('href', expectedArenaRoute);
  });

  it('encodes delimiter-sensitive hand and packet identifiers in packet-specific Arena routes', () => {
    liveQuery.value = makeFocusNote({
      packet: makePacket({ packetId: 'spot,1/ä', handId: 'hand,1/ä', handKey: 'A5s' }),
      srsStatus: 'SRS repeat due now',
      arenaSessionHandIds: ['hand,1/ä', 'hand 2/ß'],
      arenaSessionPacketIds: ['spot,1/ä', 'spot 2/ß'],
    });

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('coachs-note-study-packet-review-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=hand%2C1%2F%C3%A4#spot-packet',
    );
    const expectedArenaRoute = '/arena?drill=study-queue&handId=hand%2C1%2F%C3%A4&handIds=hand%2C1%2F%C3%A4,hand%202%2F%C3%9F&packetIds=spot%2C1%2F%C3%A4,spot%202%2F%C3%9F#study-packet-drill';
    expect(screen.getByTestId('coachs-note-study-packet-arena-link')).toHaveAttribute('href', expectedArenaRoute);
    expect(screen.getByTestId('coachs-note-final-drill-link')).toHaveAttribute('href', expectedArenaRoute);
  });

  it('keeps the generic Arena fallback when no Study Queue packet is selectable', () => {
    liveQuery.value = makeFocusNote(null);

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('coachs-note-study-packet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coachs-note-study-packet-review-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coachs-note-study-packet-arena-link')).not.toBeInTheDocument();
    const finalDrillLink = screen.getByTestId('coachs-note-final-drill-link');
    expect(finalDrillLink).toHaveAttribute('href', '/arena');
    expect(finalDrillLink).toHaveTextContent('The Arena');
    expect(screen.queryByText(/Study-only · no EV/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/solver EV|trainer answer|trainer score/i)).not.toBeInTheDocument();
  });

  it('encodes hand identifiers before linking the packet review target', () => {
    liveQuery.value = makeFocusNote({
      packet: makePacket({ packetId: 'spot-special', handId: 'hand 1/ä', handKey: 'A5s' }),
      srsStatus: 'SRS repeat starts after first review',
    });

    render(
      <MemoryRouter>
        <CoachsNotePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('coachs-note-study-packet-review-link')).toHaveAttribute(
      'href',
      '/hands?panel=spot-packet&reviewHand=hand%201%2F%C3%A4#spot-packet',
    );
  });
});
