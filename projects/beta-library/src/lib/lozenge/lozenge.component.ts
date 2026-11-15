import { ChangeDetectionStrategy, Component, computed, ViewEncapsulation } from '@angular/core';

import { LozengeBase } from './lozenge.base';
import { LozengeContentComponent } from './lozenge-content.component';

/**
 * `lib-lozenge` is a status indicator. Use it to draw attention to a short
 * label that describes the state of an entity (e.g. `In progress`, `Done`).
 *
 * @example
 * ```html
 * <lib-lozenge appearance="success">Done</lib-lozenge>
 * <lib-lozenge appearance="accent-blue" spacing="spacious">Beta</lib-lozenge>
 * ```
 *
 * use an icon via the `[lozengeIcon]` slot:
 * ```html
 * <lib-lozenge appearance="warning">
 *   <my-icon lozengeIcon></my-icon>
 *   At risk
 * </lib-lozenge>
 * ```
 */
@Component({
  selector: 'lib-lozenge',
  standalone: true,
  imports: [LozengeContentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './lozenge.component.html',
  styleUrls: ['./lozenge.component.scss'],
  host: {
    'class': 'lozenge-host',
    '[attr.data-testid]': 'testId() || null',
  },
})
export class LozengeComponent extends LozengeBase {
  protected readonly containerClasses = computed(() => {
    const { category, key } = this.themeStyles();
    return ['lozenge', `lozenge--${category}-${key}`, `lozenge--spacing-${this.spacing()}`].join(' ');
  });

  protected readonly containerStyle = computed(() => {
    const { value, isPercent } = this.resolvedMaxWidth();
    const override = this.styleOverride();
    return {
      maxWidth: isPercent ? value : '100%',
      backgroundColor: override?.backgroundColor ?? null,
    };
  });
}
