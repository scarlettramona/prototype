import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PageComponent } from '../../../../../../ui/patterns/page/page.component';
import { OverlaysDialogComponent } from './overlays-dialog.component';

/** Kitchen-sink page: dialog and snack-bar. */
@Component({
  selector: 'app-ks-overlays-page',
  imports: [PageComponent, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './overlays-page.component.html',
  styleUrl: './overlays-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlaysPageComponent {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  openDialog(): void {
    this.dialog.open(OverlaysDialogComponent);
  }

  openSnackBar(message: string, action: string): void {
    this.snackBar.open(message, action);
  }
}
