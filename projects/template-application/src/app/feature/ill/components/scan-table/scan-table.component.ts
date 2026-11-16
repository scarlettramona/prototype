import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ScanSummary } from '../../../../core/ill/ill.models';
import { formatDateTime } from '../../../../core/mock-data/dates';
import { IllLibraryStore, type ScanReview } from '../../ill-library-store';
import { qiLetter, RESULT_COLUMNS, valueCell } from '../../library-model';
import { ScanDetailComponent } from '../scan-detail/scan-detail.component';

/**
 * The Scan library results (Figma 1:2094, grouped 1:2334, two-line values
 * 1:2883): search, Group by Well, Perform / Save analysis, and the table with
 * expandable rows.
 */
@Component({
  selector: 'app-scan-table',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    ScanDetailComponent,
  ],
  templateUrl: './scan-table.component.html',
  styleUrl: './scan-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanTableComponent {
  protected readonly store = inject(IllLibraryStore);

  /** Open a well (all its scans) in the focus view. */
  readonly openWell = output<string>();
  /** Open a scan's tab in the focus view. */
  readonly openScan = output<ScanSummary>();
  readonly exportScan = output<string>();

  protected readonly columns = RESULT_COLUMNS;
  protected readonly cell = valueCell;
  protected readonly qi = qiLetter;
  protected readonly date = formatDateTime;
  protected readonly collapsedWells = signal<ReadonlySet<string>>(new Set());

  protected toggleWell(wellId: string): void {
    const next = new Set(this.collapsedWells());
    if (next.has(wellId)) next.delete(wellId);
    else next.add(wellId);
    this.collapsedWells.set(next);
  }

  protected ids(scans: readonly ScanSummary[]): string[] {
    return scans.map((s) => s.id);
  }

  protected saveRow(id: string, review: ScanReview): void {
    void this.store.saveRow(id, review);
  }
}
