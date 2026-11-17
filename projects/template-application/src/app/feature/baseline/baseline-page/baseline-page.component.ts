import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, type MatSnackBarConfig } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { lowerLimit, upperLimit, type BaselineValues } from '../../../core/baseline/baseline.models';
import { formatDate } from '../../../core/mock-data/dates';
import { DetailRowComponent } from '../../../ui/components/detail-row/detail-row.component';
import { PanelSectionComponent } from '../../../ui/components/panel-section/panel-section.component';
import { SidePanelComponent } from '../../../ui/components/side-panel/side-panel.component';
import { formatTemp } from '../baseline-form.model';
import { BaselineStore } from '../baseline-store';
import { BaselineConfirmDialogComponent, type BaselineConfirmDialogData } from '../components/baseline-confirm-dialog/baseline-confirm-dialog.component';
import { BaselineFormComponent } from '../components/baseline-form/baseline-form.component';
import { BaselineHistoryDialogComponent, type BaselineHistoryDialogData } from '../components/baseline-history-dialog/baseline-history-dialog.component';
import { SensorSearchComponent } from '../components/sensor-search/sensor-search.component';

/** Save confirmations: bottom left, with Undo, for 8 seconds. */
const SNACK_BAR: MatSnackBarConfig = { duration: 8000, horizontalPosition: 'start', verticalPosition: 'bottom' };

/** Dialogs fit the window, up to the width the baseline table needs. */
const DIALOG_WIDTH = 'min(1240px, calc(100vw - 48px))';

/**
 * Baseline modifications and review: search for a sensor, see its current
 * baseline, and edit it or start a new one (confirmed in a dialog). View report
 * shows the sensor's baseline history.
 */
@Component({
  selector: 'app-baseline-page',
  imports: [MatProgressBarModule, BaselineFormComponent, DetailRowComponent, PanelSectionComponent, SensorSearchComponent, SidePanelComponent],
  providers: [BaselineStore],
  templateUrl: './baseline-page.component.html',
  styleUrl: './baseline-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaselinePageComponent {
  protected readonly store = inject(BaselineStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly date = formatDate;
  protected readonly temp = formatTemp;
  protected readonly lowerLimit = lowerLimit;
  protected readonly upperLimit = upperLimit;

  constructor() {
    void this.store.loadSensors();
  }

  protected viewReport(): void {
    const sensorId = this.store.selectedId();
    if (!sensorId) return;
    this.dialog.open<BaselineHistoryDialogComponent, BaselineHistoryDialogData>(BaselineHistoryDialogComponent, {
      data: { sensorId, history: this.store.history() },
      width: DIALOG_WIDTH,
      maxWidth: DIALOG_WIDTH,
      autoFocus: 'dialog',
    });
  }

  /** Submit: confirm, then save and say so. */
  protected async submit(values: BaselineValues): Promise<void> {
    const sensorId = this.store.selectedId();
    const current = this.store.current();
    if (!sensorId || !current) return;
    const mode = this.store.mode();
    const ref = this.dialog.open<BaselineConfirmDialogComponent, BaselineConfirmDialogData, boolean>(BaselineConfirmDialogComponent, {
      data: { sensorId, mode, current, values },
      width: DIALOG_WIDTH,
      maxWidth: DIALOG_WIDTH,
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;
    const undo = await this.store.save(values);
    if (!undo) return;
    const message = mode === 'new' ? `New baseline saved for ${sensorId}` : `Baseline updated for ${sensorId}`;
    this.snackBar
      .open(message, 'Undo', SNACK_BAR)
      .onAction()
      .subscribe(async () => {
        await this.store.undo(undo);
        this.snackBar.open(`Baseline change undone for ${sensorId}`, undefined, SNACK_BAR);
      });
  }
}
