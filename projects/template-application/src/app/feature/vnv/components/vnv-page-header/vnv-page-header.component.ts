import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DateRangeFieldComponent, type DateRangeValue } from '../../../../ui/components/date-range-field/date-range-field.component';
import { PageHeaderComponent } from '../../../../ui/components/page-header/page-header.component';
import { ViewSwitcherComponent, type ContentView } from '../../../../ui/components/view-switcher/view-switcher.component';

export interface LoadedComponentSummary {
  /** The location, e.g. `241-AN-WSTA-102-TI`. */
  name: string;
  sensorCount: number;
}

/**
 * The VNV page header (Figma 1:11429): title | component · N sensors · Load
 * data | date range | Show all data … Table view / Chart view.
 * With nothing loaded it shows the title only (first visit, 1:10989).
 */
@Component({
  selector: 'app-vnv-page-header',
  imports: [MatButtonModule, MatSlideToggleModule, PageHeaderComponent, DateRangeFieldComponent, ViewSwitcherComponent],
  template: `
    <app-page-header title="Verification and Validation">
      @if (loaded(); as l) {
        <span class="app-divider-vertical"></span>
        <div class="component">
          <div class="component__name">
            <span class="name">{{ l.name }}</span>
            <span class="count">{{ l.sensorCount }} sensors</span>
          </div>
          <button matButton="tonal" type="button" (click)="loadData.emit($any($event.currentTarget))">Load data</button>
        </div>
        <span class="app-divider-vertical"></span>
        <app-date-range-field [(range)]="range" (applied)="rangeApplied.emit($event)" />
        <span class="app-divider-vertical"></span>
        <mat-slide-toggle class="show-all" labelPosition="before" hideIcon [checked]="showAllData()" (change)="showAllData.set($event.checked)">
          Show all data
        </mat-slide-toggle>
      }
      @if (loaded()) {
        <app-view-switcher pageHeaderEnd [(value)]="view" />
      }
    </app-page-header>
  `,
  styles: `
    :host {
      display: block;
      white-space: nowrap;
    }
    .component {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: var(--spacing-240);
    }
    .component__name {
      display: flex;
      flex-direction: column;
    }
    .name {
      font: var(--mat-sys-title-large);
      color: var(--mat-sys-on-surface);
    }
    .count {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .show-all {
      flex-shrink: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VnvPageHeaderComponent {
  /** `null`: nothing loaded yet; only the title shows. */
  readonly loaded = input<LoadedComponentSummary | null>(null);
  readonly range = model.required<DateRangeValue>();
  readonly showAllData = model(false);
  readonly view = model<ContentView>('chart');

  /** Load data clicked; emits the button, to anchor the load form popover. */
  readonly loadData = output<HTMLElement>();
  /** The date range was applied from its popover. */
  readonly rangeApplied = output<DateRangeValue>();
}
