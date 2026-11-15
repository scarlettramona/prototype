import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from 'beta-library';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';

/** Header + routed content + footer. */
@Component({
  selector: 'app-layout-shell',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastContainerComponent],
  templateUrl: './layout-shell.component.html',
  styleUrl: './layout-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutShellComponent {}
