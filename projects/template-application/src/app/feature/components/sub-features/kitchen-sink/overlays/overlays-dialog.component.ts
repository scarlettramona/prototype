import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';

/** Dialog content shown by the overlays kitchen-sink page. */
@Component({
  selector: 'app-ks-overlays-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule],
  templateUrl: './overlays-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlaysDialogComponent {}
