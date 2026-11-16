import type { Reading, Sensor } from '../../../../core/vnv/vnv.models';
import {
  baselineAt,
  buildVnvChartOptions,
  groupBySensor,
  nearest,
  readoutFormatter,
  selectInRect,
  selectionPoints,
  SENSOR_SERIES_PREFIX,
  showMarkers,
  toCsv,
  yRangeFor,
  type VnvChartData,
} from './vnv-chart-options';

const D = 86_400_000;
const T0 = new Date(2026, 9, 1).getTime();

function sensor(id: string, colorIndex: number): Sensor {
  return { id, locationId: 'L', elevationIn: 0, units: '°F', colorIndex, dataStart: T0, dataEnd: T0 + 100 * D, real: false };
}

function reading(sensorId: string, day: number, value: number, qi: Reading['qi'] = 'Good'): Reading {
  const timestamp = T0 + day * D;
  return { id: `${sensorId}|${timestamp}`, sensorId, timestamp, value, qi, real: false };
}

const sensors = [sensor('A', 0), sensor('B', 1)];
const readings = [
  ...Array.from({ length: 100 }, (_, i) => reading('A', i, 78 + (i % 5) * 0.1, i >= 90 ? 'Unreviewed' : 'Good')),
  ...Array.from({ length: 100 }, (_, i) => reading('B', i, 76 + (i % 3) * 0.1)),
];
readings[150] = { ...readings[150], value: 140 }; // one spike on B

function data(overrides: Partial<VnvChartData> = {}): VnvChartData {
  return {
    series: groupBySensor(sensors, readings),
    hidden: new Set(),
    visibleQi: ['Good', 'Suspect', 'Unreviewed', 'Transcribed'],
    baseline: { sensorId: 'A', value: 78, upperLimitOffset: 2, lowerLimitOffset: 1, slopeRatePerYear: 0.5, startDate: T0 },
    outOfService: [{ sensorId: 'A', start: T0 + 10 * D, end: T0 + 12 * D }],
    range: { start: T0, end: T0 + 100 * D },
    ...overrides,
  };
}

type AnySeries = { id: string; data: unknown[]; symbol?: (v: unknown, p: { dataIndex: number }) => string; markArea?: { data: unknown[] }; showSymbol?: boolean };
const seriesOf = (o: object) => (o as { series: AnySeries[] }).series;
const window = { start: T0, end: T0 + 100 * D };

describe('VNV chart options', () => {
  it('leaves hidden sensors out of the chart', () => {
    const ids = seriesOf(buildVnvChartOptions(data({ hidden: new Set(['B']) }), window, [70, 90])).map((s) => s.id);
    expect(ids).toContain(SENSOR_SERIES_PREFIX + 'A');
    expect(ids).not.toContain(SENSOR_SERIES_PREFIX + 'B');
  });

  it('hides the points of a filtered QI but keeps the line', () => {
    const a = seriesOf(buildVnvChartOptions(data({ visibleQi: ['Good'] }), window, [70, 90])).find((s) => s.id === 'sensor:A')!;
    expect(a.data.length).toBe(100);
    expect(a.symbol!(null, { dataIndex: 0 })).toBe('circle');
    expect(a.symbol!(null, { dataIndex: 95 })).toBe('none');
  });

  it('scales the marker cutoff with the number of visible sensors', () => {
    const days = (n: number) => ({ start: T0, end: T0 + n * D });
    expect(showMarkers(days(60), 40)).toBe(true);
    expect(showMarkers(days(61), 40)).toBe(false);
    expect(showMarkers(days(200), 12)).toBe(true);
    expect(showMarkers(days(400), 6)).toBe(true);
    expect(showMarkers(days(681), 1)).toBe(true); // a single sensor: always
    // Two visible sensors over 100 days → markers on.
    const s = seriesOf(buildVnvChartOptions(data(), window, [70, 90])).find((x) => x.id === 'sensor:A')!;
    expect(s.showSymbol).toBe(true);
  });

  it('Fit Y ignores a single spike; off covers everything', () => {
    const [lo, hi] = yRangeFor(data(), window, true);
    expect(lo).toBeLessThan(76);
    expect(hi).toBeLessThan(80);
    const [, hiOff] = yRangeFor(data(), window, false);
    expect(hiOff).toBeGreaterThan(140);
  });

  it('Fit Y fits the window, and hidden sensors drop out', () => {
    const [lo] = yRangeFor(data({ hidden: new Set(['B']) }), { start: T0, end: T0 + 20 * D }, true);
    expect(lo).toBeGreaterThan(77);
  });

  it('draws the baseline along its slope, inside the limit band', () => {
    const b = data().baseline!;
    expect(baselineAt(b, T0)).toBe(78);
    expect(baselineAt(b, T0 + 365.25 * D)).toBeCloseTo(78.5, 6);
    const s = seriesOf(buildVnvChartOptions(data(), window, [70, 90]));
    const lower = s.find((x) => x.id === 'baseline-lower')!.data as number[][];
    const band = s.find((x) => x.id === 'baseline-band')!.data as number[][];
    expect(lower[0][1]).toBe(77);
    expect(band[0][1]).toBe(3);
  });

  it('shades the out-of-service windows', () => {
    const oos = seriesOf(buildVnvChartOptions(data(), window, [70, 90])).find((x) => x.id === 'out-of-service')!;
    expect(oos.markArea!.data).toEqual([[{ xAxis: T0 + 10 * D }, { xAxis: T0 + 12 * D }]]);
  });

  it('reads out every visible sensor at the hovered time', () => {
    const visible = data().series;
    const html = readoutFormatter(visible)([{ axisValue: T0 + 5 * D + 1000 }]);
    expect(html).toContain('>A<');
    expect(html).toContain('>B<');
    expect(nearest(visible[0].readings, T0 + 5.6 * D)!.timestamp).toBe(T0 + 6 * D);
  });

  it('selects readings inside a brushed rectangle, skipping hidden sensors and filtered QIs', () => {
    const all = selectInRect(data(), [T0 + 89 * D, T0 + 92 * D], [70, 90]);
    expect(all).toEqual(expect.arrayContaining(['A|' + (T0 + 89 * D), 'A|' + (T0 + 90 * D), 'B|' + (T0 + 92 * D)]));
    expect(all.length).toBe(8);
    // Reversed bounds work too; a value window excludes B (≈76).
    expect(selectInRect(data(), [T0 + 92 * D, T0 + 89 * D], [79, 77]).every((id) => id.startsWith('A|'))).toBe(true);
    expect(selectInRect(data({ hidden: new Set(['A']) }), [T0 + 89 * D, T0 + 92 * D], [70, 90]).every((id) => id.startsWith('B|'))).toBe(true);
    // A's readings from day 90 are Unreviewed; filtering that QI drops them.
    expect(selectInRect(data({ visibleQi: ['Good'] }), [T0 + 89 * D, T0 + 92 * D], [70, 90])).not.toContain('A|' + (T0 + 90 * D));
  });

  it('rings only selected readings that are visible', () => {
    const selected = new Set(['A|' + T0, 'B|' + T0]);
    expect(selectionPoints(data(), selected)).toEqual([
      [T0, 78],
      [T0, 76],
    ]);
    expect(selectionPoints(data({ hidden: new Set(['B']) }), selected)).toEqual([[T0, 78]]);
    expect(selectionPoints(data(), new Set())).toEqual([]);
  });

  it('exports the visible readings in the window as CSV', () => {
    const csv = toCsv(data({ hidden: new Set(['B']) }), { start: T0, end: T0 + 2 * D }).split('\n');
    expect(csv[0]).toBe('sensor,date,value,units,qi,comment,reviewer');
    expect(csv.length).toBe(4);
    expect(csv[1].startsWith('A,10/01/2026')).toBe(true);
  });
});
