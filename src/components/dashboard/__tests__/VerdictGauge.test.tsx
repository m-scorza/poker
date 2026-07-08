import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    set: vi.fn(),
    to: vi.fn(),
    fromTo: vi.fn(),
  },
}));

vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn(),
}));

import { VerdictGauge } from '../VerdictGauge';

describe('VerdictGauge', () => {
  it('routes the dashboard fix CTA into Coachs Note', () => {
    render(
      <MemoryRouter>
        <VerdictGauge
          score={42}
          verdictReco="Need More Sample"
          verdictConf="Confidence: Low"
          roi="-12.0%"
          totalPnl={-7.21}
          blockerTitle="C-bet HU"
          blockerDesc="Missed c-bets in heads-up pots as PFR"
          fixText="Open Coach's Note"
          fixHref="/"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /open coach's note/i })).toHaveAttribute('href', '/');
  });
});
