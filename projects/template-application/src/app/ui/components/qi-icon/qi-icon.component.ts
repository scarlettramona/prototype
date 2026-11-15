import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Qi } from '../../../core/qi/qi.models';

/**
 * The QI shape: Good ●, Suspect ▲, Unreviewed ■, Transcribed ◆ — the same
 * shapes the charts use as markers. Drawn in `currentColor`.
 */
@Component({
  selector: 'app-qi-icon',
  template: `
    <svg viewBox="0 0 16 16" [attr.width]="size()" [attr.height]="size()" aria-hidden="true" focusable="false">
      @switch (qi()) {
        @case ('Good') {
          <circle cx="8" cy="8" r="6" />
        }
        @case ('Suspect') {
          <polygon points="8,1.5 15,14 1,14" />
        }
        @case ('Unreviewed') {
          <rect x="2.5" y="2.5" width="11" height="11" />
        }
        @case ('Transcribed') {
          <polygon points="8,1 15,8 8,15 1,8" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
    svg {
      fill: currentColor;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QiIconComponent {
  readonly qi = input.required<Qi>();
  /** px */
  readonly size = input(16);
}
