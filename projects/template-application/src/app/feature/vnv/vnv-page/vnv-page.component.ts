import { CdkConnectedOverlay, type ConnectedPosition } from '@angular/cdk/overlay';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, signal, untracked } from '@angular/core';
import { PrototypeStateService } from '../../../core/prototype-state/prototype-state.service';
import { VnvChartComponent } from '../components/vnv-chart/vnv-chart.component';
import { VnvPageHeaderComponent } from '../components/vnv-page-header/vnv-page-header.component';
import { VnvReferencePanelComponent } from '../components/vnv-reference-panel/vnv-reference-panel.component';
import { VnvTableComponent } from '../components/vnv-table/vnv-table.component';
import { SidePanelComponent } from '../../../ui/components/side-panel/side-panel.component';
import { VnvFormComponent } from '../../../ui/components/vnv-form/vnv-form.component';
import { VnvStore } from '../vnv-store';

/**
 * The VNV screen: page header, Chart or Table view, and the right panel.
 * In Table view a selection docks the VNV form in place of the reference panel
 * (Figma 1:10892). The load form's contents arrive in Phase 5.
 */
@Component({
  selector: 'app-vnv-page',
  imports: [
    CdkConnectedOverlay,
    CdkTrapFocus,
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
    }

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="loadFormAnchor() ?? host"
      [cdkConnectedOverlayOpen]="store.loadFormOpen() && !!loadFormAnchor()"
      [cdkConnectedOverlayPositions]="popoverPositions"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="app-popover-backdrop"
      (backdropClick)="store.loadFormOpen.set(false)"
      (overlayKeydown)="$event.key === 'Escape' && store.loadFormOpen.set(false)"
    >
      <!-- Load sensors form: contents arrive in Phase 5. -->
      <div class="app-popover load-form" role="dialog" aria-label="Load sensors" tabindex="-1" cdkTrapFocus cdkTrapFocusAutoCapture></div>
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
    .load-form {
      width: 806px;
      min-height: 240px;
      box-sizing: border-box;
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

  constructor() {
    effect(() => {
      const state = this.prototypeState.state();
      untracked(() => {
        if (state?.module === 'vnv') {
          void this.store.applyState(state).then(() => this.findAnchor());
        } else if (!state) {
          this.store.clear();
        }
      });
    });
  }

  protected openLoadForm(anchor: HTMLElement): void {
    this.loadFormAnchor.set(anchor);
    this.store.loadFormOpen.set(true);
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
