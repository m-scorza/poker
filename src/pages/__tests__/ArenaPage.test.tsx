import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArenaPage, getDisplayCards, getDrillPool, isCbetActionCorrect } from '../ArenaPage';
import { getAllHeroDecisions, getSrsReviews, recordSrsReview } from '../../data/store';
import type { HeroDecision } from '../../types/analysis';

vi.mock('../../data/appStore', () => ({
  useAppStore: () => ({ strategyProfile: 'game_plan' }),
}));

vi.mock('../../data/store', () => ({
  getAllHeroDecisions: vi.fn(),
  getSrsReviews: vi.fn(() => Promise.resolve([])),
  recordSrsReview: vi.fn(() => Promise.resolve()),
}));

function decision(overrides: Partial<HeroDecision> = {}): HeroDecision {
  return {
    handId: 'h1',
    position: 'CO',
    handKey: 'AKs',
    stackBb: 30,
    scenario: 'RFI',
    action: 'raise',
    isCompliant: true,
    deviationType: null,
    sawFlop: false,
    wasPreFlopRaiser: true,
    cbetOpportunity: false,
    cbetMade: false,
    cbetHU: false,
    doubleBarrelOpportunity: false,
    doubleBarrelMade: false,
    wentToShowdown: false,
    wonAtShowdown: false,
    wonAmount: 0,
    netProfit: 0,
    ...overrides,
  };
}

describe('ArenaPage drill helpers', () => {
  it('filters C-bet Clinic to actual c-bet opportunities', () => {
    const cbetSpot = decision({ handId: 'cbet', cbetOpportunity: true, sawFlop: true });
    const rfiSpot = decision({ handId: 'rfi', cbetOpportunity: false });

    expect(getDrillPool('cbet_clinic', [rfiSpot, cbetSpot], 'game_plan')).toEqual([cbetSpot]);
  });

  it('grades C-bet Clinic actions from postflop flags', () => {
    const missedCbet = decision({
      cbetOpportunity: true,
      cbetMade: false,
      postflopActions: [{
        spot: 'MISSED_CBET',
        street: 'flop',
        sizing: null,
        isCorrect: false,
        note: 'Missed c-bet',
      }],
    });
    const acceptableCheck = decision({ cbetOpportunity: true, cbetMade: false, postflopActions: [] });
    const madeCbet = decision({ cbetOpportunity: true, cbetMade: true });

    expect(isCbetActionCorrect(missedCbet, 'bet')).toBe(true);
    expect(isCbetActionCorrect(missedCbet, 'check')).toBe(false);
    expect(isCbetActionCorrect(acceptableCheck, 'check')).toBe(true);
    expect(isCbetActionCorrect(madeCbet, 'bet')).toBe(true);
  });

  it('maps hand keys to display cards without duplicate branch logic', () => {
    expect(getDisplayCards('AA')).toEqual(['As', 'Ah']);
    expect(getDisplayCards('AKs')).toEqual(['As', 'Ks']);
    expect(getDisplayCards('AKo')).toEqual(['As', 'Kh']);
  });
});

describe('ArenaPage drill start behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the shared dialog instead of window.alert when a drill has no pool', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([decision({ cbetOpportunity: false })]);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /C-bet Clinic/i }));

    expect(await screen.findByRole('dialog', { name: 'Not enough data' })).toBeInTheDocument();
    expect(screen.getByText(/No C-bet Clinic spots are available yet/i)).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('starts C-bet Clinic on flop-stage controls', async () => {
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'cbet', cbetOpportunity: true, cbetMade: true, sawFlop: true }),
    ]);

    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole('button', { name: /C-bet Clinic/i }));

    await waitFor(() => expect(screen.getByText('Stage: Flop')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C-bet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fold' })).not.toBeInTheDocument();
  });

  it('drills spaced review from real misplays: counts, persistence, completion', async () => {
    // A UTG 72o open is out of range -> a graded fault, never reviewed before.
    vi.mocked(getAllHeroDecisions).mockResolvedValue([
      decision({ handId: 'f1', position: 'UTG', handKey: '72o', action: 'raise', stackBb: 30 }),
    ]);
    vi.mocked(getSrsReviews).mockResolvedValue([]);

    render(<ArenaPage />);

    // The Spaced Review card surfaces it as one "new" pattern, nothing due.
    const newLabel = await screen.findByText('New');
    expect(newLabel.previousElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Due').previousElementSibling).toHaveTextContent('0');

    // Start the review and answer the single card. Folding a 72o open is correct.
    fireEvent.click(screen.getByText(/Drill your real mistakes/i).closest('button')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Fold' }));

    // The outcome is persisted against the abstract pattern key.
    expect(recordSrsReview).toHaveBeenCalledWith('RFI|UTG|72o|ge10|-', true);

    // It was the last card, so the session completes after the advance delay.
    expect(
      await screen.findByText('Session complete.', undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});
