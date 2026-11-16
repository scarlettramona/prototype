import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { lowerLimit, upperLimit, type BaselineRecord } from '../../../../core/baseline/baseline.models';
import { downloadText } from '../../../../core/download/download';
import { formatDate } from '../../../../core/mock-data/dates';
import { formatTemp } from '../../baseline-form.model';
import { BaselineTableComponent, type BaselineTableRow } from '../baseline-table/baseline-table.component';

export interface BaselineHistoryDialogData {
  sensorId: string;
  /** Newest (current) first. */
  history: readonly BaselineRecord[];
}

/** View report: every baseline the sensor has had, newest first, with Export CSV. */
@Component({
  selector: 'app-baseline-history-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, BaselineTableComponent],
  template: `
    <h2 mat-dialog-title>{{ data.sensorId }} baseline history</h2>
    <mat-dialog-content>
      <app-baseline-table [rows]="rows" [showSavedBy]="true" [ariaLabel]="data.sensorId + ' baseline history'" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Close</button>
      <button mat-flat-button type="button" (click)="exportCsv()"><mat-icon>download</mat-icon>Export CSV</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaselineHistoryDialogComponent {
  protected readonly data = inject<BaselineHistoryDialogData>(MAT_DIALOG_DATA);
  private readonly document = inject(DOCUMENT);

  protected readonly rows: BaselineTableRow[] = this.data.history.map((r, i) => ({
    values: r,
    savedBy: r.savedBy,
    tag: i === 0 ? 'Current' : undefined,
  }));

  protected exportCsv(): void {
    downloadText(this.document, baselineHistoryCsv(this.data.history), `${this.data.sensorId}_baseline-history.csv`);
  }
}

/** The history as CSV, newest first. */
export function baselineHistoryCsv(history: readonly BaselineRecord[]): string {
  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const head = 'Start date,Baseline (°F),Slope rate (°F/yr),Lower offset (°F),Lower limit (°F),Upper offset (°F),Upper limit (°F),Comment,Saved by,Saved on';
  const rows = history.map((r) =>
    [
      formatDate(r.startDate),
      formatTemp(r.value),
      formatTemp(r.slopeRatePerYear),
      formatTemp(r.lowerLimitOffset),
      formatTemp(lowerLimit(r)),
      formatTemp(r.upperLimitOffset),
      formatTemp(upperLimit(r)),
      quote(r.comment),
      quote(r.savedBy),
      formatDate(r.savedAt),
    ].join(','),
  );
  return [head, ...rows].join('\n') + '\n';
}
