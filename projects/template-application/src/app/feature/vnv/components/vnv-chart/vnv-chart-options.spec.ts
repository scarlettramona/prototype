import type { Reading, Sensor } from '../../../../core/vnv/vnv.models';
import {
  baselineAt,
  buildVnvChartOptions,
  groupBySensor,
  nearest,
  readoutFormatter,
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

  it('shows markers only in narrow windows', () => {
    expect(showMarkers({ start: T0, end: T0 + 30 * D })).toBe(true);
    expect(showMarkers({ start: T0, end: T0 + 100 * D })).toBe(false);
    const s = seriesOf(buildVnvChartOptions(data(), window, [70, 90])).find((x) => x.id === 'sensor:A')!;
    expect(s.showSymbol).toBe(false);
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

  it('exports the visible readings in the window as CSV', () => {
    const csv = toCsv(data({ hidden: new Set(['B']) }), { start: T0, end: T0 + 2 * D }).split('\n');
    expect(csv[0]).toBe('sensor,date,value,units,qi,comment,reviewer');
    expect(csv.length).toBe(4);
    expect(csv[1].startsWith('A,10/01/2026')).toBe(true);
  });
});
