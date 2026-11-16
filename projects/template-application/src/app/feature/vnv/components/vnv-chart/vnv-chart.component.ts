import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, DOCUMENT, effect, inject, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { seriesStyle } from '../../../../core/charts/chart-palette';
import { PlutoChartThemeService, withAlpha } from '../../../../core/charts/pluto-chart-theme';
import { formatDate } from '../../../../core/mock-data/dates';
import { ChartCardComponent } from '../../../../ui/components/chart-card/chart-card.component';
import { ChartNavigatorComponent, type NavigatorSeries, type NavigatorWindow } from '../../../../ui/components/chart-navigator/chart-navigator.component';
import { QualityFilterComponent } from '../../../../ui/components/quality-filter/quality-filter.component';
import { SelectionActionBarComponent } from '../../../../ui/components/selection-action-bar/selection-action-bar.component';
import { VnvFormComponent } from '../../../../ui/components/vnv-form/vnv-form.component';
import { VnvStore } from '../../vnv-store';
import { buildVnvChartOptions, selectInRect, selectionPoints, showMarkers, toCsv, windowOption, yRangeFor, type VnvChartData } from './vnv-chart-options';

interface ZoomEvent {
  start?: number;
  end?: number;
  batch?: { start?: number; end?: number }[];
}

interface BrushEndEvent {
  areas?: { coordRange?: [[number, number], [number, number]] }[];
}

/**
 * The VNV chart card (Figma graph-panel 1:11454): quality filter · Fit Y ·
 * Export, the time series, and the navigator with Reset.
 * Shift + drag selects readings; the VNV | ⋯ bar floats above the selection
 * and opens the VNV form popover (Figma 1:11678).
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
  template: `
    <app-chart-card class="card" [showNavigator]="true" [resetDisabled]="store.atFullRange()" (reset)="store.resetWindow()">
      <div chartToolbar class="toolbar">
        <app-quality-filter [value]="store.visibleQi()" (valueChange)="store.visibleQi.set($event)" />
        <div class="toolbar__end">
          <mat-slide-toggle class="fit-y" labelPosition="before" hideIcon [checked]="store.fitY()" (change)="store.fitY.set($event.checked)">
            Fit Y
          </mat-slide-toggle>
          <span class="app-divider-vertical"></span>
          <button mat-button type="button" class="export" [matMenuTriggerFor]="exportMenu">Export</button>
          <mat-menu #exportMenu="matMenu" xPosition="before">
            <button mat-menu-item type="button" (click)="exportImage()">Chart image (PNG)</button>
            <button mat-menu-item type="button" (click)="exportCsv()">Data (CSV)</button>
          </mat-menu>
        </div>
      </div>

      <div
        class="chart"
        echarts
        [options]="options()"
        [merge]="windowMerge()"
        [theme]="chartTheme.theme()"
        [loading]="store.loading() || store.applying()"
        [loadingOpts]="loadingOpts()"
        (chartInit)="chart = $event"
        (chartDataZoom)="onZoom($event)"
        (chartBrushEnd)="onBrushEnd($event)"
        (chartFinished)="positionBar()"
        (wheel)="onWheel($event)"
        (pointerenter)="setHovering(true)"
        (pointerleave)="setHovering(false)"
      ></div>

      @if (barPos(); as p) {
        <div class="bar" [style.left.px]="p.x" [style.top.px]="p.y" cdkOverlayOrigin #barOrigin="cdkOverlayOrigin">
          <app-selection-action-bar (vnv)="store.vnvPopoverOpen.set(true)" />
        </div>
        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="barOrigin"
          [cdkConnectedOverlayOpen]="store.vnvPopoverOpen()"
          [cdkConnectedOverlayPositions]="popoverPositions"
          [cdkConnectedOverlayHasBackdrop]="true"
          cdkConnectedOverlayBackdropClass="app-popover-backdrop"
          (backdropClick)="store.vnvPopoverOpen.set(false)"
          (overlayKeydown)="onPopoverKey($event)"
        >
          <app-vnv-form
            [count]="store.selectedReadings().length"
            [initial]="store.formInitial()"
            (apply)="store.applyReview($event)"
            (cancel)="store.clearSelection()"
            (close)="store.clearSelection()"
          />
        </ng-template>
      }

      <app-chart-navigator
        chartNavigator
        [series]="navigatorSeries()"
        [xMin]="store.xRange().start"
        [xMax]="store.xRange().end"
        [window]="store.window()"
        (windowChange)="onNavigator($event)"
        [labelFormatter]="formatDate"
      />
    </app-chart-card>
  `,
  styles: `
    :host {
      display: block;
      min-height: 0;
    }
    .card {
      height: 100%;
    }
    .toolbar,
    .toolbar__end {
      display: flex;
      align-items: center;
      gap: var(--spacing-160);
    }
    .toolbar {
      justify-content: space-between;
      width: 100%;
    }
    .toolbar__end {
      align-self: stretch;
    }
    .export {
      min-width: 97px; // Figma 1:11479
    }
    .chart {
      position: absolute;
      inset: 0;
    }
    .bar {
      position: absolute;
      z-index: 1;
    }
  `,
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

  /** Where the VNV | ⋯ bar floats: above the selection's top-left, inside the chart. */
  protected readonly barPos = signal<{ x: number; y: number } | null>(null);
  protected readonly popoverPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  ];

  private hovering = false;
  private shiftHeld = false;
  private brushOn = false;
  private pendingWindow: { start: number; end: number } | null = null;
  private frame: number | null = null;

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
    const view = this.document.defaultView;
    this.document.addEventListener('keydown', onKey);
    this.document.addEventListener('keyup', onKey);
    view?.addEventListener('blur', onBlur);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('keydown', onKey);
      this.document.removeEventListener('keyup', onKey);
      view?.removeEventListener('blur', onBlur);
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
    if (ids.length) this.store.setSelection(ids);
    else this.store.clearSelection();
  }

  /** Places the action bar above the top-left of the visible selected points; hides it when none are in view. */
  protected positionBar(): void {
    const chart = this.chart;
    const w = this.store.effectiveWindow();
    const inView = this.ringPoints().filter(([t]) => t >= w.start && t <= w.end);
    if (!chart || inView.length === 0) {
      if (this.barPos()) this.barPos.set(null);
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    for (const [t, v] of inView) {
      const [x, y] = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [t, v]) as number[];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    }
    const next = { x: Math.max(0, Math.round(minX - 12)), y: Math.max(0, Math.round(minY - 56)) };
    const prev = this.barPos();
    if (!prev || prev.x !== next.x || prev.y !== next.y) this.barPos.set(next);
  }

  protected onPopoverKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.store.vnvPopoverOpen.set(false);
  }

  /** Inside zoom (drag pan, Ctrl + wheel): percent of the loaded range. */
  protected onZoom(event: ZoomEvent): void {
    const e = event.batch?.[0] ?? event;
    if (e.start === undefined || e.end === undefined) return;
    const x = this.store.xRange();
    const span = x.end - x.start;
    // ECharts has already drawn the pan; coalesce the store update (y fit, navigator) to one per frame.
    this.pendingWindow = { start: x.start + (span * e.start) / 100, end: x.start + (span * e.end) / 100 };
    if (this.frame === null) {
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        if (this.pendingWindow) this.store.setWindow(this.pendingWindow);
        this.pendingWindow = null;
      });
    }
  }

  protected onNavigator(window: NavigatorWindow | null): void {
    if (window) this.store.setWindow(window);
    else this.store.resetWindow();
  }

  /** ⌘ + wheel zooms at the cursor (ECharts handles Ctrl itself). A plain wheel scrolls the page. */
  protected onWheel(event: WheelEvent): void {
    if (!event.metaKey || event.ctrlKey || !this.chart) return;
    event.preventDefault();
    const at = this.chart.convertFromPixel({ xAxisIndex: 0 }, [event.offsetX, event.offsetY]) as unknown as number[] | number;
    const center = Array.isArray(at) ? at[0] : at;
    const w = this.store.effectiveWindow();
    const factor = event.deltaY > 0 ? 1.2 : 1 / 1.2;
    this.store.setWindow({ start: center - (center - w.start) * factor, end: center + (w.end - center) * factor });
  }

  protected exportImage(): void {
    if (!this.chart) return;
    const url = this.chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: this.chartTheme.tokens().surfaceContainer });
    this.download(url, this.fileName('png'));
  }

  protected exportCsv(): void {
    const csv = toCsv(this.data(), this.store.effectiveWindow());
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    this.download(url, this.fileName('csv'));
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private fileName(ext: string): string {
    const w = this.store.effectiveWindow();
    const name = this.store.location()?.id ?? 'vnv';
    return `${name}_${formatDate(w.start).replace(/\//g, '-')}_${formatDate(w.end).replace(/\//g, '-')}.${ext}`;
  }

  private download(href: string, name: string): void {
    const a = this.document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
  }
}
