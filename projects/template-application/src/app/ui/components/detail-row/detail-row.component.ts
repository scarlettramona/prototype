import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Label · value · unit, with the value right-aligned in a fixed-width column
 * so a stack of rows lines up (Figma: Baseline panel 1:11575, Scan details).
 * `compareValue` adds a second value column in primary — the unsaved result
 * beside the saved one. The unit column keeps its width when empty.
 *
 * Column widths come from `--detail-value-width` and `--detail-unit-width`,
 * so a parent can set them once for all its rows.
 */
@Component({
  selector: 'app-detail-row',
  template: `
    <span class="label">{{ label() }}</span>
    <span class="value">{{ value() }}</span>
    @if (compareValue() !== undefined) {
      <span class="value value--compare">{{ compareValue() }}</span>
    }
    <span class="unit">{{ unit() }}</span>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 1fr var(--detail-value-width, 80px) var(--detail-unit-width, 24px);
      align-items: center;
      column-gap: var(--spacing-60);
      min-height: 20px;
    }
    :host(.compare) {
      grid-template-columns: 1fr var(--detail-value-width, 80px) var(--detail-value-width, 80px) var(--detail-unit-width, 24px);
    }
    .label {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .value {
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
      text-align: right;
      white-space: nowrap;
    }
    .value--compare {
      color: var(--mat-sys-primary);
    }
    .unit {
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface);
      white-space: nowrap;
    }
  `,
  host: { '[class.compare]': 'compareValue() !== undefined' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailRowComponent {
  readonly label = input.required<string>();
  /** Already formatted, e.g. `25.00` or `04/19/2013`. Use `—` for no result. */
  readonly value = input.required<string>();
  /** Second (unsaved) value; omit for a single column. */
  readonly compareValue = input<string | undefined>(undefined);
  readonly unit = input('');
}
