import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Page header layout: title, then projected content, then an end slot pushed
 * right (Figma page-header 1:11429). Separate content groups with
 * `<span class="app-divider-vertical"></span>` (global, `_dividers.scss`).
 *
 *   <app-page-header title="Verification and Validation">
 *     …content…
 *     <div pageHeaderEnd>…</div>
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  template: `
    <h1 class="title">{{ title() }}</h1>
    <ng-content />
    <span class="spacer"></span>
    <ng-content select="[pageHeaderEnd]" />
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: var(--spacing-240);
      padding: var(--spacing-240) var(--spacing-240) 0;
      min-height: 52px;
    }
    .title {
      margin: 0;
      font: var(--mat-sys-headline-medium);
      color: var(--mat-sys-on-surface);
      white-space: nowrap;
    }
    .spacer {
      flex: 1 1 auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
}
