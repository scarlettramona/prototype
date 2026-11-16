import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { seriesStyle } from '../../../../../core/charts/chart-palette';
import type { ScanQi } from '../../../../../core/ill/ill.models';
import { formatDate, formatDateTime } from '../../../../../core/mock-data/dates';
import { DetailRowComponent } from '../../../../../ui/components/detail-row/detail-row.component';
import { resultRows } from '../../focus-model';
import { IllFocusStore } from '../../ill-focus-store';

let nextId = 0;

/**
 * Scan details (Figma floating-parameters 1:9721): the scan's dot and date,
 * the results (saved, then unsaved in primary), Quality indicator, comments,
 * Saved on / by, and Export smooth data · Save analysis. Discard appears
 * while there are unsaved results.
 */
@Component({
  selector: 'app-scan-details',
  imports: [MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, DetailRowComponent],
  templateUrl: './scan-details.component.html',
  styleUrl: './scan-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanDetailsComponent {
  protected readonly fieldId = `scan-details-${nextId++}`;
  protected readonly store = inject(IllFocusStore);
  readonly exportScan = output<void>();

  protected readonly rows = computed(() => {
    const s = this.store.focused();
    return s ? resultRows(s.analysis) : [];
  });
  protected readonly color = computed(() => seriesStyle(this.store.focused()?.colorIndex ?? 0).color);
  protected readonly dateTime = computed(() => {
    const s = this.store.focused();
    return s ? formatDateTime(s.datetime) : '';
  });
  /** Only a saved analysis has a saved on / by. */
  protected readonly savedOn = computed(() => {
    const saved = this.store.focused()?.analysis.saved;
    return saved ? formatDate(saved.savedAt) : '';
  });
  protected readonly savedBy = computed(() => this.store.focused()?.analysis.saved?.savedBy ?? '');

  protected setQi(qi: ScanQi): void {
    this.store.setReview({ qi });
  }
}
