import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, DOCUMENT, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { seriesStyle } from '../../../../core/charts/chart-palette';
import { oncePerFrame, onWheelZoom, zoomEventWindow, type ChartWindow, type ZoomEvent } from '../../../../core/charts/chart-zoom';
import { PlutoChartThemeService, withAlpha } from '../../../../core/charts/pluto-chart-theme';
import { downloadText, downloadUrl } from '../../../../core/download/download';
import { formatDate } from '../../../../core/mock-data/dates';
import { ChartCardComponent } from '../../../../ui/components/chart-card/chart-card.component';
import { ChartNavigatorComponent, type NavigatorSeries, type NavigatorWindow } from '../../../../ui/components/chart-navigator/chart-navigator.component';
import { QualityFilterComponent } from '../../../../ui/components/quality-filter/quality-filter.component';
import { SelectionActionBarComponent } from '../../../../ui/components/selection-action-bar/selection-action-bar.component';
import { VnvFormComponent } from '../../../../ui/components/vnv-form/vnv-form.component';
import { VnvStore } from '../../vnv-store';
import { buildVnvChartOptions, hoverPointOption, hoverSeriesIndex, nearestPoint, selectInRect, selectionPoints, sensorSeriesIndex, showMarkers, toCsv, type VnvChartData, windowOption, yRangeFor } from './vnv-chart-options';

/** The VNV | ⋯ bar's size (Figma 1:11704), for keeping it inside the chart. */
const BAR_SIZE = { width: 94, height: 42 };

interface BrushEndEvent {
  areas?: { coordRange?: [[number, number], [number, number]] }[];
}

/**
 * The VNV chart card (Figma graph-panel 1:11454): quality filter · Fit Y ·
 * Export, the time series, and the navigator with Reset.
 * Shift + drag selects readings; the VNV | ⋯ bar floats in the chart (see
 * `barPos`) and opens the VNV form popover (Figma 1:11678).
 */
@Component({
  selector: 'app-vnv-chart',
  imports: [
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MatButtonModule,
    MatMenuModule,
    MatSlideToggleModule,
    NgxEchartsDirective,
    ChartCardComponent,
    ChartNavigatorComponent,
    QualityFilterComponent,
    SelectionActionBarComponent,
    VnvFormComponent,
  ],
  templateUrl: './vnv-chart.component.html',
  styleUrl: './vnv-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VnvChartComponent {
  protected readonly store = inject(VnvStore);
  protected readonly chartTheme = inject(PlutoChartThemeService);
  private readonly document = inject(DOCUMENT);
  protected chart: ECharts | null = null;
  protected readonly formatDate = formatDate;

  private readonly data = computed<VnvChartData>(() => ({
    series: this.store.series(),
    hidden: this.store.hiddenSensorIds(),
    visibleQi: this.store.visibleQi(),
    baseline: this.store.baseline(),
    outOfService: this.store.outOfService(),
    range: this.store.xRange(),
  }));

  private readonly yRange = computed(() => yRangeFor(this.data(), this.store.effectiveWindow(), this.store.fitY()));

  /** Markers on/off; a computed, so it only notifies when the flag flips. */
  private readonly markers = computed(() => {
    const data = this.data();
    const visible = data.series.filter((s) => !data.hidden.has(s.sensor.id)).length;
    return showMarkers(this.store.effectiveWindow(), visible);
  });

  /**
   * Rebuilt only when the data or the marker flag changes; window moves and
   * selection rings arrive via `windowMerge`. (A full rebuild is ~10× cheaper
   * than merging `showSymbol` into 40 series.)
   */
  protected readonly options = computed<EChartsCoreOption>(() => {
    const data = this.data();
    this.markers();
    const ring = this.chartTheme.tokens().onSurface;
    return untracked(() => buildVnvChartOptions(data, this.store.effectiveWindow(), this.yRange(), ring));
  });

  private readonly ringPoints = computed(() => selectionPoints(this.data(), this.store.selectedIds()));

  protected readonly windowMerge = computed(() => windowOption(this.store.effectiveWindow(), this.yRange(), this.ringPoints()));

  protected readonly navigatorSeries = computed<NavigatorSeries[]>(() => {
    const data = this.data();
    return data.series
      .filter((s) => !data.hidden.has(s.sensor.id))
      .map(({ sensor, readings }) => {
        const style = seriesStyle(sensor.colorIndex);
        return { id: sensor.id, color: style.color, dash: style.dash, points: readings.map((r) => [r.timestamp, r.value] as const) };
      });
  });

  protected readonly loadingOpts = computed(() => {
    const t = this.chartTheme.tokens();
    return { text: '', color: t.primary, maskColor: withAlpha(t.surfaceContainer, 0.7), lineWidth: 3 };
  });

  /**
   * Where the VNV | ⋯ bar floats, inside the chart: where the pointer ended a
   * Shift + drag selection; for other selections (Select all shown, the table, a
   * fixture), the plot's top-right corner.
   */
  protected readonly barPos = signal<{ x: number; y: number } | null>(null);
  /** The pointer's position over the chart, kept while Shift is held. */
  private pointer: { x: number; y: number } | null = null;
  /** Where the last drag selection ended, in data coordinates (so it follows pans), and the selection it belongs to. */
  private dragEnd: { point: [number, number]; ids: ReadonlySet<string> } | null = null;
  protected readonly popoverPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  ];

  private hovering = false;
  private shiftHeld = false;
  private brushOn = false;
  private unbindWheelZoom: (() => void) | null = null;
  private readonly setWindowPerFrame = oncePerFrame((window: ChartWindow) => this.store.setWindow(window));

  constructor() {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return;
      this.shiftHeld = e.type === 'keydown';
      this.syncBrush();
    };
    const onBlur = () => {
      this.shiftHeld = false;
      this.syncBrush();
    };
    // Where a Shift + drag ends: ECharts owns the pointer during a drag, so listen
    // on the document (capture, before ECharts' mouseup ends the brush).
    const onPointer = (e: PointerEvent) => {
      if (!this.shiftHeld || !this.chart) return;
      const box = this.chart.getDom().getBoundingClientRect();
      this.pointer = { x: e.clientX - box.left, y: e.clientY - box.top };
    };
    const view = this.document.defaultView;
    this.document.addEventListener('keydown', onKey);
    this.document.addEventListener('keyup', onKey);
    this.document.addEventListener('pointermove', onPointer, true);
    this.document.addEventListener('pointerup', onPointer, true);
    view?.addEventListener('blur', onBlur);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('keydown', onKey);
      this.document.removeEventListener('keyup', onKey);
      this.document.removeEventListener('pointermove', onPointer, true);
      this.document.removeEventListener('pointerup', onPointer, true);
      view?.removeEventListener('blur', onBlur);
      this.unbindWheelZoom?.();
    });

    // The rings change with the selection; re-place the bar once the chart has drawn them.
    effect(() => {
      this.ringPoints();
      untracked(() => requestAnimationFrame(() => this.positionBar()));
    });
  }

  protected setHovering(on: boolean): void {
    this.hovering = on;
    this.syncBrush();
  }

  /** Shift held over the chart: drag draws a selection rectangle instead of panning. */
  private syncBrush(): void {
    const want = this.hovering && this.shiftHeld;
    if (!this.chart || want === this.brushOn) return;
    this.brushOn = want;
    this.chart.dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: { brushType: want ? 'rect' : false, brushMode: 'single' } });
  }

  protected onBrushEnd(event: BrushEndEvent): void {
    const range = event.areas?.[0]?.coordRange;
    this.chart?.dispatchAction({ type: 'brush', areas: [] });
    if (!range) return;
    const ids = selectInRect(this.data(), range[0], range[1]);
    if (!ids.length) {
      this.store.clearSelection();
      return;
    }
    this.store.setSelection(ids);
    const at = this.pointer && this.chart ? (this.chart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [this.pointer.x, this.pointer.y]) as number[]) : null;
    this.dragEnd = at ? { point: [at[0], at[1]], ids: this.store.selectedIds() } : null;
  }

  /** Places the action bar (see `barPos`); hides it when no selected point is in view. */
  protected positionBar(): void {
    const chart = this.chart;
    const w = this.store.effectiveWindow();
    const inView = this.ringPoints().filter(([t]) => t >= w.start && t <= w.end);
    if (!chart || inView.length === 0) {
      if (this.barPos()) this.barPos.set(null);
      return;
    }
    let next: { x: number; y: number };
    const end = this.dragEnd?.ids === this.store.selectedIds() ? this.dragEnd.point : null;
    if (end) {
      // Just past the pointer's end point, kept inside the chart.
      const [x, y] = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, end) as number[];
      next = {
        x: Math.round(Math.min(Math.max(0, x + 8), chart.getWidth() - BAR_SIZE.width)),
        y: Math.round(Math.min(Math.max(0, y + 8), chart.getHeight() - BAR_SIZE.height)),
      };
    } else {
      // Other selections (Select all shown, the table, a fixture): the plot's
      // top-right corner, where it's easy to spot.
      const [right, top] = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [w.end, this.yRange()[1]]) as number[];
      next = { x: Math.max(0, Math.round(right - BAR_SIZE.width - 8)), y: Math.max(0, Math.round(top + 8)) };
    }
    const prev = this.barPos();
    if (!prev || prev.x !== next.x || prev.y !== next.y) this.barPos.set(next);
  }

  protected onPopoverKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.store.vnvPopoverOpen.set(false);
  }

  /** Inside zoom (drag pan, Ctrl + wheel): percent of the loaded range. */
  protected onZoom(event: ZoomEvent): void {
    const x = this.store.xRange();
    const window = zoomEventWindow(event, x.start, x.end);
    if (window) this.setWindowPerFrame(window);
  }

  protected onNavigator(window: NavigatorWindow | null): void {
    if (window) this.store.setWindow(window);
    else this.store.resetWindow();
  }

  /** Keeps the chart and wires ⌘ + wheel zoom and wide-view hover. Runs again when the theme changes and the chart is rebuilt. */
  protected onChartInit(chart: ECharts): void {
    this.chart = chart;
    this.unbindWheelZoom?.();
    this.unbindWheelZoom = onWheelZoom(chart, () => this.store.effectiveWindow(), (window) => this.store.setWindow(window));
    const zr = chart.getZr();
    zr.on('mousemove', (e: { offsetX: number; offsetY: number }) => this.hoverNearest(e.offsetX, e.offsetY));
    zr.on('globalout', () => this.hoverNearest(null, null));
  }

  /** The sensor series index currently hovered by `hoverNearest`. */
  private hovered: { seriesIndex: number; dataIndex: number } | null = null;

  /**
   * Wide views draw no points, so ECharts can't hover one: find the reading
   * nearest the pointer (within 10 px) and show its tooltip, dimming the other
   * sensors as a point hover does. With points drawn, ECharts' own hover runs.
   */
  private hoverNearest(x: number | null, y: number | null): void {
    const chart = this.chart;
    if (!chart || this.markers()) return;
    const data = this.data();
    const visible = data.series.filter((s) => !data.hidden.has(s.sensor.id));
    let next: { seriesIndex: number; dataIndex: number } | null = null;
    if (x !== null && y !== null && !this.shiftHeld) {
      const at = chart.convertFromPixel({ xAxisIndex: 0 }, x) as number;
      const toPixel = (p: [number, number]) => chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, p) as [number, number];
      const hit = Number.isFinite(at) ? nearestPoint(visible, at, [x, y], toPixel, 10) : null;
      if (hit) next = { seriesIndex: sensorSeriesIndex(data, hit.sensorIndex), dataIndex: hit.dataIndex };
    }
    const prev = this.hovered;
    if (prev?.seriesIndex === next?.seriesIndex && prev?.dataIndex === next?.dataIndex) return;
    if (prev) chart.dispatchAction({ type: 'downplay', seriesIndex: prev.seriesIndex });
    this.hovered = next;
    if (next) {
      const sensorIndex = next.seriesIndex - sensorSeriesIndex(data, 0);
      const s = visible[sensorIndex];
      const r = s.readings[next.dataIndex];
      chart.setOption(hoverPointOption({ t: r.timestamp, value: r.value, sensorIndex, color: seriesStyle(s.sensor.colorIndex).color }));
      chart.dispatchAction({ type: 'highlight', seriesIndex: next.seriesIndex });
      chart.dispatchAction({ type: 'showTip', seriesIndex: hoverSeriesIndex(data, visible.length), dataIndex: 0 });
    } else {
      chart.setOption(hoverPointOption(null));
      chart.dispatchAction({ type: 'hideTip' });
    }
  }

  protected exportImage(): void {
    if (!this.chart) return;
    const url = this.chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: this.chartTheme.tokens().surfaceContainer });
    downloadUrl(this.document, url, this.fileName('png'));
  }

  protected exportCsv(): void {
    downloadText(this.document, toCsv(this.data(), this.store.effectiveWindow()), this.fileName('csv'));
  }

  private fileName(ext: string): string {
    const w = this.store.effectiveWindow();
    const name = this.store.location()?.id ?? 'vnv';
    return `${name}_${formatDate(w.start).replace(/\//g, '-')}_${formatDate(w.end).replace(/\//g, '-')}.${ext}`;
  }
}
