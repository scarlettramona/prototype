import { analyse, defaultParameters } from '../../../core/ill/ill-analysis';
import type { AnalysisResults, Scan, ScanPoint } from '../../../core/ill/ill.models';
import {
  activeFields,
  closedScanIds,
  countsAt,
  depthYRange,
  editedFields,
  initialDraft,
  PARAM_GROUPS,
  referenceParameters,
  resultRows,
  withParam,
} from './focus-model';

function results(calculatedIll: number): AnalysisResults {
  return { calculatedIll, depthCorrection: 0.1, baseline: 135, stdDeviation: 0.5, inTolerance: true, outliers: 2, rawMarkers: 280, rawIll: calculatedIll };
}

const saved = { parameters: defaultParameters(), results: results(134.5), savedAt: 0, savedBy: 'Arch Bence' };
const unsavedParams = withParam(defaultParameters(), 'illMethod', 'normalLowerRange', 12);
const unsaved = { parameters: unsavedParams, results: results(135.25), runAt: 0 };

/** Descending depth, as exported: counts = depth × 2, plus one spike. */
const points: ScanPoint[] = Array.from({ length: 601 }, (_, i) => ({ depthIn: 600 - i, counts: (600 - i) * 2 }));

function scan(analysis: Scan['analysis'] = {}): Scan {
  return { id: 'w|1', wellId: 'w', datetime: 0, colorIndex: 0, qi: null, analysis, points, real: false };
}

describe('Focus view model', () => {
  it('lays out Scan details by analysis state', () => {
    expect(resultRows({ saved })[0]).toEqual({ label: 'Calculated ILL', unit: 'in', value: '134.500' });
    expect(resultRows({ unsaved })[0]).toEqual({ label: 'Calculated ILL', unit: 'in', value: '135.250', tone: 'unsaved' });
    expect(resultRows({ saved, unsaved })[0]).toEqual({ label: 'Calculated ILL', unit: 'in', value: '134.500', compare: '135.250' });
    expect(resultRows({}).every((r) => r.value === '—' && r.compare === undefined)).toBe(true);
    expect(resultRows({ saved }).find((r) => r.label === 'In tolerance?')?.value).toBe('Yes');
  });

  it('starts the draft at the latest run and marks fields that differ from the saved values', () => {
    const s = scan({ saved, unsaved });
    expect(referenceParameters(s).illMethod.normalLowerRange).toBe(10.5);
    const draft = initialDraft(s);
    expect(draft.illMethod.normalLowerRange).toBe(12);
    const edited = editedFields(draft, referenceParameters(s));
    expect([...edited]).toEqual(['illMethod.normalLowerRange']);
  });

  it('measures edits against the Default preset when nothing is saved', () => {
    const s = scan();
    expect(editedFields(initialDraft(s), referenceParameters(s)).size).toBe(0);
  });

  it('reads counts at the nearest depth', () => {
    expect(countsAt(points, 100)).toBe(200);
    expect(countsAt(points, 100.4)).toBe(200);
    expect(countsAt(points, 700)).toBe(1200);
    expect(countsAt([], 1)).toBeNull();
  });

  it('fits Y to the window, or to the full profile when off', () => {
    const [lo, hi] = depthYRange([scan()], { start: 100, end: 200 }, true);
    expect(lo).toBeGreaterThanOrEqual(180);
    expect(lo).toBeLessThan(205);
    expect(hi).toBeGreaterThan(395);
    expect(hi).toBeLessThanOrEqual(420);
    expect(depthYRange([scan()], { start: 100, end: 200 }, false)).toEqual([0, 1296]);
    expect(depthYRange([], null, true)).toEqual([0, 1]);
  });

  it('lists closed scans in well order', () => {
    expect(closedScanIds(['a', 'b', 'c', 'd'], ['d', 'b'])).toEqual(['a', 'c']);
  });

  describe('ILL and Marker methods', () => {
    const [, , illGroup, markerGroup] = PARAM_GROUPS;
    const labels = (group: typeof illGroup, method: string) =>
      activeFields(group, withParam(defaultParameters(), group.group as 'illMethod', 'method', method)).map((f) => f.label);

    it('offers 2 Line Intercept for ILL only', () => {
      expect(illGroup.methods).toContain('2 Line Intercept');
      expect(markerGroup.methods).not.toContain('2 Line Intercept');
    });

    it("shows the method select and only the chosen method's fields", () => {
      expect(labels(illGroup, 'Intercept')).toEqual([
        'ILL Method',
        'ILL Normal Upper Range',
        'ILL Normal Lower Range',
        'ILL Normal Target Counts',
        'ILL Upper Range',
        'ILL Lower Range',
        'ILL Counts',
      ]);
      expect(labels(illGroup, '2 Line Intercept')).toEqual(['ILL Method', 'Depth 1', 'Depth 2', 'Depth 3', 'Depth 4']);
      expect(labels(illGroup, 'Derivative')).toEqual(['ILL Method', 'ILL Upper Range', 'ILL Lower Range', 'ILL Smoothing Parameter']);
      expect(labels(markerGroup, 'Count Rate')).toEqual(['Marker Method', 'Marker Window Offset', 'Marker Window Size']);
      expect(labels(markerGroup, 'Sigmoid')).toEqual([
        'Marker Method',
        'Marker Window',
        'Marker High Low Delta',
        'Marker Curve Shape',
        'Marker Low Count Value',
        'Sigmoid Tolerance',
      ]);
      expect(labels(illGroup, 'None')).toEqual(['ILL Method']);
    });

    it('defaults to the legacy values and keeps Sigmoid Tolerance at 6 decimals', () => {
      const d = defaultParameters();
      expect([d.illMethod.depth1, d.illMethod.depth4, d.illMethod.derivativeUpperRange, d.illMethod.highLowDelta]).toEqual([72, 54, 144, 1500]);
      expect([d.markerMethod.derivativeUpperRange, d.markerMethod.curveShape, d.markerMethod.lowCountValue]).toEqual([484.8, -6.1, 14.9]);
      expect(markerGroup.fields.find((f) => f.key === 'sigmoidTolerance')!.decimals).toBe(6);
    });

    it("moves the result with the method and with the chosen method's fields", () => {
      const ill = (p = defaultParameters()) => analyse(points, p, 0).calculatedIll;
      const base = ill();
      for (const method of ['2 Line Intercept', 'Derivative', 'Count Rate', 'Sigmoid'] as const) {
        const p = withParam(defaultParameters(), 'illMethod', 'method', method);
        expect(ill(p)).not.toBe(base);
      }
      const sigmoid = withParam(defaultParameters(), 'markerMethod', 'method', 'Sigmoid');
      expect(ill(withParam(sigmoid, 'markerMethod', 'curveShape', -4))).not.toBe(ill(sigmoid));
      // A method's fields only count while it's chosen.
      expect(ill(withParam(defaultParameters(), 'illMethod', 'depth1', 90))).toBe(base);
    });
  });
});
