import { CdkDrag, CdkDragHandle, type Point } from '@angular/cdk/drag-drop';
import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, DOCUMENT, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { seriesStyle } from '../../../../../core/charts/chart-palette';
import { oncePerFrame, onWheelZoom, zoomEventWindow, type ChartWindow, type ZoomEvent } from '../../../../../core/charts/chart-zoom';
import { PlutoChartThemeService, withAlpha } from '../../../../../core/charts/pluto-chart-theme';
import { downloadUrl } from '../../../../../core/download/download';
import { formatDateTime } from '../../../../../core/mock-data/dates';
import { ChartCardComponent } from '../../../../../ui/components/chart-card/chart-card.component';
import { ChartNavigatorComponent, type NavigatorSeries, type NavigatorWindow } from '../../../../../ui/components/chart-navigator/chart-navigator.component';
import { buildDepthChartOptions, depthWindowOption } from '../../depth-chart-options';
import { countsAt, DEPTH_MAX, DEPTH_MIN, depthYRange } from '../../focus-model';
import { IllFocusStore } from '../../ill-focus-store';
import { ScansLegendComponent } from '../scans-legend/scans-legend.component';
import { hitScan } from './scan-hover';

/** The scan card shown while the pointer is on one scan's line. */
interface HoverCard {
  scanId: string;
  depth: number;
  counts: number | null;
  /** Pointer position in the chart, px. */
  x: number;
  y: number;
  /** Open to the left / below the pointer when there isn't room right / above. */
  flipX: boolean;
  flipY: boolean;
}

/** How long the card stays after the pointer leaves the line, so it can be reached. */
const HOVER_GRACE_MS = 400;

/**
 * The focus-view chart card (Figma graph-panel 1:9631): title (scan dot +
 * date, or All scans), Open legend · Fit Y | Export graph, the depth chart,
 * and the navigator with Reset. The zoom window lives in the store, so it's
 * shared by every tab.
 */
@Component({
  selector: 'app-focus-chart',
  imports: [
    A11yModule,
    CdkConnectedOverlay,
    CdkDrag,
    CdkDragHandle,
    CdkOverlayOrigin,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    NgxEchartsDirective,
    ChartCardComponent,
    ChartNavigatorComponent,
    ScansLegendComponent,
  ],
  templateUrl: './focus-chart.component.html',
  styleUrl: './focus-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusChartComponent {
  protected readonly store = inject(IllFocusStore);
  protected readonly chartTheme = inject(PlutoChartThemeService);
  private readonly document = inject(DOCUMENT);
  protected chart: ECharts | null = null;
  protected readonly min = DEPTH_MIN;
  protected readonly max = DEPTH_MAX;

  /** Where the legend was dragged to; it reopens there until the focus view closes. */
  protected readonly legendPosition = signal<Point>({ x: 0, y: 0 });

  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
  ];

  private readonly data = computed(() => ({
    scans: this.store.visibleScans(),
    focusedId: this.store.focused()?.id ?? null,
    lines: this.store.lines(),
    referenceId: this.store.referenceId(),
  }));

  private readonly yRange = computed(() => depthYRange(this.store.visibleScans(), this.store.window(), this.store.fitY()));

  /** Rebuilt only when the scans, focus or lines change; window moves arrive via `windowMerge`. */
  protected readonly options = computed<EChartsCoreOption>(() => {
    const data = this.data();
    const tag = this.chartTheme.tokens().surfaceContainerLowest;
    return untracked(() => buildDepthChartOptions(data, this.store.window(), this.yRange(), tag, { readout: false }));
  });

  protected readonly windowMerge = computed(() => depthWindowOption(this.store.window(), this.yRange()));

  protected readonly navigatorSeries = computed<NavigatorSeries[]>(() =>
    this.store.visibleScans().map((s) => {
      const style = seriesStyle(s.colorIndex);
      return { id: s.id, color: style.color, dash: 'solid', points: s.points.map((p) => [p.depthIn, p.counts] as const) };
    }),
  );

  protected readonly loadingOpts = computed(() => {
    const t = this.chartTheme.tokens();
    return { text: '', color: t.primary, maskColor: withAlpha(t.surfaceContainer, 0.7), lineWidth: 3 };
  });

  /** Hovered scan: one scan's card instead of a readout of every scan. */
  protected readonly hover = signal<HoverCard | null>(null);
  protected readonly hoverScan = computed(() => {
    const h = this.hover();
    return h ? (this.store.scanById().get(h.scanId) ?? null) : null;
  });
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private overCard = false;

  private unbindWheelZoom: (() => void) | null = null;
  private readonly setWindowPerFrame = oncePerFrame((window: ChartWindow) => this.store.setWindow(window));

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.unbindWheelZoom?.();
      this.clearHideTimer();
    });
  }

  protected color(index: number): string {
    return seriesStyle(index).color;
  }

  protected label(ts: number): string {
    return formatDateTime(ts);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.store.legendOpen.set(false);
  }

  /** Inside zoom (drag pan, Ctrl + wheel): percent of the depth range. */
  protected onZoom(event: ZoomEvent): void {
    const window = zoomEventWindow(event, DEPTH_MIN, DEPTH_MAX);
    if (window) this.setWindowPerFrame(window);
  }

  /** Keeps the chart and wires ⌘ + wheel zoom. Runs again when the theme changes and the chart is rebuilt. */
  protected onChartInit(chart: ECharts): void {
    this.chart = chart;
    this.unbindWheelZoom?.();
    const zr = chart.getZr();
    zr.on('mousemove', (e: { offsetX: number; offsetY: number; event?: MouseEvent }) => this.onPointerMove(e.offsetX, e.offsetY, e.event?.buttons ?? 0));
    zr.on('globalout', () => this.scheduleHide());
    this.unbindWheelZoom = onWheelZoom(chart, () => this.store.window() ?? { start: DEPTH_MIN, end: DEPTH_MAX }, (window) => this.store.setWindow(window));
  }

  // ── Scan hover card ──

  private onPointerMove(x: number, y: number, buttons: number): void {
    const chart = this.chart;
    if (!chart || this.overCard) return;
    // Dragging pans the chart; no card while it moves.
    if (buttons) return this.hideHover();
    if (!chart.containPixel({ gridIndex: 0 }, [x, y])) return this.scheduleHide();
    const depth = (chart.convertFromPixel({ gridIndex: 0 }, [x, y]) as number[])[0];
    const span = Math.abs((chart.convertFromPixel({ gridIndex: 0 }, [x + 10, y]) as number[])[0] - depth) + 0.5;
    const toPixel = (p: readonly [number, number]) => chart.convertToPixel({ gridIndex: 0 }, [p[0], p[1]]) as unknown as [number, number];
    const scans = this.store.visibleScans();
    const hit = hitScan(scans, [x, y], depth, span, toPixel, 8, this.store.focused()?.id ?? null);
    if (!hit) return this.scheduleHide();
    this.clearHideTimer();
    const scan = scans.find((s) => s.id === hit.id);
    if (!scan) return;
    this.hover.set({ scanId: scan.id, depth, counts: countsAt(scan.points, depth), x, y, flipX: x > chart.getWidth() - 320, flipY: y < 150 });
  }

  protected enterCard(): void {
    this.overCard = true;
    this.clearHideTimer();
  }

  protected leaveCard(): void {
    this.overCard = false;
    this.scheduleHide();
  }

  protected focusScan(id: string): void {
    this.hideHover();
    this.store.open(id);
  }

  protected async setReference(id: string): Promise<void> {
    this.hideHover();
    await this.store.setReference(id);
  }

  /** Starts the grace period once; moving over empty chart doesn't restart it. */
  private scheduleHide(): void {
    if (!this.hover() || this.hideTimer) return;
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      if (!this.overCard) this.hover.set(null);
    }, HOVER_GRACE_MS);
  }

  private hideHover(): void {
    this.clearHideTimer();
    this.overCard = false;
    this.hover.set(null);
  }

  private clearHideTimer(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  protected exportImage(): void {
    if (!this.chart) return;
    const url = this.chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: this.chartTheme.tokens().surfaceContainer });
    const scan = this.store.focused();
    downloadUrl(this.document, url, `${(this.store.wellId() ?? 'ill').replace(/\s+/g, '')}_${scan ? scan.datetime : 'all-scans'}.png`);
  }
}
