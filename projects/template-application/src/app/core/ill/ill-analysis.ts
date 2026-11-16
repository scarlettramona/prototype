import { mean, round, std } from '../math/stats';
import { DAY_MS, parseUsDate } from '../mock-data/dates';
import type { AnalysisParameters, AnalysisResults, ScanPoint } from './ill.models';

/** The `Default` preset. */
export function defaultParameters(): AnalysisParameters {
  return {
    preset: 'Default',
    calculationBaseline: {
      baselineValue: 135,
      baselineSlopeRate: 0,
      baselineStartDate: parseUsDate('10/29/2022'),
    },
    miscellaneous: {
      markerDepth: 418.8,
      reviewTolerance: 0.804,
      overallCorrectionOffset: 0,
      lowDepth: 549.66,
      parameterComment: '',
    },
    illMethod: {
      method: 'Intercept',
      normalUpperRange: 12,
      normalLowerRange: 10.5,
      normalTargetCounts: 800,
      upperRange: 24,
      lowerRange: 24,
      counts: 1600,
    },
    markerMethod: {
      method: 'Intercept',
      normalUpperRange: 6,
      normalLowerRange: 6,
      normalTargetCounts: 450,
      upperRange: 12,
      lowerRange: 12,
      counts: 900,
    },
  };
}

export function cloneParameters(p: AnalysisParameters): AnalysisParameters {
  return structuredClone(p);
}

/**
 * A mock ILL analysis. It finds the liquid level at the sharp count rise near
 * the bottom of the profile (~134–136 in) and derives the other results from
 * the profile and parameters. Not the real algorithm: it only has to be
 * deterministic, plausible, and respond to parameter edits.
 */
export function analyse(points: readonly ScanPoint[], p: AnalysisParameters, scanDatetime: number): AnalysisResults {
  const asc = [...points].sort((a, b) => a.depthIn - b.depthIn);
  const plateau = asc.filter((x) => x.depthIn >= 20 && x.depthIn <= 110).map((x) => x.counts);
  const trough = asc.filter((x) => x.depthIn >= 200 && x.depthIn <= 400).map((x) => x.counts);
  const upper = asc.filter((x) => x.depthIn >= 480).map((x) => x.counts);

  const high = median(plateau);
  const low = median(trough);
  const threshold = low + (high - low) / 2;

  // Walk down from the trough to the first crossing of the threshold.
  let rawIll = 0;
  for (let i = asc.length - 1; i > 0; i--) {
    const a = asc[i];
    const b = asc[i - 1];
    if (a.depthIn > 300) continue;
    if (a.counts < threshold && b.counts >= threshold) {
      const t = (threshold - a.counts) / (b.counts - a.counts);
      rawIll = a.depthIn + (b.depthIn - a.depthIn) * t;
      break;
    }
  }

  const ill = p.illMethod;
  const marker = p.markerMethod;
  const depthCorrection =
    ill.method === 'None'
      ? 0
      : (ill.normalUpperRange - ill.normalLowerRange) * 0.05 +
        (marker.normalUpperRange - marker.normalLowerRange) * 0.03 +
        (p.miscellaneous.markerDepth - 418.8) * 0.01 +
        (ill.normalTargetCounts - 800) * 0.0005;
  const calculatedIll = rawIll + depthCorrection + p.miscellaneous.overallCorrectionOffset;

  const years = (scanDatetime - p.calculationBaseline.baselineStartDate) / (365.25 * DAY_MS);
  const baseline = p.calculationBaseline.baselineValue + p.calculationBaseline.baselineSlopeRate * years;

  const m = mean(plateau);
  const sd = std(plateau);
  const outliers = plateau.filter((c) => Math.abs(c - m) > 2.5 * sd).length;

  return {
    calculatedIll: round(calculatedIll, 3),
    depthCorrection: round(depthCorrection, 3),
    baseline: round(baseline, 3),
    stdDeviation: round(sd / 100, 3),
    inTolerance: calculatedIll <= baseline + ill.normalUpperRange && calculatedIll >= baseline - ill.normalLowerRange,
    outliers,
    rawMarkers: round(mean(upper) / 3, 3),
    rawIll: round(rawIll, 3),
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
