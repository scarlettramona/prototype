import { defaultParameters } from '../../../core/ill/ill-analysis';
import type { AnalysisResults, Scan } from '../../../core/ill/ill.models';
import { buildDepthChartOptions, RAW_DASH, RAW_SERIES_PREFIX, REFERENCE_DASH, SCAN_SERIES_PREFIX, type DepthChartData } from './depth-chart-options';

interface LineSeries {
  id: string;
  lineStyle: { type: 'solid' | number[]; opacity: number };
}

const results: AnalysisResults = {
  calculatedIll: 135.5,
  rawIll: 135,
  depthCorrection: 0.5,
  baseline: 135,
  stdDeviation: 0.5,
  inTolerance: true,
  outliers: 0,
  rawMarkers: 280,
};

function scan(id: string, analysed: boolean, colorIndex: number): Scan {
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
    analysis: analysed ? { saved: { parameters: defaultParameters(), results, savedAt: 0, savedBy: 'x' } } : {},
    real: false,
  };
}

function lines(data: DepthChartData): LineSeries[] {
  const opts = buildDepthChartOptions(data, null, [0, 100], '#000', { zoom: false }) as { series: LineSeries[] };
  return opts.series.filter((s) => s.id.startsWith(SCAN_SERIES_PREFIX) || s.id.startsWith(RAW_SERIES_PREFIX));
}

describe('Depth chart options', () => {
  const a = scan('a', true, 0);
  const ref = scan('ref', true, 1);
  const none = scan('none', false, 2);
  const base = { focusedId: 'a', lines: { saved: true, unsaved: true }, referenceId: 'ref' };

  it('draws calculated solid, raw dotted (when shown), the reference dashed and unfaded', () => {
    const s = lines({ ...base, scans: [a, ref, none], raw: new Set(['a']) });
    const byId = new Map(s.map((x) => [x.id, x.lineStyle]));
    expect(byId.get('scan:a')!.type).toBe('solid');
    expect(byId.get('raw:a')!.type).toEqual(RAW_DASH);
    expect(byId.get('scan:ref')).toEqual({ width: 1.5, type: REFERENCE_DASH, opacity: 1 });
    expect(byId.has('raw:ref')).toBe(false);
    // No analysis: only the raw line, dotted, and faded behind the focused scan.
    expect(byId.has('scan:none')).toBe(false);
    expect(byId.get('raw:none')!.type).toEqual(RAW_DASH);
    expect(byId.get('raw:none')!.opacity).toBeLessThan(1);
  });
});
