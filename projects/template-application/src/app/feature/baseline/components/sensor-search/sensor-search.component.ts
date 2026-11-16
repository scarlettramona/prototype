import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { MatAutocompleteModule, type MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import type { Sensor } from '../../../../core/vnv/vnv.models';

let nextId = 0;

/** Most options shown at once; typing narrows the list. */
const MAX_OPTIONS = 50;

/**
 * Sensor search: an autocomplete over every sensor, matching the sensor id or
 * its component. Picking an option emits its id; clearing emits `null`.
 */
@Component({
  selector: 'app-sensor-search',
  imports: [MatAutocompleteModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="app-field">
      <label class="app-field__label" [for]="fieldId">Sensor</label>
      <mat-form-field subscriptSizing="dynamic">
        <mat-icon matIconPrefix>search</mat-icon>
        <input
          matInput
          type="text"
          [id]="fieldId"
          placeholder="Search for a sensor"
          [value]="query()"
          [matAutocomplete]="auto"
          (input)="query.set($any($event.target).value)"
        />
        @if (query()) {
          <button matIconSuffix mat-icon-button type="button" aria-label="Clear sensor" (click)="clear()">
            <mat-icon>cancel</mat-icon>
          </button>
        }
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="pick($event)">
          @for (s of options(); track s.id) {
            <mat-option [value]="s.id">
              <span class="option">
                <span class="option__id">{{ s.id }}</span>
                <span class="option__location">{{ s.locationId }}</span>
              </span>
            </mat-option>
          } @empty {
            @if (query()) {
              <mat-option disabled>No matching sensors</mat-option>
            }
          }
        </mat-autocomplete>
      </mat-form-field>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .option {
      display: flex;
      flex-direction: column;
    }
    .option__location {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  host: { class: 'app-filled-fields' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensorSearchComponent {
  protected readonly fieldId = `sensor-search-${nextId++}`;
  readonly sensors = input.required<readonly Sensor[]>();
  /** The selected sensor id, shown in the field. */
  readonly value = input<string | null>(null);
  readonly selectedChange = output<string | null>();

  protected readonly query = signal('');

  protected readonly options = computed(() => {
    const q = this.query().trim().toLowerCase();
    const sensors = this.sensors();
    const matches = q ? sensors.filter((s) => s.id.toLowerCase().includes(q) || s.locationId.toLowerCase().includes(q)) : sensors;
    return matches.slice(0, MAX_OPTIONS);
  });

  constructor() {
    // The field shows the selected sensor.
    effect(() => this.query.set(this.value() ?? ''));
  }

  protected pick(event: MatAutocompleteSelectedEvent): void {
    const id = event.option.value as string;
    this.query.set(id);
    this.selectedChange.emit(id);
  }

  protected clear(): void {
    this.query.set('');
    this.selectedChange.emit(null);
  }
}
