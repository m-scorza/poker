import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import type { BustOutBucket } from '../../../analysis/careerStats';
import { BustOutChart } from '../BustOutChart';

type ChartBucket = BustOutBucket & { displayValue: string };
let currentChartData: ChartBucket[] = [];

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children?: ReactNode; data?: ChartBucket[] }) => {
    currentChartData = data ?? [];
    return <div data-testid="bar-chart" data-buckets={JSON.stringify(currentChartData)}>{children}</div>;
  },
  Bar: ({ children, dataKey }: { children?: ReactNode; dataKey?: string }) => (
    <div data-testid="bar" data-key={dataKey}>{children}</div>
  ),
  XAxis: ({ domain, ticks }: { domain?: number[]; ticks?: number[] }) => (
    <div data-testid="x-axis">domain {domain?.join(',')} · ticks {ticks?.join(',')}</div>
  ),
  YAxis: ({ dataKey }: { dataKey?: string }) => <div data-testid="y-axis">{dataKey}</div>,
  Tooltip: ({ formatter }: {
    formatter?: (value: number, name: string, item: { payload: ChartBucket }) => [string, string];
  }) => {
    const bucket = currentChartData[0];
    const formatted = bucket ? formatter?.(bucket.count, 'count', { payload: bucket }) : null;
    return <div data-testid="tooltip">{formatted?.join(' · ')}</div>;
  },
  Cell: () => <div data-testid="cell" />,
  LabelList: ({ dataKey }: { dataKey?: string }) => <div data-testid="label-list">{dataKey}</div>,
}));

const data: BustOutBucket[] = [
  { label: 'Win', rangeLabel: '1st', count: 1, percentage: 12.5, denominator: 8, color: '#fbbf24' },
  { label: 'Top 9', rangeLabel: '2nd–9th', count: 2, percentage: 25, denominator: 8, color: '#f59e0b' },
  { label: 'Top 45', rangeLabel: '10th–45th', count: 2, percentage: 25, denominator: 8, color: '#10b981' },
  { label: 'Top 150', rangeLabel: '46th–150th', count: 2, percentage: 25, denominator: 8, color: '#3b82f6' },
  { label: '151+', rangeLabel: '151st+', count: 1, percentage: 12.5, denominator: 8, color: '#ef4444' },
];

describe('BustOutChart', () => {
  beforeEach(() => {
    currentChartData = [];
  });

  it('renders a deliberate empty state without a chart', () => {
    render(<BustOutChart data={[]} />);

    expect(screen.getByText('No finish data available')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('states the denominator and uses one visible scale for every finish band', () => {
    render(<BustOutChart data={data} />);

    expect(screen.getByText(/8 tournament results with a recorded finish/)).toHaveTextContent(
      'Each bar uses the same 0–8 tournament scale.',
    );
    expect(screen.getByTestId('x-axis')).toHaveTextContent('domain 0,8 · ticks 0,8');
    expect(screen.getByTestId('y-axis')).toHaveTextContent('rangeLabel');
    expect(screen.getByTestId('label-list')).toHaveTextContent('displayValue');
    expect(screen.getByTestId('tooltip')).toHaveTextContent('1 of 8 (12.5%) · Win');

    const chartBuckets = JSON.parse(screen.getByTestId('bar-chart').getAttribute('data-buckets') ?? '[]') as ChartBucket[];
    expect(chartBuckets.map(({ rangeLabel, displayValue }) => ({ rangeLabel, displayValue }))).toEqual([
      { rangeLabel: '1st', displayValue: '1 · 12.5%' },
      { rangeLabel: '2nd–9th', displayValue: '2 · 25.0%' },
      { rangeLabel: '10th–45th', displayValue: '2 · 25.0%' },
      { rangeLabel: '46th–150th', displayValue: '2 · 25.0%' },
      { rangeLabel: '151st+', displayValue: '1 · 12.5%' },
    ]);
  });
});
