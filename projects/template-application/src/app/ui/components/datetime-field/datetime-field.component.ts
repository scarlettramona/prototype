import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * a`date`-valued form control rendered as a Material datepicker
 * plus a plain `type="time"` input (for the time of day). the time input is
 * deliberately not a `matTimepicker` because we don't want the suggestion dropdown
 */
@Component({
  selector: 'app-datetime-field',
  imports: [MatDatepickerModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimeFieldComponent),
      multi: true,
    },
  ],
  templateUrl: './datetime-field.component.html',
  styleUrl: './datetime-field.component.scss',
})
export class DateTimeFieldComponent implements ControlValueAccessor {
  readonly label = input('Date');

  readonly value = signal<Date | null>(null);
  readonly isDisabled = signal(false);

  readonly timeString = computed(() => {
    const d = this.value();
    if (!d) {
      return '';
    }
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  });

  /* Replaced by the forms API via registerOnChange/registerOnTouched. */
  private onChange: (value: Date | null) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: Date | null): void {
    this.value.set(value ? new Date(value) : null);
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
  }

  onDateChange(event: MatDatepickerInputEvent<Date>): void {
    const picked = event.value;
    if (!picked) {
      this.commit(null);
      return;
    }
    const prev = this.value();
    const next = new Date(picked);
    if (prev) {
      next.setHours(prev.getHours(), prev.getMinutes(), prev.getSeconds(), 0);
    } else {
      next.setHours(0, 0, 0, 0);
    }
    this.commit(next);
  }

  onTimeChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value; // '' or 'HH:MM[:SS]'
    const base = this.value() ?? this.startOfToday();
    const next = new Date(base);
    if (!raw) {
      next.setHours(0, 0, 0, 0);
    } else {
      const [h, m, s] = raw.split(':').map((p) => Number(p) || 0);
      next.setHours(h, m, s ?? 0, 0);
    }
    this.commit(next);
  }

  private commit(value: Date | null): void {
    this.value.set(value);
    this.onChange(value);
  }

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
