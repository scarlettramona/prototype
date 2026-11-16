import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, input, model, signal, untracked } from '@angular/core';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { zoomEventWindow, type ChartWindow, type ZoomEvent } from '../../../core/charts/chart-zoom';
import { PlutoChartThemeService, withAlpha } from '../../../core/charts/pluto-chart-theme';

export interface NavigatorSeries {
  id: string;
  color: string;
  dash: 'solid' | readonly number[];
  points: readonly (readonly [number, number])[];
}

export type NavigatorWindow = ChartWindow;

/**
 * The navigator under a chart: a thin preview of every series over the full
 * range, with a slider whose window is the chart's current view (Figma:
 * ILL navigator 1:8968). While a handle is dragged, a small label above it
 * shows the handle's value.
 *
 * The preview sits on x-axis 0 (fixed); the slider controls a hidden x-axis 1
 * with the same extent, so dragging doesn't zoom the preview itself.
 */
@Component({
  selector: 'app-chart-navigator',
  imports: [NgxEchartsDirective],
  templateUrl: './chart-navigator.component.html',
  styleUrl: './chart-navigator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartNavigatorComponent {
  protected readonly chartTheme = inject(PlutoChartThemeService);
  private readonly document = inject(DOCUMENT);

  readonly series = input.required<readonly NavigatorSeries[]>();
  readonly xMin = input.required<number>();
  readonly xMax = input.required<number>();
  /** Reversed axis (ILL depth: 600 → 0). */
  readonly inverse = input(false);
  /** The view window; `null` = full range. */
  readonly window = model<NavigatorWindow | null>(null);
  readonly labelFormatter = input<(value: number) => string>((v) => String(Math.round(v)));

  protected chart: ECharts | null = null;
  protected readonly dragging = signal(false);
  private readonly active = signal<{ value: number } | null>(null);

  constructor() {
    const stop = () => {
      this.dragging.set(false);
      this.active.set(null);
    };
    this.document.addEventListener('pointerup', stop);
    this.document.addEventListener('pointercancel', stop);
  }

  protected readonly options = computed<EChartsCoreOption>(() => {
    const t = this.chartTheme.tokens();
    const axis = { type: 'value', min: this.xMin(), max: this.xMax(), inverse: this.inverse(), show: false };
    // Untracked: window moves arrive through `windowMerge`, so panning doesn't rebuild the preview.
    const w = untracked(() => this.windowValues());
    return {
      animation: false,
      grid: { left: 0, right: 0, top: 4, bottom: 4 },
      xAxis: [axis, { ...axis, id: 'zoom' }],
      yAxis: { type: 'value', scale: true, show: false },
      series: this.series().map((s) => ({
        id: s.id,
        type: 'line',
        xAxisIndex: 0,
        data: s.points,
        silent: true,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { color: s.color, width: 1, opacity: 0.8, type: s.dash === 'solid' ? 'solid' : [...s.dash] },
      })),
      dataZoom: [
        {
          type: 'slider',
          id: 'nav',
          xAxisIndex: 1,
          filterMode: 'none',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          showDataShadow: false,
          showDetail: false,
          brushSelect: false,
          moveHandleSize: 0,
          handleSize: '100%',
          backgroundColor: 'transparent',
          borderColor: t.outlineVariant,
          fillerColor: withAlpha(t.primary, 0.14),
          handleStyle: { color: t.primary, borderColor: t.primary },
          emphasis: { handleStyle: { color: t.primary, borderColor: t.primary } },
          startValue: w.start,
          endValue: w.end,
        },
      ],
    };
  });

  /** Keeps the slider on the window when it changes elsewhere (panning the chart). */
  protected readonly windowMerge = computed<EChartsCoreOption>(() => {
    const w = this.windowValues();
    return { dataZoom: [{ id: 'nav', startValue: w.start, endValue: w.end }] };
  });

  protected readonly bubble = computed(() => {
    const a = this.active();
    if (!a || !this.dragging() || !this.chart) return null;
    const x = this.chart.convertToPixel({ xAxisIndex: 0 }, a.value) as number;
    return { x, text: this.labelFormatter()(a.value) };
  });

  protected onZoom(event: ZoomEvent): void {
    const next = zoomEventWindow(event, this.xMin(), this.xMax());
    if (!next) return;
    const { start, end } = next;
    const prev = this.windowValues();
    // Whichever handle moved gets the label; a window drag labels its start.
    const moved = Math.abs(end - prev.end) > Math.abs(start - prev.start) ? end : start;
    this.active.set({ value: moved });
    this.window.set(start <= this.xMin() && end >= this.xMax() ? null : { start, end });
  }

  private windowValues(): NavigatorWindow {
    return this.window() ?? { start: this.xMin(), end: this.xMax() };
  }
}
