import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Supply a custom hero name without touching the persisted store (its
// localStorage backing isn't available in the test env). This also proves the
// sidebar binds to the configured name rather than a hardcoded literal.
vi.mock('../../../data/appStore', () => ({
  useAppStore: <T,>(selector: (s: { heroName: string }) => T): T =>
    selector({ heroName: 'Maverick' }),
}));

import { Sidebar } from '../Sidebar';

/**
 * Regression guard for CQ-1: the sidebar previously shipped fabricated stats
 * (hardcoded "+$388.85", "+141.4% ROI · 250 tourneys", identity "scorza23",
 * rating "Grinder · B+"). For a product whose thesis is trust, permanently
 * displayed fake numbers are disqualifying. The identity must reflect the
 * configured hero name and no invented numbers may appear.
 */
describe('Sidebar', () => {
  const renderSidebar = () =>
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

  it('shows the configured hero name and avatar initial', () => {
    const { container } = renderSidebar();
    expect(container.textContent).toContain('Maverick');
    // Avatar initial is derived from the configured hero name.
    expect(container.textContent).toContain('M');
  });

  it('renders no fabricated profit/ROI/rating literals', () => {
    const { container } = renderSidebar();
    const text = container.textContent ?? '';
    expect(text).not.toContain('388.85');
    expect(text).not.toContain('141.4');
    expect(text).not.toContain('250 tourneys');
    expect(text).not.toContain('Grinder');
    // The previously hardcoded identity must not leak with a different hero.
    expect(text).not.toContain('scorza23');
  });
});
