import { parseCsvRecords } from '../mock-data/csv';
import { parseIllDateTime } from '../mock-data/dates';
import type { ScanPoint, ScanQi } from './ill.models';

export interface IllSourceScan {
  /** The `scan` column: the riser, e.g. `A 103 R 19 N 100369`. */
  wellId: string;
  /** `scan_datetime` as exported, e.g. `07-21-2026 10:16 AM`. */
  datetimeLabel: string;
  datetime: number;
  qi: ScanQi;
  /** As exported: depth descending. */
  points: ScanPoint[];
}

/** Parses `ill-scans.csv` and `ill-scan-metadata.csv`. An empty QI is "Not set" (null). */
export function parseIllSource(scansCsv: string, metadataCsv: string): IllSourceScan[] {
  const meta = parseCsvRecords(metadataCsv);
  const byKey = new Map<string, IllSourceScan>();

  for (const r of parseCsvRecords(scansCsv)) {
    const key = `${r['scan']}|${r['scan_datetime']}`;
    let scan = byKey.get(key);
    if (!scan) {
      const m = meta.find((x) => x['scan'] === r['scan'] && x['scan_datetime'] === r['scan_datetime']);
      const qi = m?.['vv_qi'];
      scan = {
        wellId: r['scan'],
        datetimeLabel: r['scan_datetime'],
        datetime: parseIllDateTime(r['scan_datetime']),
        qi: qi === 'Good' || qi === 'Suspect' ? qi : null,
        points: [],
      };
      byKey.set(key, scan);
    }
    scan.points.push({ depthIn: Number(r['corrected_depth_in']), counts: Number(r['corrected_counts']) });
  }
  return [...byKey.values()];
}
