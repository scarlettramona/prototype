import { AMBER, MAX_SERIES, SERIES_COLORS, seriesStyle } from './chart-palette';
import { buildPlutoChartTheme, withAlpha } from './pluto-chart-theme';

describe('Chart palette', () => {
  it('gives 40 distinct colour + dash combinations', () => {
    const combos = Array.from({ length: MAX_SERIES }, (_, i) => JSON.stringify(seriesStyle(i)));
    expect(MAX_SERIES).toBe(40);
    expect(new Set(combos).size).toBe(40);
    expect(seriesStyle(0).dash).toBe('solid');
    expect(seriesStyle(10).dash).toEqual([7, 3]);
  });

  it('never uses amber as a series colour', () => {
    expect(SERIES_COLORS).not.toContain(AMBER);
  });

  it('builds the theme from tokens', () => {
    const theme = buildPlutoChartTheme({
      surfaceContainer: 'rgb(30, 32, 34)',
      surfaceContainerLowest: 'rgb(12, 14, 16)',
      onSurface: 'rgb(226, 226, 229)',
      onSurfaceVariant: 'rgb(221, 227, 233)',
      outline: 'rgb(139, 145, 151)',
      outlineVariant: 'rgb(65, 72, 77)',
      primary: 'rgb(158, 204, 234)',
    }) as { backgroundColor: string; tooltip: { backgroundColor: string; borderColor: string } };
    expect(theme.backgroundColor).toBe('transparent');
    expect(theme.tooltip.backgroundColor).toBe('rgb(12, 14, 16)');
    expect(theme.tooltip.borderColor).toBe('rgb(139, 145, 151)');
    expect(withAlpha('rgb(1, 2, 3)', 0.5)).toBe('rgba(1, 2, 3, 0.5)');
  });
});
