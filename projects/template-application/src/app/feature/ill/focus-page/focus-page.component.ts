import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, input, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { downloadText } from '../../../core/download/download';
import { PrototypeStateService } from '../../../core/prototype-state/prototype-state.service';
import { APP_PATHS } from '../../../core/routing/app-paths';
import { scanCsvFileName, scanToCsv } from '../library-model';
import { AnalysisParametersComponent } from './components/analysis-parameters/analysis-parameters.component';
import { FocusChartComponent } from './components/focus-chart/focus-chart.component';
import { FocusTabBarComponent } from './components/focus-tab-bar/focus-tab-bar.component';
import { ScanDetailsComponent } from './components/scan-details/scan-details.component';
import { UnsavedDialogComponent, type UnsavedChoice } from './components/unsaved-dialog/unsaved-dialog.component';
import { IllFocusStore } from './ill-focus-store';

/**
 * The ILL focus view (Figma 1:8968 / 1:9514 / 1:10048): back to the Scan
 * library, the well as the title, the scan tabs, then the chart with Scan
 * details and Analysis parameters (a scan tab) or the chart alone (All scans).
 * Leaving or closing a tab with unsaved work asks to save or discard first.
 */
@Component({
  selector: 'app-focus-page',
  imports: [MatButtonModule, MatIconModule, RouterLink, AnalysisParametersComponent, FocusChartComponent, FocusTabBarComponent, ScanDetailsComponent],
  providers: [IllFocusStore],
  templateUrl: './focus-page.component.html',
  styleUrl: './focus-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusPageComponent {
  protected readonly store = inject(IllFocusStore);
  private readonly prototypeState = inject(PrototypeStateService);
  private readonly dialog = inject(MatDialog);
  private readonly document = inject(DOCUMENT);

  /** Route param (component input binding). */
  readonly wellId = input.required<string>();
  /** `?tab=<scanId>`: open on that scan (Adjust in focus view). */
  readonly tab = input<string | undefined>(undefined);

  protected readonly libraryLink = ['/', APP_PATHS.ill];

  constructor() {
    effect(() => {
      const state = this.prototypeState.state();
      const wellId = this.wellId();
      untracked(() => {
        if (state?.module === 'ill' && state.screen === 'focus') void this.store.applyState(state);
        else if (!state) void this.store.load(wellId, this.tab());
      });
    });
  }

  /** The route's `canDeactivate`: confirm when any open scan has unsaved work. */
  async confirmLeave(): Promise<boolean> {
    const dirty = this.store.dirtyIds();
    if (dirty.length === 0) return true;
    const choice = await this.ask();
    if (choice === 'cancel') return false;
    if (choice === 'save') await this.store.save(dirty);
    else await this.store.discard(dirty);
    return true;
  }

  protected async closeTab(id: string): Promise<void> {
    if (this.store.dirty(id)) {
      const choice = await this.ask();
      if (choice === 'cancel') return;
      if (choice === 'save') await this.store.save([id]);
      else await this.store.discard([id]);
    }
    this.store.close(id);
  }

  protected exportScan(): void {
    const scan = this.store.focused();
    if (!scan) return;
    downloadText(this.document, scanToCsv(scan), scanCsvFileName(scan));
  }

  private async ask(): Promise<UnsavedChoice> {
    // One question at a time: a second request while one is open counts as Cancel.
    if (this.dialog.openDialogs.length) return 'cancel';
    const ref = this.dialog.open<UnsavedDialogComponent, void, UnsavedChoice>(UnsavedDialogComponent, { width: '440px', autoFocus: 'first-tabbable' });
    return (await firstValueFrom(ref.afterClosed())) ?? 'cancel';
  }
}
