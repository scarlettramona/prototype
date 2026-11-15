import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

export type LozengeSpinnerSize = 'small' | 'xsmall';

/**
 * internal SVG spinner used by the dropdown trigger's loading overlay. kept
 * inside the package so the component doesn't have an external icon dependency.
 */
@Component({
  selector: 'lib-lozenge-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './lozenge-spinner.component.html',
  styleUrl: './lozenge-spinner.component.scss',
})
export class LozengeSpinnerComponent {
  readonly size = input<LozengeSpinnerSize>('xsmall');
  readonly label = input('Loading');
  readonly testId = input<string | null>(null);
}
