import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import type { BaselineMode, BaselineRecord, BaselineValues } from '../../../../core/baseline/baseline.models';
import { changedFields } from '../../baseline-form.model';
import { BaselineTableComponent, type BaselineTableRow } from '../baseline-table/baseline-table.component';

export interface BaselineConfirmDialogData {
  sensorId: string;
  mode: BaselineMode;
  current: BaselineRecord;
  values: BaselineValues;
}

/**
 * Shown on Submit: the current baseline above the one being saved, with
 * changed values in primary. Save closes with `true`; Cancel, Escape and the
 * backdrop close without saving.
 */
@Component({
  selector: 'app-baseline-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule, BaselineTableComponent],
  template: `
    <h2 mat-dialog-title>{{ data.sensorId }} baseline confirmation</h2>
    <mat-dialog-content>
      <p class="intro">{{ intro }}</p>
      <app-baseline-table [rows]="rows" [showLabels]="true" [ariaLabel]="'Baseline changes for ' + data.sensorId" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button type="button" cdkFocusInitial [mat-dialog-close]="true">Save</button>
    </mat-dialog-actions>
  `,
  styles: `
    .intro {
      margin: 0 0 var(--spacing-160);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaselineConfirmDialogComponent {
  protected readonly data = inject<BaselineConfirmDialogData>(MAT_DIALOG_DATA);

  protected readonly intro =
    this.data.mode === 'new'
      ? 'Review the new baseline before saving it. It replaces the current baseline from its start date.'
      : 'Review your changes to the current baseline before saving them.';

  protected readonly rows: BaselineTableRow[] = [
    { label: 'Current baseline', values: this.data.current },
    {
      label: this.data.mode === 'new' ? 'New baseline' : 'Edited baseline',
      values: this.data.values,
      changed: changedFields(this.data.values, this.data.current),
    },
  ];
}
