import type { EChartsCoreOption } from 'echarts/core';
import { seriesStyle } from '../../../core/charts/chart-palette';
import type { Scan } from '../../../core/ill/ill.models';
import { formatDateTime } from '../../../core/mock-data/dates';
import { countsAt, DEPTH_MAX, DEPTH_MIN, type DepthWindow } from './focus-model';

export const SCAN_SERIES_PREFIX = 'scan:';
const ILL_SERIES_ID = 'ill-lines';


export interface DepthChartData {
  /** Visible scans, in tab order. */
  scans: readonly Scan[];
  /** The focused scan (a scan tab), or `null` for All scans. */
  focusedId: string | null;
  /** Which Calculated ILL lines of the focused scan to draw. */
  lines: { saved: boolean; unsaved: boolean };
  /** The well's reference scan, if it is on the chart. */
  referenceId: string | null;
}

/**
 * The ILL depth chart (Figma 1:8968 / 1:9514 / 1:10048), also used for a single
 * scan and its reference in the library's expanded row (1:2094) with `zoom: false`.
 * One line per visible scan, all solid. The well's reference scan is never faded.
 * In a scan tab the focused scan is heavier and on top, the others thinner and
 * faded. The focused scan's Calculated ILL is drawn as vertical lines: saved
 * solid, unsaved dashed (as the legend draws them).
 */
export function buildDepthChartOptions(
  data: DepthChartData,
  window: DepthWindow | null,
  yRange: [number, number],
  tagText: string,
  { zoom = true }: { zoom?: boolean } = {},
): EChartsCoreOption {
  const focused = data.scans.find((s) => s.id === data.focusedId) ?? null;
  const series = data.scans.map((scan) => {
    const color = seriesStyle(scan.colorIndex).color;
    const isFocus = scan.id === data.focusedId;
    const isReference = scan.id === data.referenceId;
    const faded = !!focused && !isFocus && !isReference;
    return {
      id: SCAN_SERIES_PREFIX + scan.id,
      name: formatDateTime(scan.datetime),
      type: 'line',
      color,
      z: isFocus ? 4 : isReference ? 3 : 2,
      showSymbol: false,
      sampling: 'lttb',
      emphasis: { disabled: true },
      lineStyle: { width: isFocus ? 2 : isReference ? 1.5 : 1, type: 'solid', opacity: faded ? 0.5 : 1 },
      data: scan.points.map((p) => [p.depthIn, p.counts]),
    };
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

/** Hover readout: the depth, then every visible scan's counts at that depth. */
export function readoutFormatter(scans: readonly Scan[], referenceId: string | null = null): (params: ReadoutParam | ReadoutParam[]) => string {
  return (params) => {
    const first = Array.isArray(params) ? params[0] : params;
    const depth = first?.axisValue ?? first?.value?.[0];
    if (depth === undefined || scans.length === 0) return '';
    const rows = scans
      .map((s) => {
        const c = countsAt(s.points, depth);
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
