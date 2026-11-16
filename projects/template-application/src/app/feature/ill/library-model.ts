import type { Analysis, AnalysisResults, Scan, ScanQi, ScanQuery, ScanSummary } from '../../core/ill/ill.models';
import { DAY_MS, formatDate, formatDateTime } from '../../core/mock-data/dates';

/**
 * Pure helpers for the Scan library (Figma 1:2014 … 1:3814): value cells,
 * the filter summary, search, grouping and recent wells.
 */

/** The result columns, in table order, with their header labels (Figma 1:2094). */
export const RESULT_COLUMNS: readonly { key: keyof AnalysisResults; label: string }[] = [
  { key: 'calculatedIll', label: 'Calculated ILL' },
  { key: 'depthCorrection', label: 'Depth correction' },
  { key: 'baseline', label: 'Baseline' },
  { key: 'stdDeviation', label: 'Std deviation' },
  { key: 'inTolerance', label: 'In tolerance?' },
  { key: 'outliers', label: 'Outliers' },
  { key: 'rawMarkers', label: 'Raw markers' },
  { key: 'rawIll', label: 'Raw ILL' },
];

export interface ValueCell {
  top: string;
  /** The saved value under an unsaved one (two-line cell, Figma 1:2883). */
  bottom: string | null;
  /** `unsaved` draws `top` in primary. */
  tone: 'saved' | 'unsaved';
}

export function formatResult(key: keyof AnalysisResults, value: AnalysisResults[keyof AnalysisResults]): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return key === 'outliers' ? String(value) : value.toFixed(3);
}

/**
 * One result cell: saved only → plain; unsaved only → primary; both → unsaved
 * (primary) over saved (small); nothing → `--`.
 */
export function valueCell(analysis: Analysis, key: keyof AnalysisResults): ValueCell {
  const saved = analysis.saved?.results[key];
  const unsaved = analysis.unsaved?.results[key];
  if (unsaved !== undefined) {
    return { top: formatResult(key, unsaved), bottom: saved !== undefined ? formatResult(key, saved) : null, tone: 'unsaved' };
  }
  if (saved !== undefined) return { top: formatResult(key, saved), bottom: null, tone: 'saved' };
  return { top: '--', bottom: null, tone: 'saved' };
}

export function qiLetter(qi: ScanQi): string {
  return qi === 'Good' ? 'G' : qi === 'Suspect' ? 'S' : '';
}

/** Wells with a scan in the last `days` before `end`: marked `*` ("denotes a recent scan"). */
export function recentWells(scans: readonly { wellId: string; datetime: number }[], end: number, days = 30): Set<string> {
  const from = end - days * DAY_MS;
  return new Set(scans.filter((s) => s.datetime >= from && s.datetime <= end + DAY_MS).map((s) => s.wellId));
}

export function wellLabel(wellId: string, recent: ReadonlySet<string>): string {
  return recent.has(wellId) ? `${wellId} *` : wellId;
}

/** The collapsed form: "All wells | 07/19/2026 - 10/19/2026 | [chips]" (Figma 1:2094). */
export function summaryParts(query: ScanQuery): { wells: string; dates: string; chips: string[] } {
  const chips: string[] = [];
  if (query.qi !== 'Any') chips.push(query.qi);
  if (query.analysis !== 'Any') chips.push(query.analysis);
  return {
    wells: query.wellIds.length ? query.wellIds.join(', ') : 'All wells',
    dates: `${formatDate(query.start)} - ${formatDate(query.end)}`,
    chips,
  };
}

/** The table's search box: well, date, analyst and comments, case-insensitive. */
export function matchesSearch(scan: ScanSummary, text: string): boolean {
  const q = text.trim().toLowerCase();
  if (!q) return true;
  return [scan.wellId, formatDateTime(scan.datetime), scan.analysis.saved?.savedBy ?? '', scan.scanComment ?? '', scan.vnvComment ?? '']
    .some((v) => v.toLowerCase().includes(q));
}

export interface WellGroup<T> {
  wellId: string;
  scans: T[];
}

/** Grouped view: wells in name order, each well's scans newest first. */
export function groupByWell<T extends { wellId: string; datetime: number }>(scans: readonly T[]): WellGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const s of scans) map.set(s.wellId, [...(map.get(s.wellId) ?? []), s]);
  return [...map.keys()].sort().map((wellId) => ({ wellId, scans: map.get(wellId)!.sort((a, b) => b.datetime - a.datetime) }));
}

/** "Export smooth data": the scan's depth profile as CSV. */
export function scanToCsv(scan: Scan): string {
  const rows = scan.points.map((p) => `${p.depthIn},${p.counts}`);
  return [`well,${scan.wellId}`, `scan_datetime,${formatDateTime(scan.datetime)}`, 'corrected_depth_in,corrected_counts', ...rows].join('\n');
}
