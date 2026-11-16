import type { Reading } from '../../../../core/vnv/vnv.models';

export type TableColumn = 'sensor' | 'value' | 'quality' | 'date' | 'comment' | 'reviewer';

export interface TableSort {
  column: TableColumn;
  dir: 'asc' | 'desc';
}

export const DEFAULT_TABLE_SORT: TableSort = { column: 'date', dir: 'desc' };

export type TableRow =
  | { kind: 'group'; sensorId: string; readingIds: string[] }
  | { kind: 'reading'; reading: Reading };

const QI_ORDER: Record<Reading['qi'], number> = { Good: 0, Suspect: 1, Unreviewed: 2, Transcribed: 3 };

const COMPARE: Record<TableColumn, (a: Reading, b: Reading) => number> = {
  sensor: (a, b) => a.sensorId.localeCompare(b.sensorId) || a.timestamp - b.timestamp,
  value: (a, b) => a.value - b.value,
  quality: (a, b) => QI_ORDER[a.qi] - QI_ORDER[b.qi],
  date: (a, b) => a.timestamp - b.timestamp,
  comment: (a, b) => (a.comment ?? '').localeCompare(b.comment ?? ''),
  reviewer: (a, b) => (a.reviewer ?? '').localeCompare(b.reviewer ?? ''),
};

/** Sorts readings by a column; ties fall back to newest first. */
export function sortReadings(readings: readonly Reading[], sort: TableSort): Reading[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const compare = COMPARE[sort.column];
  return [...readings].sort((a, b) => sign * compare(a, b) || b.timestamp - a.timestamp);
}

/**
 * The flat row list the virtual scroller renders. Ungrouped: sorted readings.
 * Grouped: one group row per sensor (in `sensorOrder`), followed by that
 * sensor's sorted readings unless the group is collapsed. Sensors with no
 * visible readings get no group.
 */
export function buildTableRows(
  readings: readonly Reading[],
  sort: TableSort,
  grouped: boolean,
  sensorOrder: readonly string[],
  collapsed: ReadonlySet<string>,
): TableRow[] {
  const sorted = sortReadings(readings, sort);
  if (!grouped) return sorted.map((reading) => ({ kind: 'reading', reading }));

  const bySensor = new Map<string, Reading[]>();
  for (const r of sorted) {
    const list = bySensor.get(r.sensorId);
    if (list) list.push(r);
    else bySensor.set(r.sensorId, [r]);
  }
  const rows: TableRow[] = [];
  for (const sensorId of sensorOrder) {
    const list = bySensor.get(sensorId);
    if (!list) continue;
    rows.push({ kind: 'group', sensorId, readingIds: list.map((r) => r.id) });
    if (!collapsed.has(sensorId)) for (const reading of list) rows.push({ kind: 'reading', reading });
  }
  return rows;
}
