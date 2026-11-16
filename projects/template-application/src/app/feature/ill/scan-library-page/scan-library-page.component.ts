import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, signal, untracked } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { IllMockService } from '../../../core/ill/ill-mock.service';
import type { ScanSummary } from '../../../core/ill/ill.models';
import { PrototypeStateService } from '../../../core/prototype-state/prototype-state.service';
import { APP_PATHS } from '../../../core/routing/app-paths';
import { FilterSummaryComponent } from '../components/filter-summary/filter-summary.component';
import { LoadScansFormComponent } from '../components/load-scans-form/load-scans-form.component';
import { ScanTableComponent } from '../components/scan-table/scan-table.component';
import { defaultScanQuery, IllLibraryStore } from '../ill-library-store';
import { scanToCsv } from '../library-model';

/**
 * The ILL Scan library (Figma 1:2014 … 1:3814): page header, Scan Library /
 * Parameters tabs, the Load scans form (collapsing to a filter summary once
 * loaded) and the results table.
 */
@Component({
  selector: 'app-scan-library-page',
  imports: [MatTabsModule, FilterSummaryComponent, LoadScansFormComponent, ScanTableComponent],
  template: `
    <div class="page" [class.page--wide]="store.loaded()">
      <header class="header">
        <h1 class="title">Interstitial Liquid Level</h1>
        <p class="subtitle">Justo lacinia e ede morbi porttitor lorem id</p>
      </header>

      <nav mat-tab-nav-bar class="tabs" [tabPanel]="panel" aria-label="Interstitial Liquid Level">
        <a mat-tab-link [active]="tab() === 'library'" (click)="tab.set('library')" (keydown.enter)="tab.set('library')" tabindex="0">Scan Library</a>
        <a mat-tab-link [active]="tab() === 'parameters'" (click)="tab.set('parameters')" (keydown.enter)="tab.set('parameters')" tabindex="0">Parameters</a>
      </nav>
    </div>

    <mat-tab-nav-panel #panel class="body">
      @if (tab() === 'library') {
        <div class="page" [class.page--wide]="store.loaded()">
          <div class="query">
            @if (store.formOpen()) {
              <app-load-scans-form
                [query]="store.query()"
                [wells]="store.wellIds()"
                [recent]="store.recent()"
                (load)="store.loadScans($event)"
                (reset)="store.reset()"
              />
            } @else {
              <app-filter-summary [query]="store.query()" (edit)="store.editFilters()" />
            }
          </div>
          <div class="divider"></div>
          <div class="results">
            @if (store.loaded() || store.loading()) {
              <app-scan-table (openWell)="openWell($event)" (openScan)="openScan($event)" (exportScan)="exportScan($event)" />
            } @else {
              <div class="empty">
                <p class="empty__title">No scans yet</p>
                <p class="empty__body">Click the “Load scans” button and something should show up here.</p>
              </div>
            }
          </div>
        </div>
      }
    </mat-tab-nav-panel>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
    }
    /* Figma 1:2014: a centred 1248 px column before loading; 1:2094: full width after. */
    .page {
      width: min(1248px, 100%);
      margin: 0 auto;
      box-sizing: border-box;
    }
    .page--wide {
      width: 100%;
    }
    .header {
      padding: var(--spacing-240) var(--spacing-240) var(--spacing-160);
    }
    .title {
      margin: 0 0 var(--spacing-80);
      font: var(--mat-sys-headline-small);
    }
    .subtitle {
      margin: 0;
      font: var(--mat-sys-body-medium);
    }
    .tabs {
      width: 360px;
      margin-left: var(--spacing-240);
    }
    .body {
      display: flex;
      flex: 1 1 auto;
    }
    /* The content panel: the centred column before loading, full width after. */
    .body > .page {
      background: var(--mat-sys-surface-container-low);
    }
    .query {
      padding: var(--spacing-240);
    }
    .divider {
      height: 1px;
      background: var(--mat-sys-outline-variant);
    }
    .results {
      padding: var(--spacing-240);
    }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-160);
      min-height: 406px;
      color: var(--mat-sys-on-surface);
    }
    .empty__title {
      margin: 0;
      font: var(--mat-sys-headline-medium);
    }
    .empty__body {
      margin: 0;
      font: var(--mat-sys-body-large);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanLibraryPageComponent {
  protected readonly store = inject(IllLibraryStore);
  private readonly service = inject(IllMockService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly prototypeState = inject(PrototypeStateService);

  protected readonly tab = signal<'library' | 'parameters'>('library');

  constructor() {
    void this.store.loadWells();
    effect(() => {
      const state = this.prototypeState.state();
      untracked(() => {
        if (state?.module === 'ill' && state.screen === 'library') {
          this.tab.set('library');
          void this.store.applyState(state);
        } else if (!state && !this.store.loaded()) {
          // Fresh visit: the form. (Coming back from the focus view keeps the results.)
          void this.store.applyState({
            name: 'ill-library-empty',
            module: 'ill',
            screen: 'library',
            route: [],
            query: defaultScanQuery(),
            loaded: false,
            groupByWell: false,
            selectedScanIds: [],
            expandedScanId: null,
          });
        }
      });
    });
  }

  protected openWell(wellId: string): void {
    void this.router.navigate(['/', APP_PATHS.ill, APP_PATHS.illFocus, wellId]);
  }

  protected openScan(scan: ScanSummary): void {
    void this.router.navigate(['/', APP_PATHS.ill, APP_PATHS.illFocus, scan.wellId], { queryParams: { tab: scan.id } });
  }

  /** Export smooth data: the scan's profile as a CSV download. */
  protected async exportScan(scanId: string): Promise<void> {
    const [scan] = await this.service.getScans([scanId]);
    if (!scan) return;
    const url = URL.createObjectURL(new Blob([scanToCsv(scan)], { type: 'text/csv' }));
    const a = this.document.createElement('a');
    a.href = url;
    a.download = `${scan.wellId.replace(/\s+/g, '')}_${scan.datetime}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
