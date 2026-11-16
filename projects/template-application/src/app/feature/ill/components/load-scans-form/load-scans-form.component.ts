import { ChangeDetectionStrategy, Component, effect, input, output, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { AnalysisFilter, QiFilter, ScanQuery } from '../../../../core/ill/ill.models';
import { startOfDay } from '../../../../core/mock-data/dates';
import { LabelAboveDirective } from '../../../../ui/components/label-above/label-above.directive';
import { wellLabel } from '../../library-model';

/**
 * Load scans (Figma 1:2014): Start / End date, Well, the Quality indicator and
 * Analysis filters, Load scans and Reset. Edits a draft of `query`; Load scans
 * emits it.
 */
@Component({
  selector: 'app-load-scans-form',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    LabelAboveDirective,
  ],
  template: `
    <div class="head">
      <h2 class="title">Load scans</h2>
      <p class="line">Find what you’re looking for or look what you’re finding for</p>
    </div>

    <div class="query">
      <div class="dates">
        <mat-form-field appLabelAbove subscriptSizing="dynamic" class="field">
          <mat-label>Start date</mat-label>
          <input matInput [matDatepicker]="startPicker" [value]="date(draft().start)" (dateChange)="setStart($event.value)" />
          <mat-datepicker-toggle matIconSuffix [for]="startPicker"><mat-icon matDatepickerToggleIcon>calendar_today</mat-icon></mat-datepicker-toggle>
          <mat-datepicker #startPicker />
        </mat-form-field>
        <mat-form-field appLabelAbove subscriptSizing="dynamic" class="field">
          <mat-label>End date</mat-label>
          <input matInput [matDatepicker]="endPicker" [value]="date(draft().end)" (dateChange)="setEnd($event.value)" />
          <mat-datepicker-toggle matIconSuffix [for]="endPicker"><mat-icon matDatepickerToggleIcon>calendar_today</mat-icon></mat-datepicker-toggle>
          <mat-datepicker #endPicker />
        </mat-form-field>
      </div>

      <mat-form-field appLabelAbove class="field">
        <mat-label>Well</mat-label>
        <mat-select multiple placeholder="All wells" [value]="draft().wellIds" (valueChange)="patch({ wellIds: $event })">
          @for (id of wells(); track id) {
            <mat-option [value]="id">{{ label(id) }}</mat-option>
          }
        </mat-select>
        @if (draft().wellIds.length) {
          <button matIconSuffix mat-icon-button type="button" aria-label="Clear wells" (click)="$event.stopPropagation(); patch({ wellIds: [] })">
            <mat-icon>cancel</mat-icon>
          </button>
        }
        <mat-hint>* denotes a recent scan</mat-hint>
      </mat-form-field>
    </div>

    <div class="filters">
      <div class="filters__head">
        <span class="filters__title">Additional filters</span>
        <span class="line">Maybe these will help you out. Maybe they won’t. It’s not my business.</span>
      </div>
      <div class="toggle">
        <span class="toggle__label" id="qi-label">Quality indicator</span>
        <mat-button-toggle-group class="toggles" aria-labelledby="qi-label" [value]="draft().qi" (change)="patch({ qi: $event.value })">
          @for (q of qiOptions; track q) {
            <mat-button-toggle [value]="q">{{ q }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
      </div>
      <div class="toggle">
        <span class="toggle__label" id="analysis-label">Analysis</span>
        <mat-button-toggle-group class="toggles" aria-labelledby="analysis-label" [value]="draft().analysis" (change)="patch({ analysis: $event.value })">
          @for (a of analysisOptions; track a) {
            <mat-button-toggle [value]="a">{{ a }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
      </div>
    </div>

    <div class="actions">
      <button mat-flat-button type="button" (click)="load.emit(draft())">Load scans</button>
      <button mat-button type="button" (click)="reset.emit()">Reset</button>
    </div>
  `,
  styles: `
    @use '@angular/material' as mat;

    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-320);
      width: 854px;
      max-width: 100%;
    }
    .title {
      margin: 0;
      font: var(--mat-sys-title-large);
    }
    .line {
      margin: var(--spacing-80) 0 0;
      font: var(--mat-sys-body-medium);
    }
    .query {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-240);
    }
    .dates {
      display: flex;
      gap: var(--spacing-160);
    }
    .field {
      width: 258px;
    }
    .filters {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-160);
    }
    .filters__head {
      display: flex;
      flex-direction: column;
      opacity: 0.8;
    }
    .filters__title {
      font: var(--mat-sys-title-medium);
    }
    .filters__head .line {
      margin-top: var(--spacing-40);
    }
    .toggle {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-60);
    }
    .toggle__label {
      font: var(--mat-sys-body-medium);
    }
    .toggles {
      @include mat.button-toggle-overrides(
        (
          background-color: transparent,
          text-color: var(--mat-sys-on-surface),
          selected-state-background-color: var(--mat-sys-secondary-container),
          selected-state-text-color: var(--mat-sys-on-secondary-container),
          divider-color: var(--mat-sys-outline),
          shape: var(--mat-sys-corner-small),
          height: 34px,
        )
      );
    }
    .actions {
      display: flex;
      gap: var(--spacing-160);
    }
  `,
  host: { class: 'app-filled-fields' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadScansFormComponent {
  readonly query = input.required<ScanQuery>();
  readonly wells = input<readonly string[]>([]);
  readonly recent = input<ReadonlySet<string>>(new Set());

  readonly load = output<ScanQuery>();
  readonly reset = output<void>();

  protected readonly qiOptions: QiFilter[] = ['Any', 'Good', 'Suspect', 'Not set'];
  protected readonly analysisOptions: AnalysisFilter[] = ['Any', 'Saved', 'Unsaved'];
  protected readonly draft = signal<ScanQuery>({ start: 0, end: 0, wellIds: [], qi: 'Any', analysis: 'Any' });

  constructor() {
    effect(() => {
      const q = this.query();
      untracked(() => this.draft.set({ ...q, wellIds: [...q.wellIds] }));
    });
  }

  protected date(ts: number): Date {
    return new Date(ts);
  }

  protected label(id: string): string {
    return wellLabel(id, this.recent());
  }

  protected patch(p: Partial<ScanQuery>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  protected setStart(d: Date | null): void {
    if (d) this.patch({ start: startOfDay(d.getTime()), end: Math.max(this.draft().end, startOfDay(d.getTime())) });
  }

  protected setEnd(d: Date | null): void {
    if (d) this.patch({ end: startOfDay(d.getTime()), start: Math.min(this.draft().start, startOfDay(d.getTime())) });
  }
}
