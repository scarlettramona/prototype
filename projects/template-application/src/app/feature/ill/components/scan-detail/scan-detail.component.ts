import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { seriesStyle } from '../../../../core/charts/chart-palette';
import { PlutoChartThemeService } from '../../../../core/charts/pluto-chart-theme';
import type { Scan, ScanQi } from '../../../../core/ill/ill.models';
import { formatDate, formatDateTime } from '../../../../core/mock-data/dates';
import { DetailRowComponent } from '../../../../ui/components/detail-row/detail-row.component';
import { LabelAboveDirective } from '../../../../ui/components/label-above/label-above.directive';
import type { ScanReview } from '../../ill-library-store';

/**
 * A library row, expanded (Figma 1:2094 / 1:3814): the scan's depth profile
 * with its Calculated ILL, the analysis summary, Quality indicator, comments,
 * Adjust in focus view and Save analysis.
 */
@Component({
  selector: 'app-scan-detail',
  imports: [MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, NgxEchartsDirective, DetailRowComponent, LabelAboveDirective],
  templateUrl: './scan-detail.component.html',
  styleUrl: './scan-detail.component.scss',
  host: { class: 'app-filled-fields' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanDetailComponent {
  protected readonly chartTheme = inject(PlutoChartThemeService);

  readonly scan = input.required<Scan>();
  readonly busy = input(false);
  readonly save = output<ScanReview>();
  readonly adjust = output<void>();
  readonly export = output<void>();

  protected readonly qi = signal<ScanQi>(null);
  protected readonly scanComment = signal('');
  protected readonly vnvComment = signal('');

  constructor() {
    effect(() => {
      const s = this.scan();
      untracked(() => {
        this.qi.set(s.qi);
        this.scanComment.set(s.scanComment ?? '');
        this.vnvComment.set(s.vnvComment ?? '');
      });
    });
  }

  /** The analysis shown: unsaved results if there are any, else saved. */
  protected readonly shown = computed(() => {
    const a = this.scan().analysis;
    return a.unsaved ?? a.saved ?? null;
  });
  protected readonly analysisLabel = computed(() => {
    const a = this.scan().analysis;
    return a.unsaved ? 'Unsaved' : a.saved ? 'Saved' : '—';
  });
  protected readonly saved = computed(() => this.scan().analysis.saved ?? null);

  protected readonly edited = computed(() => {
    const s = this.scan();
    return this.qi() !== s.qi || this.scanComment() !== (s.scanComment ?? '') || this.vnvComment() !== (s.vnvComment ?? '');
  });
  protected readonly canSave = computed(() => !this.busy() && (this.edited() || !!this.scan().analysis.unsaved));

  protected readonly dateTime = computed(() => formatDateTime(this.scan().datetime));
  protected readonly date = formatDate;
  protected readonly color = computed(() => seriesStyle(this.scan().colorIndex).color);

  protected readonly options = computed<EChartsCoreOption>(() => {
    const scan = this.scan();
    const t = this.chartTheme.tokens();
    const a = scan.analysis;
    const lines: object[] = [];
    if (a.saved) {
      lines.push({ xAxis: a.saved.results.calculatedIll, lineStyle: { color: t.onSurfaceVariant, type: 'dashed', width: 1.5 } });
    }
    if (a.unsaved) lines.push({ xAxis: a.unsaved.results.calculatedIll, lineStyle: { color: t.primary, type: 'solid', width: 1.5 } });
    return {
      animation: false,
      grid: { left: 52, right: 12, top: 12, bottom: 44 },
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => v.toFixed(1) },
      xAxis: { type: 'value', min: 0, max: 600, inverse: true, name: 'From Bottom of Tank (inches)', nameLocation: 'middle', nameGap: 26 },
      yAxis: { type: 'value', name: 'Corrected Counts', nameLocation: 'middle', nameGap: 40, splitLine: { show: true } },
      series: [
        {
          type: 'line',
          name: formatDateTime(scan.datetime),
          showSymbol: false,
          color: this.color(),
          lineStyle: { width: 1.5 },
          data: scan.points.map((p) => [p.depthIn, p.counts]),
          markLine: { silent: true, symbol: 'none', label: { show: false }, data: lines },
        },
      ],
    };
  });

  protected submit(): void {
    this.save.emit({ qi: this.qi(), scanComment: this.scanComment().trim(), vnvComment: this.vnvComment().trim() });
  }
}
