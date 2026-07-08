import { describe, expect, it } from 'vitest';
import {
  chartGrid,
  chartAxisTick,
  chartTooltip,
  chartSeries,
  chartPalette,
} from '../chartTheme';

describe('chartTheme', () => {
  it('pulls structure from chassis tokens', () => {
    expect(chartGrid.stroke).toBe('var(--border)');
    expect(chartAxisTick.fill).toBe('var(--fg-dim)');
    expect(chartAxisTick.fontFamily).toBe('var(--mono)');
    expect(chartTooltip.contentStyle.background).toBe('var(--bg-2)');
  });

  it('draws series only from data semantics, never violet', () => {
    const values = [...Object.values(chartSeries), ...chartPalette];
    for (const v of values) {
      expect(v).not.toContain('--sig');
    }
    expect(chartSeries.money).toBe('var(--money)');
    expect(chartSeries.loss).toBe('var(--loss)');
    expect(chartPalette).toContain('var(--accent)');
  });
});
