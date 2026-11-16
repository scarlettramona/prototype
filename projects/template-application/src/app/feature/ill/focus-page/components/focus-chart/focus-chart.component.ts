import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { seriesStyle } from '../../../../../core/charts/chart-palette';
import { PlutoChartThemeService, withAlpha } from '../../../../../core/charts/pluto-chart-theme';
import { formatDateTime } from '../../../../../core/mock-data/dates';
import { ChartCardComponent } from '../../../../../ui/components/chart-card/chart-card.component';
import { ChartNavigatorComponent, type NavigatorSeries, type NavigatorWindow } from '../../../../../ui/components/chart-navigator/chart-navigator.component';
import { buildDepthChartOptions, depthWindowOption } from '../../depth-chart-options';
import { DEPTH_MAX, DEPTH_MIN, depthYRange } from '../../focus-model';
import { IllFocusStore } from '../../ill-focus-store';
import { ScansLegendComponent } from '../scans-legend/scans-legend.component';

interface ZoomEvent {
  start?: number;
  end?: number;
  batch?: { start?: number; end?: number }[];
}

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
    CdkOverlayOrigin,
    MatButtonModule,
    MatSlideToggleModule,
    NgxEchartsDirective,
    ChartCardComponent,
    ChartNavigatorComponent,
    ScansLegendComponent,
  ],
  template: `
    <app-chart-card class="card" [showNavigator]="true" [resetDisabled]="store.atFullRange()" (reset)="store.setWindow(null)">
      <div chartToolbar class="toolbar">
        <h2 class="title">
          @if (store.focused(); as scan) {
            <span class="dot" [style.background]="color(scan.colorIndex)"></span>
            {{ label(scan.datetime) }}
            @if (scan.reference) {
              <span class="app-tag">Reference</span>
            }
          } @else {
            All scans
          }
        </h2>
        <div class="actions">
          <button mat-button type="button" cdkOverlayOrigin #legendOrigin="cdkOverlayOrigin" (click)="store.legendOpen.set(true)">Open legend</button>
          <mat-slide-toggle class="fit-y" labelPosition="before" hideIcon [checked]="store.fitY()" (change)="store.fitY.set($event.checked)">
            Fit Y
          </mat-slide-toggle>
          <span class="app-divider-vertical"></span>
          <button mat-button type="button" (click)="exportImage()">Export graph</button>
        </div>
      </div>

      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="legendOrigin"
        [cdkConnectedOverlayOpen]="store.legendOpen()"
        [cdkConnectedOverlayPositions]="positions"
        [cdkConnectedOverlayHasBackdrop]="true"
        cdkConnectedOverlayBackdropClass="app-popover-backdrop"
        (backdropClick)="store.legendOpen.set(false)"
        (overlayKeydown)="onKey($event)"
      >
        <app-scans-legend class="app-popover legend" cdkTrapFocus cdkTrapFocusAutoCapture />
      </ng-template>

      <div
        class="chart"
        echarts
        [options]="options()"
        [merge]="windowMerge()"
        [theme]="chartTheme.theme()"
        [loading]="store.loading() || store.busy()"
        [loadingOpts]="loadingOpts()"
        (chartInit)="chart = $event"
        (chartDataZoom)="onZoom($event)"
        (wheel)="onWheel($event)"
      ></div>

      <app-chart-navigator
        chartNavigator
        [series]="navigatorSeries()"
        [xMin]="min"
        [xMax]="max"
        [inverse]="true"
        [window]="store.window()"
        (windowChange)="store.setWindow($event)"
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
      padding: var(--spacing-240);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .toolbar,
    .actions,
    .title {
      display: flex;
      align-items: center;
    }
    .toolbar {
      justify-content: space-between;
      width: 100%;
    }
    .actions {
      gap: var(--spacing-160);
      align-self: stretch;
    }
    .title {
      gap: var(--spacing-80);
      margin: 0;
      font: var(--mat-sys-headline-small);
      color: var(--mat-sys-on-surface);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .chart {
      position: absolute;
      inset: 0;
    }
    .legend {
      gap: 0;
      padding: var(--spacing-80) 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusChartComponent {
  protected readonly store = inject(IllFocusStore);
  protected readonly chartTheme = inject(PlutoChartThemeService);
  private readonly document = inject(DOCUMENT);
  protected chart: ECharts | null = null;
  protected readonly min = DEPTH_MIN;
  protected readonly max = DEPTH_MAX;

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
    return untracked(() => buildDepthChartOptions(data, this.store.window(), this.yRange(), tag));
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

  private pending: NavigatorWindow | null = null;
  private frame: number | null = null;

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
    const e = event.batch?.[0] ?? event;
    if (e.start === undefined || e.end === undefined) return;
    const span = DEPTH_MAX - DEPTH_MIN;
    this.pending = { start: DEPTH_MIN + (span * e.start) / 100, end: DEPTH_MIN + (span * e.end) / 100 };
    if (this.frame === null) {
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        if (this.pending) this.store.setWindow(this.pending);
        this.pending = null;
      });
    }
  }

  /** ⌘ + wheel zooms at the cursor (ECharts handles Ctrl itself). A plain wheel scrolls the page. */
  protected onWheel(event: WheelEvent): void {
    if (!event.metaKey || event.ctrlKey || !this.chart) return;
    event.preventDefault();
    const at = this.chart.convertFromPixel({ xAxisIndex: 0 }, [event.offsetX, event.offsetY]) as unknown as number[] | number;
    const center = Array.isArray(at) ? at[0] : at;
    const w = this.store.window() ?? { start: DEPTH_MIN, end: DEPTH_MAX };
    const factor = event.deltaY > 0 ? 1.2 : 1 / 1.2;
    this.store.setWindow({ start: center - (center - w.start) * factor, end: center + (w.end - center) * factor });
  }

  protected exportImage(): void {
    if (!this.chart) return;
    const url = this.chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: this.chartTheme.tokens().surfaceContainer });
    const a = this.document.createElement('a');
    a.href = url;
    const scan = this.store.focused();
    a.download = `${(this.store.wellId() ?? 'ill').replace(/\s+/g, '')}_${scan ? scan.datetime : 'all-scans'}.png`;
    a.click();
  }
}
