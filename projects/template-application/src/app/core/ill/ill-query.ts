import { endOfDay } from '../mock-data/dates';
import type { Scan, ScanQuery, ScanSummary } from './ill.models';

/** Does the scan match the Load scans form? The end date is inclusive. */
export function matchesScanQuery(scan: Scan | ScanSummary, query: ScanQuery): boolean {
  if (scan.datetime < query.start || scan.datetime > endOfDay(query.end)) return false;
  if (query.wellIds.length > 0 && !query.wellIds.includes(scan.wellId)) return false;
  switch (query.qi) {
    case 'Good':
    case 'Suspect':
      if (scan.qi !== query.qi) return false;
      break;
    case 'Not set':
      if (scan.qi !== null) return false;
      break;
  }
  switch (query.analysis) {
    case 'Saved':
      return !!scan.analysis.saved;
    case 'Unsaved':
      return !!scan.analysis.unsaved;
    default:
      return true;
  }
}

/** Library order: newest first. */
export function byNewest(a: { datetime: number }, b: { datetime: number }): number {
  return b.datetime - a.datetime;
}
