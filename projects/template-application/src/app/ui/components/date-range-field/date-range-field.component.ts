import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { formatDate } from '../../../core/mock-data/dates';

export interface DateRangeValue {
  /** Local midnight, ms. */
  start: number;
  /** Local midnight, ms. */
  end: number;
}

let nextId = 0;

/**
 * The page header's date range: `01/01/2025 – 11/09/2026 ▾` (Figma 1:11440).
 * Clicking opens a popover with Start date / End date and Cancel / Apply.
 * No frame shows the popover; its fields reuse the Load sensors form's date
 * fields (1:10989).
 */
@Component({
  selector: 'app-date-range-field',
  imports: [
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    CdkTrapFocus,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <button
      type="button"
      class="trigger"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="ariaLabel() + ': ' + label()"
      (click)="show()"
    >
      <span class="text">{{ label() }}</span>
      <mat-icon class="arrow">arrow_drop_down</mat-icon>
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="app-popover-backdrop"
      (backdropClick)="close()"
      (detach)="close()"
      (overlayKeydown)="onKeydown($event)"
    >
      <div class="app-popover popover" role="dialog" [attr.aria-label]="ariaLabel()" cdkTrapFocus cdkTrapFocusAutoCapture>
        <div class="fields">
          <div class="app-field">
            <label class="app-field__label" [for]="fieldId + '-start'">Start date</label>
            <mat-form-field subscriptSizing="dynamic">
              <input matInput [id]="fieldId + '-start'" [matDatepicker]="startPicker" [value]="draftStart()" (dateChange)="draftStart.set($event.value)" />
              <mat-datepicker-toggle matIconSuffix [for]="startPicker">
                <mat-icon matDatepickerToggleIcon>calendar_today</mat-icon>
              </mat-datepicker-toggle>
              <mat-datepicker #startPicker />
            </mat-form-field>
          </div>
          <div class="app-field">
            <label class="app-field__label" [for]="fieldId + '-end'">End date</label>
            <mat-form-field subscriptSizing="dynamic">
              <input matInput [id]="fieldId + '-end'" [matDatepicker]="endPicker" [value]="draftEnd()" [min]="draftStart()" (dateChange)="draftEnd.set($event.value)" />
              <mat-datepicker-toggle matIconSuffix [for]="endPicker">
                <mat-icon matDatepickerToggleIcon>calendar_today</mat-icon>
              </mat-datepicker-toggle>
              <mat-datepicker #endPicker />
            </mat-form-field>
          </div>
        </div>
        <div class="actions">
          <button mat-button type="button" (click)="close()">Cancel</button>
          <button mat-flat-button type="button" [disabled]="!valid()" (click)="apply()">Apply</button>
        </div>
      </div>
    </ng-template>
  `,
  styles: `
    :host {
      display: inline-block;
    }
    .trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 260px;
      height: 52px;
      padding: 0 0 0 var(--spacing-160);
      border: 1px solid var(--mat-sys-outline);
      border-radius: var(--mat-sys-corner-extra-small);
      background: transparent;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-large);
      cursor: pointer;

      &:hover {
        border-color: var(--mat-sys-on-surface);
      }
      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: -1px;
      }
    }
    .arrow {
      width: 44px;
    }
    .fields {
      display: flex;
      gap: var(--spacing-120);
    }
    .fields .app-field {
      width: 216px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-160);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangeFieldComponent {
  protected readonly fieldId = `date-range-${nextId++}`;
  readonly range = model.required<DateRangeValue>();
  readonly ariaLabel = input('Date range');
  /** Fires after Apply, with the new range. */
  readonly applied = output<DateRangeValue>();

  protected readonly open = signal(false);
  protected readonly draftStart = signal<Date | null>(null);
  protected readonly draftEnd = signal<Date | null>(null);

  protected readonly label = computed(() => `${formatDate(this.range().start)} – ${formatDate(this.range().end)}`);
  protected readonly valid = computed(() => {
    const s = this.draftStart();
    const e = this.draftEnd();
    return !!s && !!e && e.getTime() >= s.getTime();
  });

  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  ];

  show(): void {
    this.draftStart.set(new Date(this.range().start));
    this.draftEnd.set(new Date(this.range().end));
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }

  protected apply(): void {
    if (!this.valid()) return;
    const value = { start: startOfDay(this.draftStart()!), end: startOfDay(this.draftEnd()!) };
    this.range.set(value);
    this.applied.emit(value);
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
