import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { QI_VALUES, type Qi } from '../../../core/qi/qi.models';
import { QiIconComponent } from '../qi-icon/qi-icon.component';

/**
 * One on/off chip per QI, with its shape (Figma `filter-toggle` 1:2001, in the
 * chart toolbar 1:11456). `value` is the set of QIs that are shown.
 *
 * Built from plain toggle buttons rather than `mat-chip-listbox`: Material's
 * multi-select chips always draw a checkmark, which the design doesn't have.
 */
@Component({
  selector: 'app-quality-filter',
  imports: [QiIconComponent],
  template: `
    @for (qi of qis; track qi) {
      <button type="button" class="chip" [class.chip--on]="isOn(qi)" [attr.aria-pressed]="isOn(qi)" (click)="toggle(qi)">
        <app-qi-icon [qi]="qi" />
        <span>{{ qi }}</span>
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: var(--spacing-80);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-80);
      height: 28px;
      padding: 0 var(--spacing-120);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-extra-small);
      background: transparent;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
      cursor: pointer;
      opacity: 0.6;

      &:hover {
        background: color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
      }
      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: 1px;
      }
    }
    .chip--on {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      opacity: 1;

      &:hover {
        background: color-mix(in srgb, var(--mat-sys-on-secondary-container) 8%, var(--mat-sys-secondary-container));
      }
    }
  `,
  host: { role: 'group', 'aria-label': 'Quality filter' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualityFilterComponent {
  /** The QIs that are shown. */
  readonly value = model<Qi[]>([...QI_VALUES]);
  protected readonly qis = QI_VALUES;

  protected isOn(qi: Qi): boolean {
    return this.value().includes(qi);
  }

  protected toggle(qi: Qi): void {
    const on = this.isOn(qi);
    this.value.set(on ? this.value().filter((q) => q !== qi) : QI_VALUES.filter((q) => q === qi || this.value().includes(q)));
  }
}
