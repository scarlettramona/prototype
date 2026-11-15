import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LayoutShellComponent } from './app/layout/layout-shell.component';

/**
 * Root component. Under the single-shell model it renders the one application
 * shell; routed features appear in the outlet the shell provides.
 */
@Component({
  selector: 'app-root',
  imports: [LayoutShellComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
