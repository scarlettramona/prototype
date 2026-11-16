import { parseCsvRecords } from '../mock-data/csv';
import { DAY_MS, parseUsDate } from '../mock-data/dates';
import { isQi, type Qi } from '../qi/qi.models';

/** One row of `vnv-readings.csv`, with its same-day position resolved to a time. */
export interface VnvSourceReading {
  sensorId: string;
  /** Local timestamp: the row's date, spread evenly across the day by file order. */
  timestamp: number;
  value: number;
  qi: Qi;
}

/** One row of `vnv-metadata.csv`: the export window per sensor. */
export interface VnvSourceMetadata {
  sensorId: string;
  retrievedAt: number;
  start: number;
  end: number;
}

export interface VnvSource {
  readings: VnvSourceReading[];
  metadata: VnvSourceMetadata[];
}

/**
 * Parses the real VNV exports. Dates carry no time, and some days have several
 * readings: those are spread evenly across the day (n readings → slots at
 * (i + ½)/n of the day), keeping file order. A missing QI becomes Unreviewed.
 */
export function parseVnvSource(readingsCsv: string, metadataCsv: string): VnvSource {
  const rows = parseCsvRecords(readingsCsv).map((r) => ({
    sensorId: r['sensor'],
    day: parseUsDate(r['date']),
    value: Number(r['value']),
    qi: isQi(r['vv_qi']) ? r['vv_qi'] : ('Unreviewed' as Qi),
  }));

  const perDay = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.sensorId}|${r.day}`;
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  const readings = rows.map((r) => {
    const key = `${r.sensorId}|${r.day}`;
    const n = perDay.get(key)!;
    const i = seen.get(key) ?? 0;
    seen.set(key, i + 1);
    return {
      sensorId: r.sensorId,
      timestamp: r.day + Math.round(((i + 0.5) / n) * DAY_MS),
      value: r.value,
      qi: r.qi,
    };
  });

  const metadata = parseCsvRecords(metadataCsv).map((r) => ({
    sensorId: r['Structure'],
    retrievedAt: Date.parse(r['Retrieval Date']) || parseUsDate(r['Retrieval Date']),
    start: parseUsDate(r['Start Date']),
    end: parseUsDate(r['End Date']),
  }));

  return { readings, metadata };
}
