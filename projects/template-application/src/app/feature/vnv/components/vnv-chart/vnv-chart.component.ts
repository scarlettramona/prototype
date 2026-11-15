import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, untracked } from '@angular/core';
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
import { VnvStore } from '../../vnv-store';
import { buildVnvChartOptions, showMarkers, toCsv, windowOption, yRangeFor, type VnvChartData } from './vnv-chart-options';

interface ZoomEvent {
  start?: number;
  end?: number;
  batch?: { start?: number; end?: number }[];
}

/**
 * The VNV chart card (Figma graph-panel 1:11454): quality filter · Fit Y ·
 * Export, the time series, and the navigator with Reset.
 */
@Component({
  selector: 'app-vnv-chart',
  imports: [
    MatButtonModule,
    MatMenuModule,
    MatSlideToggleModule,
    NgxEchartsDirective,
    ChartCardComponent,
    ChartNavigatorComponent,
    QualityFilterComponent,
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
          <button mat-button type="button" [matMenuTriggerFor]="exportMenu">Export</button>
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
        [loading]="store.loading()"
        [loadingOpts]="loadingOpts()"
        (chartInit)="chart = $event"
        (chartDataZoom)="onZoom($event)"
        (wheel)="onWheel($event)"
      ></div>

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
    @use '@angular/material' as mat;

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
    .fit-y {
      @include mat.slide-toggle-overrides(
        (
          label-text-font: var(--mat-sys-label-large-font),
          label-text-size: var(--mat-sys-label-large-size),
          label-text-weight: var(--mat-sys-label-large-weight),
        )
      );
    }
    .chart {
      position: absolute;
      inset: 0;
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
  private readonly markers = computed(() => showMarkers(this.store.effectiveWindow()));

  /**
   * Rebuilt only when the data or the marker flag changes; window moves arrive
   * via `windowMerge`. (A full rebuild is ~10× cheaper than merging
   * `showSymbol` into 40 series.)
   */
  protected readonly options = computed<EChartsCoreOption>(() => {
    const data = this.data();
    this.markers();
    return untracked(() => buildVnvChartOptions(data, this.store.effectiveWindow(), this.yRange()));
  });

  protected readonly windowMerge = computed(() => windowOption(this.store.effectiveWindow(), this.yRange()));

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

  private pendingWindow: { start: number; end: number } | null = null;
  private frame: number | null = null;

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
