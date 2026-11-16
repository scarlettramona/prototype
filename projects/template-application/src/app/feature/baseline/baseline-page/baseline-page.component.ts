import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../../ui/components/page-header/page-header.component';

/**
 * Baseline: a stub so the header's Baseline link has a page. It shows the page
 * title only; the page itself is being designed and built next.
 */
@Component({
  selector: 'app-baseline-page',
  imports: [PageHeaderComponent],
  template: `<app-page-header title="Baseline" />`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaselinePageComponent {}
