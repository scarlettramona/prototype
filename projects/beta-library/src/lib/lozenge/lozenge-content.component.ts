import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { LozengeStyleOverride } from './lozenge.models';

/**
 * internal layout primitive shared by `LozengeComponent` and `LozengeDropdownTriggerComponent`
 * renders the icon slot, the text slot, and an optional trailing chevron used
 * by the dropdown trigger.
 *
 * not exported from the public API — consumers should use one of the two
 * wrappers above.
 */
@Component({
  selector: 'lib-lozenge-content',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './lozenge-content.component.html',
  styleUrl: './lozenge-content.component.scss',
})
export class LozengeContentComponent {
  readonly textMaxWidth = input<string | null>(null);
  readonly textMaxWidthIsPercent = input(false);
  readonly styleOverride = input<LozengeStyleOverride | null>(null);
  readonly showChevron = input(false);
  readonly isLoading = input(false);
  readonly textTestId = input<string | null>(null);
  readonly chevronTestId = input<string | null>(null);
}
