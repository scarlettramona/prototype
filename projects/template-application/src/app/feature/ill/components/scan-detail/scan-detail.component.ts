import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { seriesStyle } from '../../../../core/charts/chart-palette';
import { PlutoChartThemeService } from '../../../../core/charts/pluto-chart-theme';
import type { ParameterPreset, Scan, ScanQi } from '../../../../core/ill/ill.models';
import { formatDate, formatDateTime } from '../../../../core/mock-data/dates';
import { DetailRowComponent } from '../../../../ui/components/detail-row/detail-row.component';
import { SeriesSwatchComponent } from '../../../../ui/components/series-swatch/series-swatch.component';
import { buildDepthChartOptions, type DepthChartData } from '../../focus-page/depth-chart-options';
import { depthYRange } from '../../focus-page/focus-model';
import type { ScanReview } from '../../ill-library-store';

let nextId = 0;

/**
 * A library row, expanded (Figma 1:2094 / 1:3814): the scan's depth profile
 * with its Calculated ILL, the analysis summary, Quality indicator, comments,
 * Adjust in focus view and Save analysis.
 */
@Component({
  selector: 'app-scan-detail',
  imports: [MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, NgxEchartsDirective, DetailRowComponent, SeriesSwatchComponent],
  templateUrl: './scan-detail.component.html',
  styleUrl: './scan-detail.component.scss',
  host: { class: 'app-filled-fields' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanDetailComponent {
  protected readonly fieldId = `scan-detail-${nextId++}`;
  protected readonly chartTheme = inject(PlutoChartThemeService);

  readonly scan = input.required<Scan>();
  /** The well's reference scan, drawn beside this one; `null` when this scan is the reference. */
  readonly reference = input<Scan | null>(null);
  /** The parameter preset the analysis used (Default when there's none): its saved on / by always show. */
  readonly preset = input<ParameterPreset | null>(null);
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

  private readonly scans = computed(() => {
    const ref = this.reference();
    return ref ? [this.scan(), ref] : [this.scan()];
  });

  /** The focus view's depth chart for this scan and its well's reference, without zoom (shared builder). */
  protected readonly options = computed<EChartsCoreOption>(() => {
    const scan = this.scan();
    const data: DepthChartData = {
      scans: this.scans(),
      focusedId: scan.id,
      lines: { saved: true, unsaved: true },
      referenceId: this.reference()?.id ?? (scan.reference ? scan.id : null),
    };
    return buildDepthChartOptions(data, null, depthYRange(data.scans, null, false), this.chartTheme.tokens().surfaceContainerLowest, { zoom: false });
  });

  protected colorOf(scan: Scan): string {
    return seriesStyle(scan.colorIndex).color;
  }

  protected timeOf(scan: Scan): string {
    return formatDateTime(scan.datetime);
  }

  protected submit(): void {
    this.save.emit({ qi: this.qi(), scanComment: this.scanComment().trim(), vnvComment: this.vnvComment().trim() });
  }
}
