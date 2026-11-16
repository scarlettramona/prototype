import type { AnalysisResults, Scan, ScanPoint } from './ill.models';

/** Points either side of each point in the calculated profile's moving average (a 9-point window). */
const SMOOTH_HALF_WINDOW = 4;

/** The raw scan: the stored points, as exported, before any calculation. */
export function rawPoints(scan: Pick<Scan, 'points'>): readonly ScanPoint[] {
  return scan.points;
}

/** The analysis the calculated scan follows: the latest run (unsaved), else the saved one. */
export function latestResults(scan: Pick<Scan, 'analysis'>): AnalysisResults | null {
  return (scan.analysis.unsaved ?? scan.analysis.saved)?.results ?? null;
}

/**
 * The calculated scan (Scarlett, 2026-11-16): the raw counts smoothed with a
 * centred moving average, and every depth shifted by the analysis's correction
 * (`calculatedIll − rawIll`: depth correction plus offset). `null` for a scan
 * with no analysis, which only has its raw profile.
 */
export function calculatedPoints(scan: Pick<Scan, 'points' | 'analysis'>): ScanPoint[] | null {
  const results = latestResults(scan);
  if (!results) return null;
  const shift = results.calculatedIll - results.rawIll;
  const pts = scan.points;
  return pts.map((p, i) => {
    const from = Math.max(0, i - SMOOTH_HALF_WINDOW);
    const to = Math.min(pts.length - 1, i + SMOOTH_HALF_WINDOW);
    let sum = 0;
    for (let j = from; j <= to; j++) sum += pts[j].counts;
    return { depthIn: round3(p.depthIn + shift), counts: round3(sum / (to - from + 1)) };
  });
}

/** What a chart draws for a scan when one line stands for it: calculated, else raw. */
export function primaryPoints(scan: Pick<Scan, 'points' | 'analysis'>): readonly ScanPoint[] {
  return calculatedPoints(scan) ?? scan.points;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
