import type { EChartsCoreOption } from 'echarts/core';
import { seriesStyle } from '../../../core/charts/chart-palette';
import { calculatedPoints, primaryPoints } from '../../../core/ill/ill-profiles';
import type { Scan, ScanPoint } from '../../../core/ill/ill.models';
import { formatDateTime } from '../../../core/mock-data/dates';
import { countsAt, DEPTH_MAX, DEPTH_MIN, type DepthWindow } from './focus-model';

export const SCAN_SERIES_PREFIX = 'scan:';
export const RAW_SERIES_PREFIX = 'raw:';
const ILL_SERIES_ID = 'ill-lines';

/** Line dashes: raw scans dotted, the reference scan dashed (Figma 1:2094), the rest solid. */
export const RAW_DASH = [2, 2];
export const REFERENCE_DASH = [7, 3];

export interface DepthChartData {
  /** Visible scans, in tab order. */
  scans: readonly Scan[];
  /** The focused scan (a scan tab), or `null` for All scans. */
  focusedId: string | null;
  /** Which Calculated ILL lines of the focused scan to draw. */
  lines: { saved: boolean; unsaved: boolean };
  /** The well's reference scan, if it is on the chart. */
  referenceId: string | null;
  /** Scans whose raw line is drawn (a scan without analysis always draws its raw line). */
  raw: ReadonlySet<string>;
}

/** The profiles a chart draws for `data` (for the y-range): calculated lines, and raw ones where shown. */
export function drawnProfiles(data: DepthChartData): (readonly ScanPoint[])[] {
  return data.scans.flatMap((s) => {
    const calc = calculatedPoints(s);
    return calc ? (data.raw.has(s.id) ? [calc, s.points] : [calc]) : [s.points];
  });
}

/**
 * The ILL depth chart (Figma 1:8968 / 1:9514 / 1:10048), also used for a single
 * scan and its reference in the library's expanded row (1:2094) with `zoom: false`.
 * Each visible scan draws its calculated profile solid and, where shown, its raw
 * profile dotted (a scan without analysis has only the raw one). The reference
 * scan is dashed and never faded. In a scan tab the focused scan is heavier and
 * on top, the others thinner and faded. The focused scan's Calculated ILL is
 * drawn as vertical lines: saved solid, unsaved dashed (as the legend draws them).
 */
export function buildDepthChartOptions(
  data: DepthChartData,
  window: DepthWindow | null,
  yRange: [number, number],
  tagText: string,
  { zoom = true }: { zoom?: boolean } = {},
): EChartsCoreOption {
  const focused = data.scans.find((s) => s.id === data.focusedId) ?? null;
  const series = data.scans.flatMap((scan) => {
    const color = seriesStyle(scan.colorIndex).color;
    const isFocus = scan.id === data.focusedId;
    const isReference = scan.id === data.referenceId;
    const faded = !!focused && !isFocus && !isReference;
    const z = isFocus ? 4 : isReference ? 3 : 2;
    const line = (id: string, points: readonly ScanPoint[], width: number, type: 'solid' | number[], opacity: number) => ({
      id,
      name: formatDateTime(scan.datetime),
      type: 'line',
      color,
      z,
      showSymbol: false,
      sampling: 'lttb',
      emphasis: { disabled: true },
      lineStyle: { width, type, opacity },
      data: points.map((p) => [p.depthIn, p.counts]),
    });
    const calc = calculatedPoints(scan);
    const out: object[] = [];
    if (calc) out.push(line(SCAN_SERIES_PREFIX + scan.id, calc, isFocus ? 2 : isReference ? 1.5 : 1, isReference ? REFERENCE_DASH : 'solid', faded ? 0.5 : 1));
    if (!calc || data.raw.has(scan.id)) {
      out.push(line(RAW_SERIES_PREFIX + scan.id, scan.points, isFocus ? 1.5 : 1, RAW_DASH, faded ? 0.4 : 0.9));
    }
    return out;
  });

  return {
    animationDuration: 0,
    animationDurationUpdate: 300,
    grid: { left: 64, right: 16, top: 28, bottom: 48 },
    xAxis: {
      type: 'value',
      min: DEPTH_MIN,
      max: DEPTH_MAX,
      inverse: true,
      name: 'From Bottom of Tank (inches)',
      nameLocation: 'middle',
      nameGap: 28,
      splitLine: { show: true },
      // Zoomed windows end on fractional depths; label whole ticks only.
      axisLabel: { formatter: (v: number) => (Number.isInteger(v) ? String(v) : '') },
    },
    yAxis: {
      type: 'value',
      min: yRange[0],
      max: yRange[1],
      name: 'Corrected Counts',
      nameLocation: 'middle',
      nameGap: 48,
      axisLabel: { formatter: (v: number) => String(Math.round(v)) },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', snap: false },
      confine: true,
      formatter: readoutFormatter(data.scans, data.referenceId),
    },
    // Without zoom (the library row has no navigator or Reset), drag does nothing.
    dataZoom: zoom
      ? [
          {
            type: 'inside',
            id: 'inside',
            xAxisIndex: 0,
            filterMode: 'filter',
            zoomOnMouseWheel: 'ctrl',
            moveOnMouseWheel: false,
            moveOnMouseMove: true,
            startValue: window?.start ?? DEPTH_MIN,
            endValue: window?.end ?? DEPTH_MAX,
          },
        ]
      : [],
    series: [...series, illLines(focused, data.lines, tagText)],
  };
}

/** The window and y-range, merged into the chart without a rebuild. */
export function depthWindowOption(window: DepthWindow | null, yRange: [number, number]): EChartsCoreOption {
  return {
    dataZoom: [{ id: 'inside', startValue: window?.start ?? DEPTH_MIN, endValue: window?.end ?? DEPTH_MAX }],
    yAxis: { min: yRange[0], max: yRange[1] },
  };
}

function illLines(scan: Scan | null, show: DepthChartData['lines'], tagText: string): object {
  const data: object[] = [];
  if (scan) {
    const color = seriesStyle(scan.colorIndex).color;
    const { saved, unsaved } = scan.analysis;
    if (saved && show.saved) data.push(illLine(saved.results.calculatedIll, color, 'solid', tagText));
    if (unsaved && show.unsaved) data.push(illLine(unsaved.results.calculatedIll, color, 'dashed', tagText));
  }
  return {
    id: ILL_SERIES_ID,
    type: 'line',
    data: [],
    silent: true,
    tooltip: { show: false },
    markLine: { silent: true, symbol: 'none', animation: false, data },
  };
}

function illLine(depth: number, color: string, type: 'solid' | 'dashed', tagText: string): object {
  return {
    xAxis: depth,
    lineStyle: { color, type, width: 1.5 },
    label: {
      show: true,
      position: 'end',
      formatter: depth.toFixed(3),
      color: tagText,
      backgroundColor: color,
      padding: [2, 6],
      borderRadius: 100,
      fontSize: 11,
    },
  };
}

interface ReadoutParam {
  axisValue?: number;
  value?: [number, number];
}

/** Hover readout: the depth, then every visible scan's counts (calculated, else raw) at that depth. */
export function readoutFormatter(scans: readonly Scan[], referenceId: string | null = null): (params: ReadoutParam | ReadoutParam[]) => string {
  return (params) => {
    const first = Array.isArray(params) ? params[0] : params;
    const depth = first?.axisValue ?? first?.value?.[0];
    if (depth === undefined || scans.length === 0) return '';
    const rows = scans
      .map((s) => {
        const c = countsAt(primaryPoints(s), depth);
        return (
          `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${seriesStyle(s.colorIndex).color}"></span>` +
          `<span>${formatDateTime(s.datetime)}${s.id === referenceId ? ' (reference)' : ''}</span><b style="text-align:right">${c === null ? '—' : c.toFixed(1)}</b>`
        );
      })
      .join('');
    return (
      `<div style="margin-bottom:6px">${depth.toFixed(1)} in</div>` +
      `<div style="display:grid;grid-template-columns:auto auto auto;column-gap:8px;row-gap:2px;align-items:center">${rows}</div>`
    );
  };
}
