import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ToastContainerComponent } from 'beta-library';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { SidenavComponent } from './sidenav/sidenav.component';

/** Header + collapsible sidenav + routed content + footer. */
@Component({
  selector: 'app-layout-shell',
  imports: [
    RouterOutlet,
    MatSidenavModule,
    HeaderComponent,
    FooterComponent,
    SidenavComponent,
    ToastContainerComponent,
  ],
  templateUrl: './layout-shell.component.html',
  styleUrl: './layout-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutShellComponent {
  readonly isNavOpen = signal(true);

  toggleNav(): void {
    this.isNavOpen.update((open) => !open);
  }
}
