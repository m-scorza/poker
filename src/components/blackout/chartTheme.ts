export const chartGrid = {
  stroke: 'var(--border)',
  strokeDasharray: '3 3',
} as const;

export const chartAxisTick = {
  fill: 'var(--fg-dim)',
  fontFamily: 'var(--mono)',
  fontSize: 10,
} as const;

export const chartAxisLine = {
  stroke: 'var(--border)',
} as const;

export const chartTooltip = {
  contentStyle: {
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 0,
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: 'var(--fg)',
  },
  labelStyle: {
    color: 'var(--fg-dim)',
    fontFamily: 'var(--mono)',
    fontSize: 10,
  },
  itemStyle: {
    color: 'var(--fg)',
  },
} as const;

export const chartLegend = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--fg-dim)',
} as const;

export const chartSeries = {
  money: 'var(--money)',
  loss: 'var(--loss)',
  accent: 'var(--accent)',
  neutral: 'var(--fg-dim)',
} as const;

export const chartPalette = [
  chartSeries.accent,
  chartSeries.money,
  chartSeries.loss,
  chartSeries.neutral,
] as const;
