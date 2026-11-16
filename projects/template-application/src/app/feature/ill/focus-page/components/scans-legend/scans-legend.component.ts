import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { seriesStyle } from '../../../../../core/charts/chart-palette';
import { formatDateTime } from '../../../../../core/mock-data/dates';
import { checkState } from '../../../../../core/selection/check-state';
import { LegendRowComponent } from '../../../../../ui/components/legend-row/legend-row.component';
import { IllFocusStore } from '../../ill-focus-store';

/**
 * The scans legend popover (Figma 1:10714): All scans, then one row per open
 * scan. The focused scan is bold and locked on; its Saved (solid) and Unsaved
 * (dashed) Calculated ILL lines get their own rows when it has them.
 */
@Component({
  selector: 'app-scans-legend',
  imports: [LegendRowComponent],
  template: `
    <app-legend-row
      class="row"
      mode="checkbox"
      label="All scans"
      [visible]="allState().checked"
      [indeterminate]="allState().indeterminate"
      (visibleChange)="store.setAllVisible($event)"
    />
    <div class="divider"></div>
    @for (scan of store.openScans(); track scan.id) {
      @let focused = scan.id === store.active();
      @let style = swatch(scan.colorIndex);
      <app-legend-row
        class="row"
        mode="checkbox"
        [label]="label(scan.datetime)"
        [swatch]="style"
        [visible]="focused || !store.hidden().has(scan.id)"
        [locked]="focused"
        [emphasis]="focused"
        (visibleChange)="store.setHidden(scan.id, !$event)"
      />
      @if (focused) {
        @if (scan.analysis.saved) {
          <app-legend-row
            class="row"
            mode="checkbox"
            label="Saved"
            [indent]="true"
            [swatch]="style"
            [visible]="store.lines().saved"
            (visibleChange)="setLine('saved', $event)"
          />
        }
        @if (scan.analysis.unsaved) {
          <app-legend-row
            class="row"
            mode="checkbox"
            label="Unsaved"
            labelTone="primary"
            [indent]="true"
            [swatch]="{ color: style.color, dash: dashed }"
            [visible]="store.lines().unsaved"
            (visibleChange)="setLine('unsaved', $event)"
          />
        }
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      width: 346px;
      padding: var(--spacing-80) 0;
      box-sizing: border-box;
    }
    .row {
      display: flex;
      align-items: center;
      min-height: 40px;
      padding-right: var(--spacing-240);
    }
    .divider {
      height: 1px;
      margin: var(--spacing-40) var(--spacing-240);
      background: var(--mat-sys-outline-variant);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScansLegendComponent {
  protected readonly store = inject(IllFocusStore);
  protected readonly dashed = [3, 3] as const;

  protected readonly allState = computed(() => {
    const hidden = this.store.hidden();
    const focus = this.store.active();
    return checkState(this.store.openIds().map((id) => id === focus || !hidden.has(id)));
  });

  protected swatch(index: number) {
    const s = seriesStyle(index);
    return { color: s.color, dash: s.dash };
  }

  protected label(ts: number): string {
    return formatDateTime(ts);
  }

  protected setLine(which: 'saved' | 'unsaved', on: boolean): void {
    this.store.lines.update((l) => ({ ...l, [which]: on }));
  }
}
