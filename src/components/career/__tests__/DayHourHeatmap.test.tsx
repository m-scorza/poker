import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import type { Tournament } from '../../../types/hand';
import { DayHourHeatmap } from '../DayHourHeatmap';

type ChartPoint = { day: number; hour: number; net: number; count: number };
let currentChartData: ChartPoint[] = [];

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ScatterChart: ({ children, data }: { children?: ReactNode; data?: ChartPoint[] }) => {
    currentChartData = data ?? [];
    return <div data-testid="scatter-chart" data-points={JSON.stringify(currentChartData)}>{children}</div>;
  },
  Scatter: ({ children, dataKey }: { children?: ReactNode; dataKey?: string }) => (
    <div data-testid="scatter" data-key={dataKey}>{children}</div>
  ),
  XAxis: ({ name, ticks }: { name?: string; ticks?: number[] }) => (
    <div data-testid="x-axis">{name} · {ticks?.join(',')}</div>
  ),
  YAxis: ({ name, ticks }: { name?: string; ticks?: number[] }) => (
    <div data-testid="y-axis">{name} · {ticks?.join(',')}</div>
  ),
  ZAxis: ({ dataKey, name }: { dataKey?: string; name?: string }) => (
    <div data-testid="z-axis">{name} · {dataKey}</div>
  ),
  Tooltip: ({ content }: { content?: (props: unknown) => ReactNode }) => (
    <div data-testid="tooltip">
      {content?.({ active: true, payload: [{ payload: currentChartData[0] }] })}
    </div>
  ),
  Cell: () => <div data-testid="cell" />,
}));

function tournament(id: string, startDate?: Date, prize = 0): Tournament {
  return {
    id,
    startDate,
    buyIn: 0,
    fee: 0,
    format: 'MTT',
    finishPosition: null,
    prize,
    bounty: 0,
    handsPlayed: 0,
    currency: 'USD',
  };
}

describe('DayHourHeatmap', () => {
  beforeEach(() => {
    currentChartData = [];
  });

  it('states the metric contract and renders a deliberate empty state', () => {
    render(<DayHourHeatmap tournaments={[tournament('undated')]} />);

    expect(screen.getByText('Tournament Net by Recorded Start Time')).toBeInTheDocument();
    expect(screen.getByText(/Recorded start time by weekday and hour/)).toBeInTheDocument();
    expect(screen.getByText(/Bubble size is the tournament sample/)).toBeInTheDocument();
    expect(screen.getByText('No dated tournament results are available for this chart.')).toBeInTheDocument();
    expect(screen.queryByTestId('scatter-chart')).not.toBeInTheDocument();
  });

  it('does not imply a time-of-day pattern from one populated bucket', () => {
    const sameHour = new Date(2026, 6, 20, 9, 0);
    render(<DayHourHeatmap tournaments={[
      tournament('one', sameHour, 8),
      tournament('two', new Date(2026, 6, 20, 9, 30), -3),
    ]} />);

    expect(screen.getByText('One populated time bucket is not enough to compare start-time performance.')).toBeInTheDocument();
    expect(screen.getByText(/2 tournaments · Net \+\$5\.00/)).toBeInTheDocument();
    expect(screen.queryByTestId('scatter-chart')).not.toBeInTheDocument();
  });

  it('groups dated results by local start bucket and exposes readable chart semantics', () => {
    render(<DayHourHeatmap tournaments={[
      tournament('one', new Date(2026, 6, 20, 9, 0), 8),
      tournament('two', new Date(2026, 6, 20, 9, 45), 2),
      tournament('three', new Date(2026, 6, 21, 15, 0), -4),
    ]} />);

    expect(screen.getByTestId('x-axis')).toHaveTextContent('Recorded start hour · 0,3,6,9,12,15,18,21');
    expect(screen.getByTestId('y-axis')).toHaveTextContent('Weekday · 0,1,2,3,4,5,6');
    expect(screen.getByTestId('z-axis')).toHaveTextContent('Tournament sample · count');

    const points = JSON.parse(screen.getByTestId('scatter-chart').getAttribute('data-points') ?? '[]') as ChartPoint[];
    expect(points).toEqual([
      { day: 1, hour: 9, net: 10, count: 2 },
      { day: 2, hour: 15, net: -4, count: 1 },
    ]);
    expect(screen.getByTestId('tooltip')).toHaveTextContent('Mon at 9:00');
    expect(screen.getByTestId('tooltip')).toHaveTextContent('Tournaments: 2');
    expect(screen.getByTestId('tooltip')).toHaveTextContent('Aggregate net: +$10.00');
    expect(screen.getByTestId('tooltip')).toHaveTextContent('Average: +$5.00 per tournament');
  });
});
