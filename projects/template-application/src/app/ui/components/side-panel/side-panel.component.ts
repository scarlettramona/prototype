import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The right-hand panel surface: `surface-container`, 24 px padding, sections
 * stacked 24 px apart, scrolling when taller than its container (Figma:
 * floating-parameters 1:11547). Holds `app-panel-section`s.
 */
@Component({
  selector: 'app-side-panel',
  template: '<ng-content />',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-240);
      padding: var(--spacing-240);
      background: var(--mat-sys-surface-container);
      border-radius: var(--mat-sys-corner-small);
      overflow-y: auto;
      min-height: 0;
      box-sizing: border-box;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidePanelComponent {}
