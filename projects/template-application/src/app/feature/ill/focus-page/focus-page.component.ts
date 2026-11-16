import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, input, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PrototypeStateService } from '../../../core/prototype-state/prototype-state.service';
import { APP_PATHS } from '../../../core/routing/app-paths';
import { scanToCsv } from '../library-model';
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
  template: `
    <header class="header">
      <div class="back">
        <a mat-icon-button class="back__button" [routerLink]="libraryLink" aria-label="Back to Scan library">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <div class="crumbs">
          <a class="crumb" [routerLink]="libraryLink">Scan library<mat-icon class="crumb__icon" aria-hidden="true">chevron_right</mat-icon></a>
          <h1 class="title">{{ store.wellId() }}</h1>
        </div>
      </div>
      <app-focus-tab-bar (close)="closeTab($event)" />
    </header>

    <main class="content">
      @if (store.focused()) {
        <div class="top">
          <app-focus-chart class="chart" />
          <app-scan-details class="details" (exportScan)="exportScan()" />
        </div>
        <app-analysis-parameters />
      } @else {
        <app-focus-chart class="chart chart--all" />
      }
    </main>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
    }
    .header {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-160);
      padding: var(--spacing-240) var(--spacing-240) 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .back {
      display: flex;
      align-items: center;
      gap: var(--spacing-160);
    }
    .back__button {
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .crumbs {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-60);
    }
    .crumb {
      display: inline-flex;
      align-items: center;
      font: var(--mat-sys-title-small);
      color: var(--mat-sys-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: 2px;
      }
    }
    .crumb__icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .title {
      margin: 0;
      font: var(--mat-sys-headline-small);
      color: var(--mat-sys-on-surface);
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-240);
      padding: var(--spacing-240);
      background: var(--mat-sys-background);
    }
    .top {
      display: flex;
      gap: var(--spacing-240);
      height: 765px;
    }
    .chart {
      flex: 1 1 auto;
      min-width: 0;
    }
    .chart--all {
      height: 630px;
    }
    .details {
      flex: 0 0 412px;
    }
  `,
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
    const url = URL.createObjectURL(new Blob([scanToCsv(scan)], { type: 'text/csv' }));
    const a = this.document.createElement('a');
    a.href = url;
    a.download = `${scan.wellId.replace(/\s+/g, '')}_${scan.datetime}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async ask(): Promise<UnsavedChoice> {
    // One question at a time: a second request while one is open counts as Cancel.
    if (this.dialog.openDialogs.length) return 'cancel';
    const ref = this.dialog.open<UnsavedDialogComponent, void, UnsavedChoice>(UnsavedDialogComponent, { width: '440px', autoFocus: 'first-tabbable' });
    return (await firstValueFrom(ref.afterClosed())) ?? 'cancel';
  }
}
