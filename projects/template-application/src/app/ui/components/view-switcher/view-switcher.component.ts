import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

export type ContentView = 'table' | 'chart';

/**
 * Chart view / Table view (Figma `content-switcher` 1:1990). Chart view comes
 * first because it's where the page opens (Scarlett, 2026-11-17; Figma has Table first).
 */
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
      <mat-button-toggle class="option" value="chart">Chart view</mat-button-toggle>
      <mat-button-toggle class="option" value="table">Table view</mat-button-toggle>
    </mat-button-toggle-group>
  `,
  styles: `
    @use '@angular/material' as mat;

    .switcher {
      @include mat.button-toggle-overrides(
        (
          background-color: var(--mat-sys-surface-container),
          selected-state-background-color: var(--mat-sys-inverse-surface),
          selected-state-text-color: var(--mat-sys-inverse-on-surface),
        )
      );
    }
    .option {
      width: 112px; // 2 × 112 + the 2 px border = Figma's 226 (1:10938)
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewSwitcherComponent {
  readonly value = model<ContentView>('chart');
}
