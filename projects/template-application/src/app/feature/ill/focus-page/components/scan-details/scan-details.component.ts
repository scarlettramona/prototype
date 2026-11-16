import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { seriesStyle } from '../../../../../core/charts/chart-palette';
import type { ScanQi } from '../../../../../core/ill/ill.models';
import { formatDate, formatDateTime } from '../../../../../core/mock-data/dates';
import { DetailRowComponent } from '../../../../../ui/components/detail-row/detail-row.component';
import { LabelAboveDirective } from '../../../../../ui/components/label-above/label-above.directive';
import { resultRows } from '../../focus-model';
import { IllFocusStore } from '../../ill-focus-store';

/**
 * Scan details (Figma floating-parameters 1:9721): the scan's dot and date,
 * the results (saved, then unsaved in primary), Quality indicator, comments,
 * Saved on / by, and Export smooth data · Save analysis. Discard appears
 * while there are unsaved results.
 */
@Component({
  selector: 'app-scan-details',
  imports: [MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, DetailRowComponent, LabelAboveDirective],
  template: `
    @if (store.focused(); as scan) {
      <div class="top">
        <h2 class="title">Scan details</h2>
        <span class="scan"><span class="dot" [style.background]="color()"></span>{{ dateTime() }}</span>
      </div>
      <div class="divider"></div>
      <div class="results">
        @for (row of rows(); track row.label) {
          <app-detail-row [label]="row.label" [value]="row.value" [compareValue]="row.compare" [unit]="row.unit" [tone]="row.tone === 'unsaved' ? 'primary' : 'default'" />
        }
      </div>
      <div class="divider"></div>

      @if (store.review(); as review) {
        <div class="field">
          <span class="label" id="focus-qi">Quality indicator</span>
          <mat-button-toggle-group class="toggles" hideSingleSelectionIndicator aria-labelledby="focus-qi" [value]="review.qi" (change)="setQi($event.value)">
            <mat-button-toggle value="Good">Good</mat-button-toggle>
            <mat-button-toggle value="Suspect">Suspect</mat-button-toggle>
          </mat-button-toggle-group>
        </div>
        <mat-form-field appLabelAbove appearance="outline" subscriptSizing="dynamic" class="input">
          <mat-label>Scan comment</mat-label>
          <input matInput placeholder="Placeholder" [value]="review.scanComment" (input)="store.setReview({ scanComment: $any($event.target).value })" />
        </mat-form-field>
        <mat-form-field appLabelAbove appearance="outline" subscriptSizing="dynamic" class="input">
          <mat-label>VNV comment</mat-label>
          <input matInput placeholder="Placeholder" [value]="review.vnvComment" (input)="store.setReview({ vnvComment: $any($event.target).value })" />
        </mat-form-field>
      }

      <div class="saved">
        <app-detail-row label="Saved on" [value]="savedOn()" />
        <app-detail-row label="Saved by" [value]="savedBy()" />
      </div>

      <div class="actions">
        <button mat-button type="button" (click)="exportScan.emit()">Export smooth data</button>
        @if (store.hasUnsaved()) {
          <button mat-button type="button" [disabled]="store.busy()" (click)="store.discard()">Discard</button>
        }
        @if (store.primaryAction() === 'save') {
          <button mat-flat-button type="button" [disabled]="!store.canSave()" (click)="store.save()">Save analysis</button>
        } @else {
          <button mat-stroked-button type="button" [disabled]="!store.canSave()" (click)="store.save()">Save analysis</button>
        }
      </div>
    }
  `,
  styles: `
    @use '@angular/material' as mat;

    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-240);
      padding: var(--spacing-240);
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-small);
      box-sizing: border-box;
      --detail-value-width: 72px;
    }
    .top {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-80);
    }
    .title {
      margin: 0;
      font: var(--mat-sys-title-large);
      color: var(--mat-sys-on-surface);
    }
    .scan {
      display: flex;
      align-items: center;
      gap: var(--spacing-40);
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .divider {
      height: 1px;
      background: var(--mat-sys-outline-variant);
    }
    .results,
    .saved {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-80);
    }
    .saved {
      --detail-value-width: max-content;
      --detail-unit-width: 0;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-120);
    }
    .label {
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface);
    }
    .toggles {
      align-self: flex-start;
    }
    .input {
      width: 100%;
      @include mat.form-field-density(-3);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-80);
      margin-top: auto;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanDetailsComponent {
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
