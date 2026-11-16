import { defaultParameters } from '../../../core/ill/ill-analysis';
import type { Analysis, AnalysisParameters, AnalysisResults, Scan, ScanPoint, ScanQi } from '../../../core/ill/ill.models';
import { formatDate } from '../../../core/mock-data/dates';

/** The depth axis: inches from the bottom of the tank, drawn 600 → 0. */
export const DEPTH_MIN = 0;
export const DEPTH_MAX = 600;

/** A depth window, `start < end` in inches. `null` elsewhere means the full profile. */
export interface DepthWindow {
  start: number;
  end: number;
}

// ── Scan details ────────────────────────────────────────────────────────────

/** Scan details rows (Figma 1:9514), with Figma's units. */
export const RESULT_ROWS: readonly { key: keyof AnalysisResults; label: string; unit: string }[] = [
  { key: 'calculatedIll', label: 'Calculated ILL', unit: 'in' },
  { key: 'depthCorrection', label: 'Depth correction', unit: 'in' },
  { key: 'stdDeviation', label: 'Std deviation', unit: 'cps' },
  { key: 'inTolerance', label: 'In tolerance?', unit: '' },
  { key: 'outliers', label: 'Outliers', unit: 'in' },
  { key: 'rawMarkers', label: 'Raw markers', unit: 'cps' },
];

export interface ResultRow {
  label: string;
  unit: string;
  value: string;
  /** The unsaved value beside the saved one; `undefined` for a single column. */
  compare?: string;
  /** `unsaved`: a single column of unsaved results, drawn in primary. */
  tone?: 'unsaved';
}

function formatResult(results: AnalysisResults | undefined, key: keyof AnalysisResults): string {
  if (!results) return '—';
  const v = results[key];
  return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v.toFixed(3);
}

/**
 * Saved and unsaved: two columns (saved, then unsaved in primary). Otherwise
 * one column: saved in on-surface, or unsaved in primary (a first run), or
 * `—` with no analysis. Saving turns the unsaved column into the saved one.
 */
export function resultRows(analysis: Analysis): ResultRow[] {
  const saved = analysis.saved?.results;
  const unsaved = analysis.unsaved?.results;
  return RESULT_ROWS.map(({ key, label, unit }) =>
    saved && unsaved
      ? { label, unit, value: formatResult(saved, key), compare: formatResult(unsaved, key) }
      : unsaved
        ? { label, unit, value: formatResult(unsaved, key), tone: 'unsaved' as const }
        : { label, unit, value: formatResult(saved, key) },
  );
}

// ── Review (QI + comments) ─────────────────────────────────────────────────

export interface ScanReviewDraft {
  qi: ScanQi;
  scanComment: string;
  vnvComment: string;
}

export function reviewOf(scan: Scan): ScanReviewDraft {
  return { qi: scan.qi, scanComment: scan.scanComment ?? '', vnvComment: scan.vnvComment ?? '' };
}

export function sameReview(a: ScanReviewDraft, b: ScanReviewDraft): boolean {
  return a.qi === b.qi && a.scanComment.trim() === b.scanComment.trim() && a.vnvComment.trim() === b.vnvComment.trim();
}

// ── Analysis parameters ─────────────────────────────────────────────────────

export type ParamGroup = Exclude<keyof AnalysisParameters, 'preset'>;
export type FieldKind = 'number' | 'date' | 'text' | 'method';

export interface ParamField {
  group: ParamGroup;
  key: string;
  label: string;
  unit: string;
  kind: FieldKind;
  /** Shows an ⓘ after the label (Figma: Baseline value, Baseline slope rate). */
  info?: boolean;
}

export interface ParamGroupDef {
  group: ParamGroup;
  title: string;
  fields: ParamField[];
}

const f = (group: ParamGroup, key: string, label: string, unit = 'in', kind: FieldKind = 'number', info = false): ParamField => ({
  group,
  key,
  label,
  unit,
  kind,
  info,
});

/** The four groups as Figma lays them out (1:9821). Labels are Figma's, typos included. */
export const PARAM_GROUPS: readonly ParamGroupDef[] = [
  {
    group: 'calculationBaseline',
    title: 'Calculation Baseline',
    fields: [
      f('calculationBaseline', 'baselineValue', 'Baseline value', 'in', 'number', true),
      f('calculationBaseline', 'baselineSlopeRate', 'Baseline slope rate', 'in/yr', 'number', true),
      f('calculationBaseline', 'baselineStartDate', 'Baseline start date', '', 'date'),
    ],
  },
  {
    group: 'miscellaneous',
    title: 'Miscellaneous',
    fields: [
      f('miscellaneous', 'markerDepth', 'Marker depth'),
      f('miscellaneous', 'reviewTolerance', 'Review tolerence'),
      f('miscellaneous', 'overallCorrectionOffset', 'Overall correction offset'),
      f('miscellaneous', 'lowDepth', 'LOW depth'),
      f('miscellaneous', 'parameterComment', 'Parameter comment', '', 'text'),
    ],
  },
  {
    group: 'illMethod',
    title: 'ILL method',
    fields: [
      f('illMethod', 'method', 'ILL Method', '', 'method'),
      f('illMethod', 'normalUpperRange', 'ILL Normal Upper Range'),
      f('illMethod', 'normalLowerRange', 'ILL Normal Lower Range'),
      f('illMethod', 'normalTargetCounts', 'ILL Normal Target Counts'),
      f('illMethod', 'upperRange', 'ILL Upper Range'),
      f('illMethod', 'lowerRange', 'ILL Lower Range'),
      f('illMethod', 'counts', 'ILL Counts'),
    ],
  },
  {
    group: 'markerMethod',
    title: 'Marker method',
    fields: [
      f('markerMethod', 'method', 'Marker Method', '', 'method'),
      f('markerMethod', 'normalUpperRange', 'Marker Normal Upper Range'),
      f('markerMethod', 'normalLowerRange', 'Marker Normal Lower Range'),
      f('markerMethod', 'normalTargetCounts', 'Marker Normal Target Counts'),
      f('markerMethod', 'upperRange', 'Marker Upper Range'),
      f('markerMethod', 'lowerRange', 'Marker Lower Range'),
      f('markerMethod', 'counts', 'Marker Counts'),
    ],
  },
];

export type ParamValue = number | string;

export function paramValue(p: AnalysisParameters, field: Pick<ParamField, 'group' | 'key'>): ParamValue {
  return (p[field.group] as unknown as Record<string, ParamValue>)[field.key];
}

export function withParam(p: AnalysisParameters, group: ParamGroup, key: string, value: ParamValue): AnalysisParameters {
  return { ...p, [group]: { ...p[group], [key]: value } };
}

/** `12.000`, `10/29/2026`, `Intercept`, or the comment. */
export function formatParam(value: ParamValue, kind: FieldKind): string {
  if (kind === 'number') return (value as number).toFixed(3);
  if (kind === 'date') return formatDate(value as number);
  return String(value);
}

/** What edits are measured against: the saved parameters, else the Default preset (`defaults`). */
export function referenceParameters(scan: Scan, defaults: AnalysisParameters = defaultParameters()): AnalysisParameters {
  return structuredClone(scan.analysis.saved?.parameters ?? defaults);
}

/** Where editing starts: the latest run's parameters, else the reference. */
export function initialDraft(scan: Scan, defaults: AnalysisParameters = defaultParameters()): AnalysisParameters {
  return structuredClone(scan.analysis.unsaved?.parameters ?? referenceParameters(scan, defaults));
}

/** `group.key` of every field whose draft differs from the reference. */
export function editedFields(draft: AnalysisParameters, reference: AnalysisParameters): ReadonlySet<string> {
  const out = new Set<string>();
  for (const g of PARAM_GROUPS) {
    for (const field of g.fields) {
      if (paramValue(draft, field) !== paramValue(reference, field)) out.add(fieldId(field));
    }
  }
  return out;
}

export function fieldId(field: Pick<ParamField, 'group' | 'key'>): string {
  return `${field.group}.${field.key}`;
}

// ── Chart ───────────────────────────────────────────────────────────────────

/** The counts at the depth closest to `depth`. Points are in descending depth, as exported. */
export function countsAt(points: readonly ScanPoint[], depth: number): number | null {
  if (points.length === 0) return null;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].depthIn > depth) lo = mid;
    else hi = mid;
  }
  return Math.abs(points[lo].depthIn - depth) <= Math.abs(points[hi].depthIn - depth) ? points[lo].counts : points[hi].counts;
}

/**
 * The y-range. Fit Y fits the visible scans inside the window, using the
 * 1st–99th percentile plus 8% padding so single spikes don't flatten the rest.
 * Off: the full profile, padded the same way.
 */
export function depthYRange(scans: readonly Scan[], window: DepthWindow | null, fitY: boolean): [number, number] {
  const from = fitY && window ? window.start : DEPTH_MIN;
  const to = fitY && window ? window.end : DEPTH_MAX;
  const values: number[] = [];
  for (const s of scans) for (const p of s.points) if (p.depthIn >= from && p.depthIn <= to) values.push(p.counts);
  if (values.length === 0) return [0, 1];
  values.sort((a, b) => a - b);
  const lo = fitY ? values[Math.floor((values.length - 1) * 0.01)] : values[0];
  const hi = fitY ? values[Math.ceil((values.length - 1) * 0.99)] : values[values.length - 1];
  const pad = Math.max((hi - lo) * 0.08, 1);
  return [Math.max(0, Math.floor(lo - pad)), Math.ceil(hi + pad)];
}

/** Scan ids in `all` that aren't open as tabs, in `all`'s order. */
export function closedScanIds(all: readonly string[], open: readonly string[]): string[] {
  const o = new Set(open);
  return all.filter((id) => !o.has(id));
}
