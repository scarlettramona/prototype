import { defaultParameters } from './ill-analysis';
import type { AnalysisResults, Scan, ScanPoint } from './ill.models';
import { calculatedPoints, primaryPoints } from './ill-profiles';

const results = (calculatedIll: number, rawIll: number): AnalysisResults => ({
  calculatedIll,
  rawIll,
  depthCorrection: calculatedIll - rawIll,
  baseline: 135,
  stdDeviation: 0.5,
  inTolerance: true,
  outliers: 0,
  rawMarkers: 280,
});

/** A sawtooth so smoothing is visible: 0, 100, 0, 100, … */
const points: ScanPoint[] = Array.from({ length: 20 }, (_, i) => ({ depthIn: 100 - i, counts: i % 2 ? 100 : 0 }));

function scan(analysis: Scan['analysis']): Pick<Scan, 'points' | 'analysis'> {
  return { points, analysis };
}

describe('ILL profiles', () => {
  it('has no calculated profile without an analysis; raw stands in', () => {
    expect(calculatedPoints(scan({}))).toBeNull();
    expect(primaryPoints(scan({}))).toBe(points);
  });

  it('smooths the counts and shifts depths by calculatedIll − rawIll', () => {
    const saved = { parameters: defaultParameters(), results: results(135.25, 134.75), savedAt: 0, savedBy: 'x' };
    const calc = calculatedPoints(scan({ saved }))!;
    expect(calc).toHaveLength(points.length);
    expect(calc[10].depthIn).toBeCloseTo(points[10].depthIn + 0.5);
    // A 9-point window over the sawtooth averages to about 50.
    expect(calc[10].counts).toBeGreaterThan(40);
    expect(calc[10].counts).toBeLessThan(60);
  });

  it('follows the latest run: unsaved over saved', () => {
    const saved = { parameters: defaultParameters(), results: results(135, 135), savedAt: 0, savedBy: 'x' };
    const unsaved = { parameters: defaultParameters(), results: results(137, 135), runAt: 0 };
    expect(calculatedPoints(scan({ saved, unsaved }))![0].depthIn).toBeCloseTo(points[0].depthIn + 2);
  });
});
