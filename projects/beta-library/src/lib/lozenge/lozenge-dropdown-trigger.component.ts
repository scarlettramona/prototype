import { ChangeDetectionStrategy, Component, computed, input, output, ViewEncapsulation } from '@angular/core';

import { LozengeBase } from './lozenge.base';
import { LozengeContentComponent } from './lozenge-content.component';
import { LozengeSpinnerComponent } from './lozenge-spinner.component';

/**
 * interactive lozenge variant. renders as a `<button>` so it slots cleanly
 * into a dropdown/menu trigger. Wire it to a popup (Angular CDK Overlay, a
 * menu, etc.) by binding the standard popup ARIA attributes.
 *
 * example
 * ```html
 * <lib-lozenge-dropdown-trigger
 *   appearance="information"
 *   [isSelected]="menuOpen()"
 *   [isLoading]="saving()"
 *   aria-controls="status-menu"
 *   [aria-expanded]="menuOpen()"
 *   aria-haspopup="menu"
 *   (clicked)="toggleMenu($event)"
 * >
 *   In progress
 * </lib-lozenge-dropdown-trigger>
 * ```
 */
@Component({
  selector: 'lib-lozenge-dropdown-trigger',
  standalone: true,
  imports: [LozengeContentComponent, LozengeSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './lozenge-dropdown-trigger.component.html',
  styleUrls: ['./lozenge.component.scss'],
  host: {
    'class': 'lozenge-host',
  },
})
export class LozengeDropdownTriggerComponent extends LozengeBase {
  readonly isSelected = input<boolean, boolean | undefined | null>(false, {
    transform: (value) => !!value,
  });

  /** Non-interactive + spinner overlay + `aria-busy`/`aria-disabled`. */
  readonly isLoading = input<boolean, boolean | undefined | null>(false, {
    transform: (value) => !!value,
  });

  // ARIA attributes forwarded to the host `<button>` so consumers can bind
  // natural HTML syntax, e.g. `[aria-controls]="menuId"`.
  readonly ariaControls = input<string | null>(null, { alias: 'aria-controls' });
  readonly ariaExpanded = input<boolean | null>(null, { alias: 'aria-expanded' });
  readonly ariaHaspopup = input<boolean | 'menu' | 'listbox' | 'dialog' | 'true' | null>(null, {
    alias: 'aria-haspopup',
  });
  /** Replaced by `Loading` while `isLoading` is true. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });

  /** Suppressed while `isLoading` is true. */
  readonly clicked = output<MouseEvent>();

  protected readonly containerClasses = computed(() => {
    const { category, key } = this.themeStyles();
    const classes = [
      'lozenge',
      'lozenge--interactive',
      `lozenge--${category}-${key}`,
      `lozenge--spacing-${this.spacing()}`,
    ];
    if (this.isSelected()) {
      classes.push('lozenge--selected');
    }
    if (this.isLoading()) {
      classes.push('lozenge--loading');
    }
    return classes.join(' ');
  });

  protected readonly containerStyle = computed(() => {
    const { value, isPercent } = this.resolvedMaxWidth();
    const override = this.styleOverride();
    return {
      maxWidth: isPercent ? value : '100%',
      backgroundColor: override?.backgroundColor ?? null,
      cursor: this.isLoading() ? 'progress' : 'pointer',
    };
  });

  protected readonly chevronTestId = computed(() => {
    const id = this.testId();
    return id ? `${id}--chevron` : null;
  });
  protected readonly spinnerTestId = computed(() => {
    const id = this.testId();
    return id ? `${id}--loading-spinner` : null;
  });

  protected onClick(event: MouseEvent): void {
    if (this.isLoading()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.clicked.emit(event);
  }
}
