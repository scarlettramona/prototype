import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LayoutShellComponent } from './app/layout/layout-shell.component';

@Component({
  selector: 'app-root',
  imports: [LayoutShellComponent],
  template: '<app-layout-shell />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
