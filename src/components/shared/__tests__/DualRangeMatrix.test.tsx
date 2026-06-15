import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RangeCellData } from '../DualRangeMatrix';
import { DualRangeMatrix } from '../DualRangeMatrix';
import '@testing-library/jest-dom';

const rangeData = new Map<string, RangeCellData>([
  [
    'AA',
    {
      handKey: 'AA',
      inTheoreticalRange: true,
      isPushHand: false,
      totalInstances: 5,
      correctInstances: 5,
      deviations: [],
      netProfit: 15,
      actionCounts: {
        fold: 0,
        call: 1,
        raise: 4,
        other: 0,
      },
    },
  ],
  [
    'AKo',
    {
      handKey: 'AKo',
      inTheoreticalRange: true,
      isPushHand: false,
      totalInstances: 3,
      correctInstances: 2,
      deviations: [
        {
          handId: 'hand-abc',
          action: 'fold',
          deviationType: 'OVERFOLD',
          stackBb: 30,
          date: new Date('2026-05-01T12:00:00Z'),
        },
      ],
      netProfit: -2,
      actionCounts: {
        fold: 1,
        call: 1,
        raise: 1,
        other: 0,
      },
    },
  ],
]);

function renderMatrix(onHandClick = vi.fn()) {
  return render(
    <DualRangeMatrix
      data={rangeData}
      onHandClick={onHandClick}
      position="UTG"
      viewMode="compliance"
    />
  );
}

function clickMirrorCell(handKey: string) {
  const button = screen.getAllByRole('button').find((cell) => cell.textContent === handKey);
  expect(button).toBeDefined();
  fireEvent.click(button!);
}

describe('DualRangeMatrix', () => {
  it('renders the theory and performance matrices', () => {
    renderMatrix();

    expect(screen.getByText('The Oracle (GTO)')).toBeInTheDocument();
    expect(screen.getByText('The Mirror (Performance)')).toBeInTheDocument();
  });

  it('shows the default detail pane before a hand is selected', () => {
    renderMatrix();

    expect(screen.getByText('Select a Hand')).toBeInTheDocument();
    expect(screen.getByText(/Compare theory vs\. reality/i)).toBeInTheDocument();
  });

  it('shows compliant hand details after selecting a mirror cell', () => {
    renderMatrix();

    clickMirrorCell('AA');

    expect(screen.getByText('UTG - Pre-flop')).toBeInTheDocument();
    expect(screen.getByText('GTO Standard')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Elite Execution')).toBeInTheDocument();
  });

  it('clears hover-driven details when leaving a mirror cell', async () => {
    renderMatrix();

    const button = screen.getAllByRole('button').find((cell) => cell.textContent === 'AA');
    expect(button).toBeDefined();
    fireEvent.mouseEnter(button!);

    expect(screen.getByText('UTG - Pre-flop')).toBeInTheDocument();

    fireEvent.mouseLeave(button!);

    await waitFor(() => {
      expect(screen.getByText('Select a Hand')).toBeInTheDocument();
    });
  });

  it('surfaces deviations and opens the related hand when clicked', () => {
    const onHandClick = vi.fn();
    renderMatrix(onHandClick);

    clickMirrorCell('AKo');

    expect(screen.getByText('Critical Deviations')).toBeInTheDocument();
    expect(screen.getByText('OVERFOLD')).toBeInTheDocument();
    expect(screen.getByText('Action: fold')).toBeInTheDocument();
    expect(screen.getByText('30bb')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /OVERFOLD.*Action: fold.*30bb/i }));

    expect(onHandClick).toHaveBeenCalledWith('hand-abc');
  });
});
