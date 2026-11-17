import { mean, round, std } from '../math/stats';
import { DAY_MS, parseUsDate } from '../mock-data/dates';
import type { AnalysisParameters, AnalysisResults, IllMethodParameters, MarkerMethodParameters, ScanPoint } from './ill.models';

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
    // Intercept values follow the Figma frames (1:8968); the other methods' values
    // come from the legacy app's parameter screen (Scarlett, 2026-11-17).
    illMethod: {
      method: 'Intercept',
      normalUpperRange: 12,
      normalLowerRange: 10.5,
      normalTargetCounts: 800,
      upperRange: 24,
      lowerRange: 24,
      counts: 1600,
      depth1: 72,
      depth2: 66,
      depth3: 60,
      depth4: 54,
      derivativeUpperRange: 144,
      derivativeLowerRange: 128,
      smoothingParameter: 0.995,
      windowOffset: 9.6,
      windowSize: 24,
      sigmoidWindow: 4.2,
      highLowDelta: 1500,
      curveShape: 6,
      lowCountValue: 160,
      sigmoidTolerance: 0.00012,
    },
    markerMethod: {
      method: 'Intercept',
      normalUpperRange: 6,
      normalLowerRange: 6,
      normalTargetCounts: 450,
      upperRange: 12,
      lowerRange: 12,
      counts: 900,
      derivativeUpperRange: 484.8,
      derivativeLowerRange: 468,
      smoothingParameter: 0.995,
      windowOffset: 9.6,
      windowSize: 24,
      sigmoidWindow: 7.8,
      highLowDelta: 780.9,
      curveShape: -6.1,
      lowCountValue: 14.9,
      sigmoidTolerance: 0.00012,
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
  const depthCorrection =
    ill.method === 'None' ? 0 : illMethodTerm(ill) + markerMethodTerm(p.markerMethod) + (p.miscellaneous.markerDepth - 418.8) * 0.01;
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

const DEFAULTS = defaultParameters();

/**
 * The ILL method's share of the depth correction. Intercept is the original
 * formula; each other method starts from Intercept's default share, adds a
 * small offset of its own, and moves with its fields' distance from their
 * defaults, so switching method or editing any field changes the result.
 */
function illMethodTerm(m: IllMethodParameters): number {
  const d = DEFAULTS.illMethod;
  const base = (d.normalUpperRange - d.normalLowerRange) * 0.05;
  switch (m.method) {
    case 'None':
      return 0;
    case 'Intercept':
      return (m.normalUpperRange - m.normalLowerRange) * 0.05 + (m.normalTargetCounts - 800) * 0.0005;
    case '2 Line Intercept':
      return base + 0.04 + (mean([m.depth1, m.depth2, m.depth3, m.depth4]) - mean([d.depth1, d.depth2, d.depth3, d.depth4])) * 0.02;
    default:
      return base + sharedMethodTerm(m, d);
  }
}

/** The marker method's share of the depth correction (see `illMethodTerm`). */
function markerMethodTerm(m: MarkerMethodParameters): number {
  const d = DEFAULTS.markerMethod;
  switch (m.method) {
    case 'None':
      return 0;
    case 'Intercept':
      return (m.normalUpperRange - m.normalLowerRange) * 0.03;
    default:
      return sharedMethodTerm(m, d) / 2;
  }
}

/** Derivative, Count Rate and Sigmoid, which ILL and Marker share. */
function sharedMethodTerm(m: IllMethodParameters | MarkerMethodParameters, d: IllMethodParameters | MarkerMethodParameters): number {
  switch (m.method) {
    case 'Derivative':
      return (
        0.02 +
        (m.derivativeUpperRange - m.derivativeLowerRange - (d.derivativeUpperRange - d.derivativeLowerRange)) * 0.02 +
        (m.smoothingParameter - d.smoothingParameter) * 10
      );
    case 'Count Rate':
      return -0.03 + (m.windowOffset - d.windowOffset) * 0.03 + (m.windowSize - d.windowSize) * 0.01;
    case 'Sigmoid':
      return (
        0.01 +
        (m.sigmoidWindow - d.sigmoidWindow) * 0.05 +
        (m.highLowDelta - d.highLowDelta) * 0.0002 +
        (m.curveShape - d.curveShape) * 0.02 +
        (m.lowCountValue - d.lowCountValue) * 0.001 +
        (m.sigmoidTolerance - d.sigmoidTolerance) * 100
      );
    default:
      return 0;
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
