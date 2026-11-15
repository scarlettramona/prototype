import { CdkConnectedOverlay, type ConnectedPosition } from '@angular/cdk/overlay';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { afterNextRender, ChangeDetectionStrategy, Component, effect, ElementRef, inject, Injector, signal, untracked } from '@angular/core';
import { PrototypeStateService } from '../../../core/prototype-state/prototype-state.service';
import { VnvChartComponent } from '../components/vnv-chart/vnv-chart.component';
import { VnvPageHeaderComponent } from '../components/vnv-page-header/vnv-page-header.component';
import { VnvReferencePanelComponent } from '../components/vnv-reference-panel/vnv-reference-panel.component';
import { VnvStore } from '../vnv-store';

/**
 * The VNV screen. Chart view (Phase 3): page header, chart card, right panel.
 * Table view arrives in Phase 4; the load form's contents in Phase 5.
 */
@Component({
  selector: 'app-vnv-page',
  imports: [CdkConnectedOverlay, CdkTrapFocus, VnvChartComponent, VnvPageHeaderComponent, VnvReferencePanelComponent],
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
      <div class="body">
        @if (store.view() === 'chart') {
          <app-vnv-chart class="chart" />
        } @else {
          <div class="chart"></div>
        }
        <app-vnv-reference-panel class="panel" />
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
    .body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 328px;
      gap: var(--spacing-240);
      flex: 1 1 auto;
      min-height: 640px;
      padding: var(--spacing-240);
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
