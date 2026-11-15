import type { EChartsCoreOption } from 'echarts/core';
import { FURNITURE, FURNITURE_OPACITY, hexAlpha, QI_SYMBOL, seriesStyle } from '../../../../core/charts/chart-palette';
import { DAY_MS, formatDateTime } from '../../../../core/mock-data/dates';
import type { Qi } from '../../../../core/qi/qi.models';
import type { Baseline, OutOfService, Reading, Sensor } from '../../../../core/vnv/vnv.models';

/** Series ids: sensor series are `sensor:<id>`; everything else is chart furniture. */
export const SENSOR_SERIES_PREFIX = 'sensor:';

/**
 * Marker budget in sensor-days: markers draw when (visible sensors × window
 * days) is within it, else the chart shows lines only. 2,400 keeps 40 sensors
 * (the maximum) readable at 60 days, while the usual 1–12 get markers over far
 * wider windows: 12 → 200 days, 6 → 400 days, 1 → the whole range.
 */
export const MARKER_SENSOR_DAYS = 2400;

export function showMarkers(window: XRange, visibleSensors: number): boolean {
  const days = (window.end - window.start) / DAY_MS;
  return Math.max(visibleSensors, 1) * days <= MARKER_SENSOR_DAYS;
}

export interface XRange {
  start: number;
  end: number;
}

/** A loaded sensor's readings, sorted by time. */
export interface SensorSeries {
  sensor: Sensor;
  readings: Reading[];
}

export interface VnvChartData {
  series: SensorSeries[];
  hidden: ReadonlySet<string>;
  visibleQi: readonly Qi[];
  baseline: Baseline | null;
  outOfService: readonly OutOfService[];
  range: XRange;
}

/** Groups readings by sensor, keeping the sensors' order. */
export function groupBySensor(sensors: readonly Sensor[], readings: readonly Reading[]): SensorSeries[] {
  const map = new Map<string, Reading[]>(sensors.map((s) => [s.id, []]));
  for (const r of readings) map.get(r.sensorId)?.push(r);
  return sensors.map((sensor) => ({ sensor, readings: map.get(sensor.id)!.sort((a, b) => a.timestamp - b.timestamp) }));
}

/**
 * The full chart option (series, axes, furniture). The zoom window and y-range
 * are applied separately with {@link windowOption}, so panning doesn't rebuild
 * tens of thousands of points.
 */
export function buildVnvChartOptions(data: VnvChartData, window: XRange, yRange: [number, number], ringColor = FURNITURE): EChartsCoreOption {
  const shownQi = new Set(data.visibleQi);
  const visible = data.series.filter((s) => !data.hidden.has(s.sensor.id));
  const markers = showMarkers(window, visible.length);
  const sensorSeries = visible
    .map(({ sensor, readings }) => {
      const style = seriesStyle(sensor.colorIndex);
      // Plain [t, v] points plus a symbol lookup: far cheaper than an object per point.
      const symbols = readings.map((r) => (shownQi.has(r.qi) ? QI_SYMBOL[r.qi] : 'none'));
      return {
        id: SENSOR_SERIES_PREFIX + sensor.id,
        name: sensor.id,
        type: 'line',
        color: style.color,
        lineStyle: { width: 1.5, type: style.dash },
        symbolSize: 7,
        showSymbol: markers,
        showAllSymbol: 'auto',
        sampling: 'lttb',
        emphasis: { disabled: true },
        symbol: (_value: unknown, params: { dataIndex: number }) => symbols[params.dataIndex] ?? 'none',
        data: readings.map((r) => [r.timestamp, r.value]),
      };
    });

  return {
    // No entry sweep when series are rebuilt (legend, filters); rescales still animate.
    animationDuration: 0,
    animationDurationUpdate: 300,
    grid: { left: 48, right: 16, top: 12, bottom: 28 },
    xAxis: { type: 'time', min: data.range.start, max: data.range.end, splitLine: { show: false } },
    yAxis: { type: 'value', scale: true, min: yRange[0], max: yRange[1], axisLabel: { formatter: (v: number) => formatTick(v) } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', snap: false },
      confine: true,
      formatter: readoutFormatter(data.series.filter((s) => !data.hidden.has(s.sensor.id))),
    },
    dataZoom: [
      {
        type: 'inside',
        id: 'inside',
        xAxisIndex: 0,
        // 'filter' processes only the window's points: much faster when zoomed in.
        filterMode: 'filter',
        zoomOnMouseWheel: 'ctrl',
        moveOnMouseWheel: false,
        moveOnMouseMove: true,
        startValue: window.start,
        endValue: window.end,
      },
    ],
    // The brush registers toolbox buttons; the design has none.
    toolbox: { show: false },
    // Shift + drag draws this rectangle (the component takes the global cursor while Shift is held).
    brush: {
      xAxisIndex: 0,
      brushMode: 'single',
      transformable: false,
      throttleType: 'debounce',
      throttleDelay: 0,
      brushStyle: { borderWidth: 1, color: hexAlpha(FURNITURE, 0.12), borderColor: FURNITURE },
      outOfBrush: { colorAlpha: 1 },
    },
    series: [
      ...baselineSeries(data.baseline, data.range),
      outOfServiceSeries(data.outOfService),
      ...sensorSeries,
      selectionSeries([], ringColor),
    ],
  };
}

/** The partial option for a new zoom window, y-range and selection rings (merged into the chart). */
export function windowOption(window: XRange, yRange: [number, number], selection: readonly (readonly [number, number])[] = []): EChartsCoreOption {
  return {
    dataZoom: [{ id: 'inside', startValue: window.start, endValue: window.end }],
    yAxis: { min: yRange[0], max: yRange[1] },
    series: [{ id: SELECTION_SERIES_ID, data: selection }],
  };
}

export const SELECTION_SERIES_ID = 'selection';

/** Hollow rings around the selected readings. */
export function selectionSeries(points: readonly (readonly [number, number])[], ringColor: string): object {
  return {
    id: SELECTION_SERIES_ID,
    type: 'scatter',
    data: points,
    symbol: 'circle',
    symbolSize: 14,
    silent: true,
    z: 10,
    animation: false,
    tooltip: { show: false },
    itemStyle: { color: 'transparent', borderColor: ringColor, borderWidth: 2 },
  };
}

/** Points to ring: selected readings of visible sensors whose QI is shown. */
export function selectionPoints(data: VnvChartData, selected: ReadonlySet<string>): [number, number][] {
  if (selected.size === 0) return [];
  const shownQi = new Set(data.visibleQi);
  const out: [number, number][] = [];
  for (const { sensor, readings } of data.series) {
    if (data.hidden.has(sensor.id)) continue;
    for (const r of readings) if (selected.has(r.id) && shownQi.has(r.qi)) out.push([r.timestamp, r.value]);
  }
  return out;
}

/**
 * Readings inside a brushed rectangle: visible sensors, shown QIs, with time in
 * [t0, t1] and value in [v0, v1] (either order).
 */
export function selectInRect(data: VnvChartData, t: [number, number], v: [number, number]): string[] {
  const [t0, t1] = t[0] <= t[1] ? t : [t[1], t[0]];
  const [v0, v1] = v[0] <= v[1] ? v : [v[1], v[0]];
  const shownQi = new Set(data.visibleQi);
  const ids: string[] = [];
  for (const { sensor, readings } of data.series) {
    if (data.hidden.has(sensor.id)) continue;
    for (let i = lowerBound(readings, t0); i < readings.length && readings[i].timestamp <= t1; i++) {
      const r = readings[i];
      if (r.value >= v0 && r.value <= v1 && shownQi.has(r.qi)) ids.push(r.id);
    }
  }
  return ids;
}


/**
 * The y-range. Fit Y fits the visible sensors' readings inside the window,
 * using the 1st–99th percentile plus 8% padding so single spikes don't
 * flatten the rest. Off: the full-data range, padded the same way.
 */
export function yRangeFor(data: VnvChartData, window: XRange, fitY: boolean): [number, number] {
  const values: number[] = [];
  for (const { sensor, readings } of data.series) {
    if (data.hidden.has(sensor.id)) continue;
    const from = fitY ? lowerBound(readings, window.start) : 0;
    const to = fitY ? lowerBound(readings, window.end + 1) : readings.length;
    for (let i = from; i < to; i++) values.push(readings[i].value);
  }
  if (values.length === 0) return [0, 1];
  values.sort((a, b) => a - b);
  const lo = fitY ? percentile(values, 0.01) : values[0];
  const hi = fitY ? percentile(values, 0.99) : values[values.length - 1];
  const pad = Math.max((hi - lo) * 0.08, 0.1);
  return [round2(lo - pad), round2(hi + pad)];
}

/** Baseline value at time `t`: value + slope × years since its start date. */
export function baselineAt(b: Baseline, t: number): number {
  return b.value + (b.slopeRatePerYear * (t - b.startDate)) / (365.25 * DAY_MS);
}

function baselineSeries(b: Baseline | null, range: XRange): object[] {
  if (!b) return [];
  const xs = [range.start, range.end];
  const lower = xs.map((x) => [x, baselineAt(b, x) - b.lowerLimitOffset]);
  const band = xs.map((x) => [x, b.upperLimitOffset + b.lowerLimitOffset]);
  const line = xs.map((x) => [x, baselineAt(b, x)]);
  const furniture = { silent: true, symbol: 'none', animation: false, tooltip: { show: false }, emphasis: { disabled: true } };
  return [
    { ...furniture, id: 'baseline-lower', type: 'line', stack: 'baseline', data: lower, lineStyle: { opacity: 0 } },
    {
      ...furniture,
      id: 'baseline-band',
      type: 'line',
      stack: 'baseline',
      data: band,
      lineStyle: { opacity: 0 },
      areaStyle: { color: hexAlpha(FURNITURE, FURNITURE_OPACITY) },
    },
    { ...furniture, id: 'baseline', type: 'line', data: line, lineStyle: { color: FURNITURE, width: 1.5 } },
  ];
}

function outOfServiceSeries(windows: readonly OutOfService[]): object {
  return {
    id: 'out-of-service',
    type: 'line',
    silent: true,
    data: [],
    tooltip: { show: false },
    markArea: {
      silent: true,
      itemStyle: { color: hexAlpha(FURNITURE, FURNITURE_OPACITY * 1.5) },
      data: windows.map((w) => [{ xAxis: w.start }, { xAxis: w.end }]),
    },
  };
}

interface ReadoutParam {
  axisValue?: number;
  value?: [number, number];
}

/**
 * Hover readout: the time under the cursor, then every visible sensor's
 * nearest reading. ECharts' own axis tooltip keeps only the series nearest
 * overall (sensors' timestamps differ), so the lookup happens here.
 */
export function readoutFormatter(visible: readonly SensorSeries[]): (params: ReadoutParam | ReadoutParam[]) => string {
  return (params) => {
    const first = Array.isArray(params) ? params[0] : params;
    const time = first?.axisValue ?? first?.value?.[0];
    if (time === undefined || visible.length === 0) return '';
    const rows = visible
      .map(({ sensor, readings }) => {
        const r = nearest(readings, time);
        return (
          `<span style="display:inline-block;width:14px;height:2px;vertical-align:middle;background:${seriesStyle(sensor.colorIndex).color}"></span>` +
          `<span>${sensor.id}</span><b style="text-align:right">${r ? r.value.toFixed(2) : '—'}</b><span>°F</span>`
        );
      })
      .join('');
    const columns = visible.length > 14 ? 2 : 1;
    return (
      `<div style="margin-bottom:6px">${formatDateTime(time)}</div>` +
      `<div style="display:grid;grid-template-columns:repeat(${columns}, auto auto auto auto);column-gap:8px;row-gap:2px;align-items:center">${rows}</div>`
    );
  };
}

/** The reading closest in time to `t`. */
export function nearest(readings: readonly Reading[], t: number): Reading | null {
  if (readings.length === 0) return null;
  const i = lowerBound(readings, t);
  if (i === 0) return readings[0];
  if (i === readings.length) return readings[i - 1];
  return t - readings[i - 1].timestamp <= readings[i].timestamp - t ? readings[i - 1] : readings[i];
}

/** CSV of the visible readings inside the window. */
export function toCsv(data: VnvChartData, window: XRange): string {
  const readings = data.series
    .filter((s) => !data.hidden.has(s.sensor.id))
    .flatMap((s) => s.readings.filter((r) => r.timestamp >= window.start && r.timestamp <= window.end));
  return readingsToCsv(readings);
}

/** CSV of readings, in the order given. */
export function readingsToCsv(readings: readonly Reading[]): string {
  const header = 'sensor,date,value,units,qi,comment,reviewer';
  const rows = readings.map((r) =>
    [r.sensorId, formatDateTime(r.timestamp), r.value.toFixed(2), 'degree Fahrenheit', r.qi, r.comment ?? '', r.reviewer ?? ''].map(csvCell).join(','),
  );
  return [header, ...rows].join('\n');
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** First index with timestamp >= t. */
function lowerBound(readings: readonly Reading[], t: number): number {
  let lo = 0;
  let hi = readings.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (readings[mid].timestamp < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function percentile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function formatTick(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
