import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, signal, untracked } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { downloadText } from '../../../core/download/download';
import { IllMockService } from '../../../core/ill/ill-mock.service';
import type { ScanSummary } from '../../../core/ill/ill.models';
import { PrototypeStateService } from '../../../core/prototype-state/prototype-state.service';
import { APP_PATHS } from '../../../core/routing/app-paths';
import { MOCK_TODAY } from '../../../core/mock-data/today';
import { FilterSummaryComponent } from '../components/filter-summary/filter-summary.component';
import { LoadScansFormComponent } from '../components/load-scans-form/load-scans-form.component';
import { ScanTableComponent } from '../components/scan-table/scan-table.component';
import { defaultScanQuery, IllLibraryStore } from '../ill-library-store';
import { scanCsvFileName, scanToCsv } from '../library-model';

/**
 * The ILL Scan library (Figma 1:2014 … 1:3814): page header, Scan Library /
 * Parameters tabs, the Load scans form (collapsing to a filter summary once
 * loaded) and the results table.
 */
@Component({
  selector: 'app-scan-library-page',
  imports: [MatTabsModule, FilterSummaryComponent, LoadScansFormComponent, ScanTableComponent],
  templateUrl: './scan-library-page.component.html',
  styleUrl: './scan-library-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanLibraryPageComponent {
  protected readonly store = inject(IllLibraryStore);
  private readonly today = inject(MOCK_TODAY);
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
            query: defaultScanQuery(this.today),
            loaded: false,
            groupByWell: false,
            selectedScanIds: [],
            performOnSelection: false,
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
    downloadText(this.document, scanToCsv(scan), scanCsvFileName(scan));
  }
}
