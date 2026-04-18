/**
 * Trend chart — line graph showing stat evolution across sessions.
 * Uses Recharts.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { SessionTrendPoint } from '../../data/sessions';
import { format } from 'date-fns';

interface TrendChartProps {
  data: SessionTrendPoint[];
  metrics: Array<{
    key: keyof SessionTrendPoint;
    label: string;
    color: string;
    target?: [number, number]; // [min, max] target range
  }>;
  height?: number;
  /** Y-axis domain. Defaults to [0, 100] for percentage charts.
   *  Use ['auto', 'auto'] for monetary/non-percentage charts. */
  yDomain?: [number | 'auto', number | 'auto'];
}

export function TrendChart({ data, metrics, height = 300, yDomain = [0, 100] }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center">
        <p className="text-[var(--color-text-muted)] text-sm">
          Not enough data for a trend chart. Import more sessions.
        </p>
      </div>
    );
  }

  const isIntraSession = data.some(p => p.sessionId === 'intra');
  
  const chartData = data.map((point) => ({
    ...point,
    label: isIntraSession ? `#${point.hands}` : format(point.date, 'dd/MM'),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--color-border)' }}
        />
        <YAxis
          tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--color-border)' }}
          domain={yDomain}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--color-text-dim)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--color-text-dim)' }}
        />
        {metrics.map((m) => (
          <Line
            key={String(m.key)}
            type="monotone"
            dataKey={String(m.key)}
            name={m.label}
            stroke={m.color}
            strokeWidth={2}
            dot={{ r: 3, fill: m.color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
