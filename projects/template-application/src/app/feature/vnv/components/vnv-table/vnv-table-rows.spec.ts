import type { Reading } from '../../../../core/vnv/vnv.models';
import { buildTableRows, DEFAULT_TABLE_SORT, sortReadings } from './vnv-table-rows';

const D = 86_400_000;
const T0 = new Date(2026, 9, 1).getTime();

function r(sensorId: string, day: number, value: number, qi: Reading['qi'] = 'Good', extra: Partial<Reading> = {}): Reading {
  const timestamp = T0 + day * D;
  return { id: `${sensorId}|${timestamp}`, sensorId, timestamp, value, qi, real: false, ...extra };
}

const readings = [
  r('A', 0, 78.1),
  r('A', 2, 77.5, 'Suspect', { comment: 'Non pretium', reviewer: 'Philip Rennie' }),
  r('B', 1, 79.3, 'Unreviewed'),
  r('B', 3, 76.9, 'Transcribed', { reviewer: 'Arch Bence' }),
];

const ids = (rows: ReturnType<typeof buildTableRows>) => rows.map((x) => (x.kind === 'group' ? `#${x.sensorId}` : x.reading.id.split('|')[0] + (x.reading.timestamp - T0) / D));

describe('VNV table rows', () => {
  it('defaults to newest first', () => {
    expect(ids(buildTableRows(readings, DEFAULT_TABLE_SORT, false, ['A', 'B'], new Set()))).toEqual(['B3', 'A2', 'B1', 'A0']);
  });

  it('sorts by any column, both ways', () => {
    expect(sortReadings(readings, { column: 'value', dir: 'asc' }).map((x) => x.value)).toEqual([76.9, 77.5, 78.1, 79.3]);
    expect(sortReadings(readings, { column: 'quality', dir: 'asc' }).map((x) => x.qi)).toEqual(['Good', 'Suspect', 'Unreviewed', 'Transcribed']);
    expect(sortReadings(readings, { column: 'reviewer', dir: 'desc' })[0].reviewer).toBe('Philip Rennie');
    expect(sortReadings(readings, { column: 'sensor', dir: 'asc' }).map((x) => x.sensorId)).toEqual(['A', 'A', 'B', 'B']);
  });

  it('groups by sensor in sensor order, each group sorted, collapsed groups keep their header', () => {
    const rows = buildTableRows(readings, DEFAULT_TABLE_SORT, true, ['B', 'A'], new Set(['A']));
    expect(ids(rows)).toEqual(['#B', 'B3', 'B1', '#A']);
    const groupA = rows[3];
    expect(groupA.kind === 'group' && groupA.readingIds.length).toBe(2);
  });

  it('only lists the readings it is given (filtering happens upstream)', () => {
    const rows = buildTableRows(readings.slice(0, 2), DEFAULT_TABLE_SORT, true, ['A', 'B'], new Set());
    expect(ids(rows)).toEqual(['#A', 'A2', 'A0']);
  });
});
