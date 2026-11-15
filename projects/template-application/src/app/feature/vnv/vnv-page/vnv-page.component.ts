import { CdkConnectedOverlay, type ConnectedPosition } from '@angular/cdk/overlay';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, signal, untracked } from '@angular/core';
import { PrototypeStateService } from '../../../core/prototype-state/prototype-state.service';
import { SidePanelComponent } from '../../../ui/components/side-panel/side-panel.component';
import { VnvFormComponent } from '../../../ui/components/vnv-form/vnv-form.component';
import {
  defaultLoadRange,
  LoadSensorsFormComponent,
  type LoadSensorsInit,
  type LoadSensorsRequest,
} from '../components/load-sensors-form/load-sensors-form.component';
import { VnvChartComponent } from '../components/vnv-chart/vnv-chart.component';
import { VnvPageHeaderComponent } from '../components/vnv-page-header/vnv-page-header.component';
import { VnvReferencePanelComponent } from '../components/vnv-reference-panel/vnv-reference-panel.component';
import { VnvTableComponent } from '../components/vnv-table/vnv-table.component';
import { VnvStore } from '../vnv-store';

/**
 * The VNV screen: page header, Chart or Table view, and the right panel.
 * In Table view a selection docks the VNV form in place of the reference panel
 * (Figma 1:10892). With nothing loaded, the Load sensors form is the page
 * (first visit, 1:10989); once loaded, Load data opens it as a popover (1:11102).
 */
@Component({
  selector: 'app-vnv-page',
  imports: [
    CdkConnectedOverlay,
    CdkTrapFocus,
    LoadSensorsFormComponent,
    SidePanelComponent,
    VnvChartComponent,
    VnvFormComponent,
    VnvPageHeaderComponent,
    VnvReferencePanelComponent,
    VnvTableComponent,
  ],
  providers: [VnvStore],
  template: `
    <app-vnv-page-header
      [class.header--centered]="!store.location()"
      [loaded]="store.headerSummary()"
      [range]="store.range()"
      (rangeChange)="store.range.set($event)"
      (rangeApplied)="store.reloadRange($event)"
      [showAllData]="store.showAllData()"
      (showAllDataChange)="store.showAllData.set($event)"
      [view]="store.view()"
      (viewChange)="store.view.set($event)"
      (loadData)="openLoadForm($event)"
    />

    @if (store.location()) {
      <div class="body" [class.body--docked]="docked()">
        @if (store.view() === 'chart') {
          <app-vnv-chart class="chart" />
        } @else {
          <app-vnv-table class="chart" />
        }
        @if (docked()) {
          <app-side-panel class="panel">
            <app-vnv-form
              layout="docked"
              [count]="store.selectedReadings().length"
              [initial]="store.formInitial()"
              (apply)="store.applyReview($event)"
              (cancel)="store.clearSelection()"
              (close)="store.clearSelection()"
            />
          </app-side-panel>
        } @else {
          <app-vnv-reference-panel class="panel" />
        }
      </div>
    } @else if (store.farm(); as farm) {
      <!-- First visit: the form is the page. -->
      <div class="first-visit">
        <app-load-sensors-form
          mode="page"
          [farm]="farm"
          [sensors]="store.sensorIndex()"
          [initial]="pageInit()"
          [range]="store.range()"
          (rangeChange)="store.range.set($event)"
          (load)="onLoad($event)"
        />
      </div>
    }

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="loadFormAnchor() ?? host"
      [cdkConnectedOverlayOpen]="store.loadFormOpen() && !!loadFormAnchor() && !!store.farm()"
      [cdkConnectedOverlayPositions]="popoverPositions"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="app-popover-backdrop"
      (backdropClick)="cancelPopover()"
      (overlayKeydown)="$event.key === 'Escape' && cancelPopover()"
    >
      <app-load-sensors-form
        mode="popover"
        role="dialog"
        aria-label="Load sensors"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
        [style.--load-form-max-height]="'calc(100vh - 160px)'"
        [farm]="store.farm()!"
        [sensors]="store.sensorIndex()"
        [loadedSensorIds]="store.loadedSensorIds()"
        [initial]="popoverInit()"
        [range]="store.range()"
        (rangeChange)="store.range.set($event)"
        (load)="onLoad($event)"
        (cancel)="cancelPopover()"
      />
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    /*
     * The chart and panel fill the window below the headers (Figma 1:11401:
     * 864 px at a 1024 px window): 100vh − 60 app header − 76 page header
     * + 24 so the 24 px bottom padding falls below the fold. The footer
     * follows the page, so it appears when scrolling down.
     */
    .body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 328px;
      gap: var(--spacing-240);
      height: calc(100vh - 112px);
      min-height: 688px;
      padding: var(--spacing-240);
      box-sizing: border-box;
    }
    .body--docked {
      grid-template-columns: minmax(0, 1fr) 340px;
    }
    .chart,
    .panel {
      min-height: 0;
    }
    /* Figma 1:11016: on first visit the title and form share a centred 1248 px column. */
    .header--centered,
    .first-visit {
      display: block;
      width: min(1248px, 100% - 48px);
      margin: 0 auto;
    }
    .first-visit {
      margin-block: var(--spacing-240);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VnvPageComponent {
  protected readonly store = inject(VnvStore);
  protected readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly prototypeState = inject(PrototypeStateService);

  /** Table view with a selection: the VNV form docks in the right panel. */
  protected readonly docked = computed(() => this.store.view() === 'table' && this.store.selectedIds().size > 0);

  /** The Load data button, which the load form popover hangs from. */
  protected readonly loadFormAnchor = signal<HTMLElement | null>(null);
  protected readonly popoverPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  ];

  /** First visit: a fixture's search/filters, nothing selected. */
  protected readonly pageInit = computed<LoadSensorsInit | null>(() => {
    const f = this.store.loadFormInit();
    return f ? { locationId: f.locationId, selectedIds: [], search: f.search, filters: f.filters, showNoData: f.showNoData } : null;
  });

  /** Popover: pre-filled with what's loaded (and a fixture's search/filters). Rebuilt each time it opens. */
  protected readonly popoverInit = computed<LoadSensorsInit>(() => {
    this.store.loadFormOpen();
    const f = this.store.loadFormInit();
    return {
      locationId: f?.locationId ?? this.store.location()?.id ?? null,
      selectedIds: [...this.store.loadedSensorIds()],
      search: f?.search ?? '',
      filters: f?.filters ?? [],
      showNoData: f?.showNoData ?? false,
    };
  });

  constructor() {
    void this.store.loadPickerData();
    effect(() => {
      const state = this.prototypeState.state();
      untracked(() => {
        if (state?.module === 'vnv') {
          void this.store.applyState(state).then(() => this.findAnchor());
        } else if (!state) {
          this.store.clear();
          this.store.loadFormInit.set(null);
          this.store.range.set(defaultLoadRange());
        }
      });
    });
  }

  protected openLoadForm(anchor: HTMLElement): void {
    this.store.loadFormInit.set(null);
    this.loadFormAnchor.set(anchor);
    this.store.loadFormOpen.set(true);
  }

  /** Closes without changes: the dates go back to the range that's loaded. */
  protected cancelPopover(): void {
    if (this.store.location()) this.store.range.set(this.store.loadedRange());
    this.store.loadFormOpen.set(false);
  }

  protected onLoad(request: LoadSensorsRequest): void {
    this.store.loadFormOpen.set(false);
    this.store.loadFormInit.set(null);
    this.store.view.set('chart');
    void this.store.load(request.locationId, request.range, request.sensorIds);
  }

  /** For `?state=…-load-form-open`: the popover needs the button once it has rendered. */
  private findAnchor(): void {
    afterNextRender(
      () => {
        const button = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('app-vnv-page-header button')).find(
          (b) => b.textContent?.trim() === 'Load data',
        );
        if (button) this.loadFormAnchor.set(button);
      },
      { injector: this.injector },
    );
  }
}
