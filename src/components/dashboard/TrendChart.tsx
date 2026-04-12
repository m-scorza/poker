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
}

export function TrendChart({ data, metrics, height = 300 }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center">
        <p className="text-[var(--color-text-muted)] text-sm">
          Dados insuficientes para gráfico de tendência. Importe mais sessões.
        </p>
      </div>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    label: format(point.date, 'dd/MM'),
  }));

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
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
            domain={[0, 100]}
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
    </div>
  );
}
