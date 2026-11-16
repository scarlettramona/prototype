import type { Scan } from '../../../core/ill/ill.models';
import { buildDepthChartOptions, SCAN_SERIES_PREFIX, type DepthChartData } from './depth-chart-options';

interface LineSeries {
  id: string;
  lineStyle: { width: number; type: 'solid' | number[]; opacity: number };
}

function scan(id: string, colorIndex: number): Scan {
  return {
    id,
    wellId: 'W',
    datetime: colorIndex,
    colorIndex,
    qi: null,
    points: [
      { depthIn: 300, counts: 10 },
      { depthIn: 200, counts: 20 },
    ],
    analysis: {},
    real: false,
  };
}

function lines(data: DepthChartData): Map<string, LineSeries['lineStyle']> {
  const opts = buildDepthChartOptions(data, null, [0, 100], '#000', { zoom: false }) as { series: LineSeries[] };
  return new Map(opts.series.filter((s) => s.id.startsWith(SCAN_SERIES_PREFIX)).map((s) => [s.id.slice(SCAN_SERIES_PREFIX.length), s.lineStyle]));
}

describe('Depth chart options', () => {
  const base = { scans: [scan('a', 0), scan('ref', 1), scan('b', 2)], lines: { saved: true, unsaved: true }, referenceId: 'ref' };

  it('draws one line per scan; all solid; the reference never faded', () => {
    const tab = lines({ ...base, focusedId: 'a' });
    expect([...tab.keys()]).toEqual(['a', 'ref', 'b']);
    expect(tab.get('a')).toEqual({ width: 2, type: 'solid', opacity: 1 });
    expect(tab.get('ref')).toEqual({ width: 1.5, type: 'solid', opacity: 1 });
    expect(tab.get('b')).toEqual({ width: 1, type: 'solid', opacity: 0.5 }); // faded behind the focused scan

    const all = lines({ ...base, focusedId: null });
    expect(all.get('b')!.opacity).toBe(1);
    expect(all.get('ref')!.type).toBe('solid');
  });
});
