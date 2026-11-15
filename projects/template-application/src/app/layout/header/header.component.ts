import { ChangeDetectionStrategy, Component, isDevMode } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationBellComponent } from 'beta-library';
import { APP_PATHS } from '../../core/routing/app-paths';
import { StateMenuComponent } from '../../ui/patterns/state-menu/state-menu.component';
import { ThemeButtonComponent } from '../../ui/patterns/theme-button/theme-button.component';

interface NavItem {
  label: string;
  /** Absent for modules this prototype doesn't build (shown, not navigable). */
  path?: string;
}

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    ThemeButtonComponent,
    NotificationBellComponent,
    StateMenuComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly isDev = isDevMode();

  protected readonly navItems: NavItem[] = [
    { label: 'ILL', path: `/${APP_PATHS.ill}` },
    { label: 'VNV', path: `/${APP_PATHS.vnv}` },
    { label: 'Baseline' },
  ];
}
