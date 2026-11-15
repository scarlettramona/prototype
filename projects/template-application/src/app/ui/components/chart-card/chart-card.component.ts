import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * The chart surface: toolbar, chart, and (optionally) the navigator row with
 * Reset to its left (Figma: VNV graph-panel 1:11454; ILL navigator 1:8968).
 * Layout only — the chart and navigator arrive from the screens.
 *
 *   <app-chart-card [showNavigator]="true" [resetDisabled]="atFullRange()" (reset)="…">
 *     <div chartToolbar>…filters, Export…</div>
 *     <div echarts …></div>
 *     <div chartNavigator>…dataZoom slider host…</div>
 *   </app-chart-card>
 */
@Component({
  selector: 'app-chart-card',
  imports: [MatButtonModule],
  template: `
    <div class="toolbar"><ng-content select="[chartToolbar]" /></div>
    <div class="body"><ng-content /></div>
    @if (showNavigator()) {
      <div class="navigator">
        <button mat-button type="button" class="reset" [disabled]="resetDisabled()" (click)="reset.emit()">Reset</button>
        <div class="navigator__slot"><ng-content select="[chartNavigator]" /></div>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-160);
      padding: var(--spacing-160) var(--spacing-240);
      background: var(--mat-sys-surface-container);
      border-radius: var(--mat-sys-corner-small);
      min-height: 0;
      box-sizing: border-box;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-160);
      min-height: 36px;
    }
    .body {
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
    }
    .navigator {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: var(--spacing-120);
      min-height: 56px;
    }
    .reset {
      margin-left: calc(-1 * var(--spacing-120));
    }
    .navigator__slot {
      position: relative;
      min-width: 0;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardComponent {
  readonly showNavigator = input(false);
  /** Disabled at full range. */
  readonly resetDisabled = input(true);
  readonly reset = output<void>();
}
