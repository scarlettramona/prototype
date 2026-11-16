import { ChangeDetectionStrategy, Component, computed, effect, input, model, output, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { lowerLimit, upperLimit, type BaselineMode, type BaselineRecord, type BaselineValues } from '../../../../core/baseline/baseline.models';
import { addDays, formatDate } from '../../../../core/mock-data/dates';
import type { Sensor } from '../../../../core/vnv/vnv.models';
import { changedFields, formatTemp, initialFormValue, minStartDate, toBaselineValues, type BaselineFormValue } from '../../baseline-form.model';

let nextId = 0;

/**
 * The baseline form for one sensor. Edit existing corrects the current
 * baseline; Create new starts a new one after it. Fields: start date; baseline
 * value and slope rate; lower and upper limit offsets side by side (each with
 * its resulting limit); comment. Clear returns to the starting values; Submit
 * emits the values for the page to confirm and save.
 */
@Component({
  selector: 'app-baseline-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './baseline-form.component.html',
  styleUrl: './baseline-form.component.scss',
  host: { class: 'app-filled-fields' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaselineFormComponent {
  protected readonly fieldId = `baseline-form-${nextId++}`;
  private readonly today = Date.now();
  readonly sensor = input.required<Sensor>();
  /** Newest (current) first. */
  readonly history = input.required<readonly BaselineRecord[]>();
  readonly mode = model<BaselineMode>('edit');
  readonly busy = input(false);
  readonly submitted = output<BaselineValues>();
  readonly viewReport = output<void>();

  protected readonly form = new FormGroup({
    startDate: new FormControl<Date | null>(null, Validators.required),
    value: new FormControl<number | null>(null, Validators.required),
    slopeRatePerYear: new FormControl<number | null>(null, Validators.required),
    lowerLimitOffset: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    upperLimitOffset: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    comment: new FormControl('', { nonNullable: true }),
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  protected readonly current = computed(() => this.history()[0] ?? null);
  /** The earliest allowed start date: the day after the baseline before this one. */
  protected readonly minDate = computed(() => {
    const min = minStartDate(this.history(), this.mode());
    return min === null ? null : new Date(addDays(min, 1));
  });
  protected readonly minDateText = computed(() => (this.minDate() ? formatDate(addDays(this.minDate()!.getTime(), -1)) : ''));

  protected readonly values = computed(() => {
    this.formValue();
    return toBaselineValues(this.form.getRawValue() as BaselineFormValue);
  });
  protected readonly changed = computed(() => {
    const v = this.values();
    const c = this.current();
    return v && c ? changedFields(v, c) : new Set<string>();
  });
  /** Where the form starts for this baseline and mode (see `initialFormValue`). */
  private readonly start = computed(() => {
    const c = this.current();
    return c ? initialFormValue(c, this.mode(), this.today) : null;
  });
  /** Clear is offered once the form differs from where it started. */
  protected readonly canClear = computed(() => {
    const v = this.values();
    const start = this.start();
    const startValues = start && toBaselineValues(start);
    return !v || !startValues || changedFields(v, startValues).size > 0;
  });
  protected readonly canSubmit = computed(
    () => this.formStatus() === 'VALID' && !!this.values() && !this.busy() && (this.mode() === 'new' || this.changed().size > 0),
  );

  protected readonly lowerText = computed(() => this.limitText('lower'));
  protected readonly upperText = computed(() => this.limitText('upper'));
  protected readonly modeText = computed(() => {
    const c = this.current();
    if (!c) return '';
    return this.mode() === 'edit'
      ? `Changes the current baseline, which started ${formatDate(c.startDate)}.`
      : 'Starts a new baseline. The current one stays in the history.';
  });

  constructor() {
    // A new sensor, a save (new history) or a mode switch starts the form again.
    effect(() => {
      const start = this.start();
      untracked(() => this.reset(start));
    });
    effect(() => {
      if (this.busy()) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });
  }

  protected clear(): void {
    this.reset(this.start());
  }

  protected submit(): void {
    const values = this.values();
    if (this.canSubmit() && values) this.submitted.emit(values);
  }

  private reset(start: BaselineFormValue | null): void {
    if (start) this.form.reset(start);
  }

  private limitText(which: 'lower' | 'upper'): string {
    const { value, lowerLimitOffset, upperLimitOffset } = this.formValue();
    const offset = which === 'lower' ? lowerLimitOffset : upperLimitOffset;
    if (value == null || offset == null) return '';
    const limit = which === 'lower' ? lowerLimit({ value, lowerLimitOffset: offset }) : upperLimit({ value, upperLimitOffset: offset });
    return `${which === 'lower' ? 'Lower' : 'Upper'} limit ${formatTemp(limit)} °F`;
  }
}
