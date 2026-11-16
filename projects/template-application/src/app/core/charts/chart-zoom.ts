import type { ECharts } from 'echarts/core';

/** A zoom window in axis values. */
export interface ChartWindow {
  start: number;
  end: number;
}

/** ECharts' `datazoom` event: percentages, batched when several zooms move together. */
export interface ZoomEvent {
  start?: number;
  end?: number;
  batch?: { start?: number; end?: number }[];
}

/** How much one wheel step zooms. */
const WHEEL_ZOOM_FACTOR = 1.2;

/** A `datazoom` event's window in axis values, over the full range `min`–`max`. */
export function zoomEventWindow(event: ZoomEvent, min: number, max: number): ChartWindow | null {
  const e = event.batch?.[0] ?? event;
  if (e.start === undefined || e.end === undefined) return null;
  const span = max - min;
  return { start: min + (span * e.start) / 100, end: min + (span * e.end) / 100 };
}

/**
 * ⌘ + wheel zooms `window` at the cursor (ECharts handles Ctrl itself). A plain
 * wheel returns `null`, so the page scrolls.
 */
export function wheelZoomWindow(chart: ECharts, event: WheelEvent, window: ChartWindow): ChartWindow | null {
  if (!event.metaKey || event.ctrlKey) return null;
  event.preventDefault();
  // A single-axis finder takes the pixel along that axis, not an [x, y] point.
  const center = chart.convertFromPixel({ xAxisIndex: 0 }, event.offsetX);
  if (!Number.isFinite(center)) return null;
  const factor = event.deltaY > 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
  return { start: center - (center - window.start) * factor, end: center + (window.end - center) * factor };
}

/**
 * Wires ⌘ + wheel zoom to a chart; returns the function that removes it.
 * ECharts stops wheel events from bubbling out of the chart, so this listens in
 * the capture phase on the chart's element.
 */
export function onWheelZoom(chart: ECharts, currentWindow: () => ChartWindow, apply: (window: ChartWindow) => void): () => void {
  const dom = chart.getDom();
  const listener = (event: WheelEvent) => {
    const next = wheelZoomWindow(chart, event, currentWindow());
    if (next) apply(next);
  };
  dom.addEventListener('wheel', listener, { capture: true, passive: false });
  return () => dom.removeEventListener('wheel', listener, { capture: true });
}

/**
 * Coalesces calls to one `apply` per animation frame, with the latest value.
 * ECharts has already drawn a pan by the time its event fires; this keeps the
 * store update (y fit, navigator) to one per frame.
 */
export function oncePerFrame<T>(apply: (value: T) => void): (value: T) => void {
  let pending: { value: T } | null = null;
  let frame: number | null = null;
  return (value) => {
    pending = { value };
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const next = pending;
      pending = null;
      if (next) apply(next.value);
    });
  };
}
