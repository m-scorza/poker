import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import type { TiltReport } from '../../../analysis/tiltDetector';
import { MindsetCard } from '../MindsetCard';

function renderCard(report: TiltReport) {
  return render(
    <MemoryRouter>
      <MindsetCard report={report} />
    </MemoryRouter>,
  );
}

describe('MindsetCard', () => {
  it('renders the insufficient-data refusal plainly', () => {
    renderCard({
      kind: 'insufficient_data',
      triggersFound: 1,
      windowDecisions: 4,
      baselineDecisions: 80,
      message: 'Only 1 rough moment in this sample.',
    });
    expect(screen.getByText('Too early to read your mental game')).toBeInTheDocument();
    expect(screen.getByText('Only 1 rough moment in this sample.')).toBeInTheDocument();
    expect(screen.queryByText('Tilt signature')).not.toBeInTheDocument();
  });

  it('renders the steady state with the sample it rests on', () => {
    renderCard({
      kind: 'steady',
      triggersFound: 5,
      comparisons: [],
      message: '5 rough moments found — no tilt signature.',
    });
    expect(screen.getByText('Steady after the rough moments')).toBeInTheDocument();
    expect(screen.getByText(/5 rough moments · post-trigger play compared/)).toBeInTheDocument();
  });

  it('renders a tilt signature with signals, receipts, and confidence', () => {
    renderCard({
      kind: 'tilt_signature',
      triggersFound: 4,
      comparisons: [],
      signals: [
        {
          metric: 'compliance',
          windowPct: 62,
          baselinePct: 88,
          deltaPp: -26,
          windowSample: 40,
          baselineSample: 120,
        },
      ],
      receiptHandIds: ['111', '222'],
      confidence: 'high',
      message: 'Across 4 rough moments, range compliance drops 26pp.',
    });
    expect(screen.getByText('Tilt signature')).toBeInTheDocument();
    expect(screen.getByText('Your play changes after big losses')).toBeInTheDocument();
    expect(screen.getByText('range compliance')).toBeInTheDocument();
    expect(screen.getByText(/88% → 62%/)).toBeInTheDocument();
    expect(screen.getByText('#111')).toBeInTheDocument();
    expect(screen.getByText('#222')).toBeInTheDocument();
    expect(screen.getByText('high confidence')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Hands explorer/ })).toHaveAttribute('href', '/hands');
  });
});
