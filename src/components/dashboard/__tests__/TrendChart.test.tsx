import { describe, expect, it, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SessionTrendPoint } from '../../../data/sessions';
import { TrendChart } from '../TrendChart';
import '@testing-library/jest-dom';

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children?: ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ name }: { name?: string }) => <div data-testid="line">{name}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const trendData: SessionTrendPoint[] = [
  {
    sessionId: 'session-1',
    date: new Date('2026-05-01T12:00:00Z'),
    hands: 100,
    vpip: 22.5,
    pfr: 18,
    cbetTotal: 60,
    cbetHU: 65,
    wtsd: 24,
    compliance: 85,
    pnl: 15.5,
    cumulativePnl: 15.5,
    totalBb: 12,
    cumulativeBb: 12,
    bb100: 12,
  },
  {
    sessionId: 'session-2',
    date: new Date('2026-05-02T12:00:00Z'),
    hands: 150,
    vpip: 24,
    pfr: 19.5,
    cbetTotal: 65,
    cbetHU: 68,
    wtsd: 27,
    compliance: 88,
    pnl: 30,
    cumulativePnl: 45.5,
    totalBb: 20,
    cumulativeBb: 32,
    bb100: 13.3,
  },
];

const metrics = [
  { key: 'vpip', label: 'VPIP', color: '#ff0000' },
  { key: 'pfr', label: 'PFR', color: '#00ff00' },
] satisfies Array<{
  key: keyof SessionTrendPoint;
  label: string;
  color: string;
}>;

describe('TrendChart', () => {
  it('renders the empty state when no trend data is available', () => {
    const { container } = render(<TrendChart data={[]} metrics={metrics} />);

    expect(within(container).getByText('Not enough data for a trend chart. Import more sessions.')).toBeInTheDocument();
  });

  it('renders a chart with the configured metric lines', () => {
    const { container } = render(<TrendChart data={trendData} metrics={metrics} />);

    expect(within(container).getByTestId('responsive-container')).toBeInTheDocument();
    expect(within(container).getByTestId('line-chart')).toBeInTheDocument();
    expect(within(container).getByText('VPIP')).toBeInTheDocument();
    expect(within(container).getByText('PFR')).toBeInTheDocument();
  });
});
