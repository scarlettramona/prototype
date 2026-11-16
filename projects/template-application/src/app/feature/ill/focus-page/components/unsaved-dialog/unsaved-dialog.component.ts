import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

export type UnsavedChoice = 'cancel' | 'discard' | 'save';

/**
 * Asked before leaving the focus view or closing a tab with unsaved work.
 * No frame in Figma; wording agreed with Scarlett (2026-11-15).
 * Closing with Escape or the backdrop counts as Cancel.
 */
@Component({
  selector: 'app-unsaved-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Unsaved analysis</h2>
    <mat-dialog-content>You have unsaved analysis results. Save them before you leave?</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="'cancel'">Cancel</button>
      <button mat-button type="button" [mat-dialog-close]="'discard'">Discard</button>
      <button mat-flat-button type="button" cdkFocusInitial [mat-dialog-close]="'save'">Save analysis</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnsavedDialogComponent {}
