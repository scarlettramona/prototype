import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * The bar that floats over a chart selection: `VNV | ⋯` (Figma graph-menu
 * 1:11704). The ⋯ button has no menu yet: no frame defines one, so it is
 * shown but inert (aria-disabled) until a design exists.
 */
@Component({
  selector: 'app-selection-action-bar',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button mat-button type="button" class="vnv" (click)="vnv.emit($any($event.currentTarget))">VNV</button>
    <span class="app-divider-vertical"></span>
    <button mat-icon-button type="button" class="more" aria-label="More actions" aria-disabled="true">
      <mat-icon>more_horiz</mat-icon>
    </button>
  `,
  styles: `
    @use '@angular/material' as mat;

    // Figma 1:11704: 94 × 42 outside the 1 px border.
    :host {
      display: inline-flex;
      align-items: center;
      gap: 1px;
      width: 94px;
      height: 42px;
      background: var(--mat-sys-surface-container-high);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-extra-small);
      box-sizing: border-box;
    }
    .vnv {
      flex: 1 1 auto;
      min-width: 0;
      @include mat.button-overrides((text-horizontal-padding: var(--spacing-120), text-container-height: 40px));
    }
    .more {
      @include mat.icon-button-overrides(
        (
          state-layer-size: 40px,
          container-shape: var(--mat-sys-corner-extra-small),
          icon-color: var(--mat-sys-on-surface),
        )
      );
      cursor: default;
    }
  `,
  host: { role: 'toolbar', 'aria-label': 'Selection actions' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectionActionBarComponent {
  /** Opens the VNV form; emits the button, to anchor the popover. */
  readonly vnv = output<HTMLElement>();
}
