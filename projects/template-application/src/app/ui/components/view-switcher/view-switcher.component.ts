import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

export type ContentView = 'table' | 'chart';

/** Table view / Chart view (Figma `content-switcher` 1:1990). */
@Component({
  selector: 'app-view-switcher',
  imports: [MatButtonToggleModule],
  template: `
    <mat-button-toggle-group
      class="switcher"
      aria-label="View"
      hideSingleSelectionIndicator
      [value]="value()"
      (change)="value.set($event.value)"
    >
      <mat-button-toggle class="option" value="table">Table view</mat-button-toggle>
      <mat-button-toggle class="option" value="chart">Chart view</mat-button-toggle>
    </mat-button-toggle-group>
  `,
  styles: `
    @use '@angular/material' as mat;

    .switcher {
      @include mat.button-toggle-overrides(
        (
          background-color: var(--mat-sys-surface-container),
          text-color: var(--mat-sys-on-surface),
          selected-state-background-color: var(--mat-sys-inverse-surface),
          selected-state-text-color: var(--mat-sys-inverse-on-surface),
          divider-color: var(--mat-sys-outline),
          shape: var(--mat-sys-corner-small),
          height: 36px,
          label-text-font: var(--mat-sys-title-small-font),
          label-text-weight: var(--mat-sys-title-small-weight),
          label-text-size: var(--mat-sys-title-small-size),
          label-text-tracking: var(--mat-sys-title-small-tracking),
        )
      );
    }
    .option {
      width: 113px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewSwitcherComponent {
  readonly value = model<ContentView>('chart');
}
