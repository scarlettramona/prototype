import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import type { LegendSwatch } from '../legend-row/legend-row.component';
import { SeriesSwatchComponent } from '../series-swatch/series-swatch.component';

export interface SwatchOption<T = string> {
  value: T;
  label: string;
  swatch: LegendSwatch;
}

/**
 * A select whose value shows a series swatch (Figma: Baseline sensor and
 * Equipment out of service, 1:11566 / 1:11613). Outlined. With nothing chosen
 * it shows `placeholder`; `noneLabel` adds a first option that clears the choice.
 */
@Component({
  selector: 'app-swatch-select',
  imports: [MatFormFieldModule, MatSelectModule, SeriesSwatchComponent],
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="field">
      <mat-select [value]="value()" (valueChange)="value.set($event)" [aria-label]="ariaLabel()" [placeholder]="placeholder()" panelWidth="">
        <mat-select-trigger>
          @if (selected(); as s) {
            <span class="item">
              <app-series-swatch [color]="s.swatch.color" [dash]="s.swatch.dash" />
              {{ s.label }}
            </span>
          }
        </mat-select-trigger>
        @if (noneLabel()) {
          <mat-option [value]="null">{{ noneLabel() }}</mat-option>
        }
        @for (o of options(); track o.value) {
          <mat-option [value]="o.value">
            <span class="item">
              <app-series-swatch [color]="o.swatch.color" [dash]="o.swatch.dash" />
              {{ o.label }}
            </span>
          </mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: `
    :host {
      display: block;
    }
    .field {
      width: 100%;
    }
    .item {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-60);
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-background);
      --swatch-ring-fill: var(--mat-sys-surface-container);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwatchSelectComponent<T = string> {
  readonly options = input.required<SwatchOption<T>[]>();
  readonly value = model<T | null>(null);
  readonly ariaLabel = input('');
  /** Shown while nothing is chosen. */
  readonly placeholder = input('');
  /** Label of a first option that clears the choice; none when empty. */
  readonly noneLabel = input('');

  protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()) ?? null);
}
