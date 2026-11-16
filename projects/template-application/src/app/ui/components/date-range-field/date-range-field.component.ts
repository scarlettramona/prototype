import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { formatDate, startOfDay } from '../../../core/mock-data/dates';

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
  templateUrl: './date-range-field.component.html',
  styleUrl: './date-range-field.component.scss',
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
    const value = { start: startOfDay(this.draftStart()!.getTime()), end: startOfDay(this.draftEnd()!.getTime()) };
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
