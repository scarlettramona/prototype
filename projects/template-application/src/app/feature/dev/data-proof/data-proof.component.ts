import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { QI_SYMBOL, seriesStyle } from '../../../core/charts/chart-palette';
import { PlutoChartThemeService } from '../../../core/charts/pluto-chart-theme';
import { IllMockService } from '../../../core/ill/ill-mock.service';
import { analysisState, type Scan } from '../../../core/ill/ill.models';
import { endOfDay, formatDateTime, parseUsDate } from '../../../core/mock-data/dates';
import { MOCK_DATA_CONFIG } from '../../../core/mock-data/mock-data.config';
import { VnvMockService } from '../../../core/vnv/vnv-mock.service';
import type { VnvLoadResult } from '../../../core/vnv/vnv.models';

/**
 * Dev-only proof that the data and chart theme work: a VNV time series and an
 * ILL depth profile from the generated data. Temporary; not designed.
 */
@Component({
  selector: 'app-data-proof',
  imports: [NgxEchartsDirective],
  template: `
    <section class="proof">
      <h2>VNV · {{ vnvSummary() }}</h2>
      <div echarts class="proof__chart" [options]="vnvOptions()" [theme]="chartTheme.theme()" [loading]="!vnv()"></div>

      <h2>ILL · {{ illSummary() }}</h2>
      <div echarts class="proof__chart" [options]="illOptions()" [theme]="chartTheme.theme()" [loading]="!ill()"></div>
    </section>
  `,
  styles: `
    .proof {
      padding: var(--spacing-240);
    }
    .proof__chart {
      height: 420px;
      padding: var(--spacing-160);
      background: var(--mat-sys-surface-container);
      border-radius: var(--mat-sys-corner-small);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataProofComponent {
  protected readonly chartTheme = inject(PlutoChartThemeService);
  private readonly vnvService = inject(VnvMockService);
  private readonly illService = inject(IllMockService);

  protected readonly vnv = signal<VnvLoadResult | null>(null);
  protected readonly ill = signal<Scan[] | null>(null);

  constructor() {
    const cfg = MOCK_DATA_CONFIG;
    const ids = ['AN102-WSTA-TI-054', 'AN102-WSTA-TI-060', 'AN102-WSTA-TI-074', 'AN102-WSTA-TI-045'];
    void this.vnvService
      .load({ sensorIds: ids, start: parseUsDate(cfg.vnv.rangeStart), end: endOfDay(parseUsDate(cfg.vnv.rangeEnd)) })
      .then((r) => this.vnv.set(r));
    void this.illService.getWellScans(cfg.ill.focusWell.id).then((s) => this.ill.set(s));
  }

  protected readonly vnvSummary = computed(() => {
    const r = this.vnv();
    if (!r) return 'loading…';
    const real = r.readings.filter((x) => x.real).length;
    return `${r.sensors.length} sensors, ${r.readings.length} readings (${real} real)`;
  });

  protected readonly illSummary = computed(() => {
    const s = this.ill();
    if (!s) return 'loading…';
    const states = s.map((x) => analysisState(x.analysis)).join(', ');
    return `${MOCK_DATA_CONFIG.ill.focusWell.id}: ${s.length} scans (${states})`;
  });

  protected readonly vnvOptions = computed<EChartsCoreOption>(() => {
    const r = this.vnv();
    if (!r) return {};
    return {
      grid: { left: 56, right: 24, top: 24, bottom: 72 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', scale: true, name: '°F' },
      dataZoom: [{ type: 'slider', start: 90, end: 100 }, { type: 'inside', zoomOnMouseWheel: 'ctrl', moveOnMouseWheel: false }],
      series: r.sensors.map((sensor) => {
        const style = seriesStyle(sensor.colorIndex);
        return {
          type: 'line',
          name: sensor.id,
          color: style.color,
          lineStyle: { type: style.dash, width: 1.5 },
          symbolSize: 6,
          data: r.readings
            .filter((x) => x.sensorId === sensor.id)
            .map((x) => ({ value: [x.timestamp, Number(x.value.toFixed(2))], symbol: QI_SYMBOL[x.qi] })),
        };
      }),
    };
  });

  protected readonly illOptions = computed<EChartsCoreOption>(() => {
    const scans = this.ill();
    if (!scans) return {};
    return {
      grid: { left: 64, right: 24, top: 24, bottom: 96 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value', min: 0, max: 600, inverse: true, name: 'From Bottom of Tank (inches)', nameLocation: 'middle', nameGap: 28 },
      yAxis: { type: 'value', name: 'Corrected Counts', nameLocation: 'middle', nameGap: 48 },
      dataZoom: [{ type: 'slider', bottom: 16 }, { type: 'inside', zoomOnMouseWheel: 'ctrl', moveOnMouseWheel: false }],
      series: scans.map((scan) => {
        const style = seriesStyle(scan.colorIndex);
        return {
          type: 'line',
          name: formatDateTime(scan.datetime),
          color: style.color,
          lineStyle: { type: style.dash, width: 1 },
          showSymbol: false,
          data: scan.points.map((p) => [p.depthIn, p.counts]),
        };
      }),
    };
  });
}
