import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn((query: () => unknown) => {
    const source = query.toString();
    if (source.includes('db.hands.count')) return 1;
    return { rawHands: [], rawDecisions: [], rawTournaments: [] };
  }),
}));

vi.mock('../../data/appStore', () => ({
  useAppStore: () => ({ strategyProfile: 'game_plan', activeSessionId: 'all' }),
}));

vi.mock('../../components/dashboard/WireTape', () => ({
  WireTape: () => <div data-testid="wire-tape" />,
}));
vi.mock('../../components/dashboard/MonumentCurve', () => ({
  MonumentCurve: () => <div data-testid="monument-curve" />,
}));
vi.mock('../../components/dashboard/VerdictGauge', () => ({
  VerdictGauge: () => <div data-testid="verdict-gauge" />,
}));
vi.mock('../../components/dashboard/RingHud', () => ({
  RingHud: () => <div data-testid="ring-hud" />,
}));
vi.mock('../../components/dashboard/BankrollChart', () => ({
  BankrollChart: () => <div data-testid="bankroll-chart" />,
}));
vi.mock('../../components/dashboard/PositionalHeatmap', () => ({
  PositionalHeatmap: () => <div data-testid="positional-heatmap" />,
}));

import { DashboardPage } from '../DashboardPage';

describe('DashboardPage', () => {
  it('keeps report export as a real local markdown download without sync chrome', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURL = vi.fn((_blob: Blob | MediaSource) => 'blob:dashboard-report');
    const revokeObjectURL = vi.fn((_url: string) => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

    try {
      render(<DashboardPage />);

      expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /export report/i }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0]![0] as Blob;
      expect(blob.type).toBe('text/markdown;charset=utf-8');
      await expect(blob.text()).resolves.toContain('# Poker Career Coach Report');
      await expect(blob.text()).resolves.toContain('Generated locally by Poker Analyzer');
      await expect(blob.text()).resolves.not.toContain('HUD');
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:dashboard-report');
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
      click.mockRestore();
    }
  });
});
