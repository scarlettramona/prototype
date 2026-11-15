import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * One section of a side panel: title, optional action link, body. Sections
 * after the first get a divider above them (Figma: right panel 1:11547).
 *
 * `heading` is a panel heading ("Legend", title-medium); `label` is a field
 * label ("Baseline sensor", body-medium, muted).
 */
@Component({
  selector: 'app-panel-section',
  imports: [MatButtonModule],
  template: `
    @if (title() || actionLabel()) {
      <div class="head">
        @if (title()) {
          <h3 class="title" [class.title--label]="titleStyle() === 'label'">{{ title() }}</h3>
        }
        @if (actionLabel()) {
          <button mat-button type="button" class="action" (click)="action.emit()">{{ actionLabel() }}</button>
        }
      </div>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-240);
    }
    :host(.label) {
      gap: var(--spacing-120);
    }
    :host(:not(:first-child)) {
      border-top: 1px solid var(--mat-sys-outline-variant);
      padding-top: var(--spacing-240);
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 24px;
    }
    .title {
      margin: 0;
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-background);
    }
    .title--label {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .action {
      margin: calc(-1 * var(--spacing-80)) calc(-1 * var(--spacing-120)) calc(-1 * var(--spacing-80)) 0;
    }
  `,
  host: { '[class.label]': "titleStyle() === 'label'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSectionComponent {
  readonly title = input('');
  readonly titleStyle = input<'heading' | 'label'>('heading');
  /** e.g. `Edit`, `Revert`. Omit for no action. */
  readonly actionLabel = input('');
  readonly action = output<void>();
}
