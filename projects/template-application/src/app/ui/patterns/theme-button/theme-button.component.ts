import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeMode, ThemeService } from '../../../core/theme/theme.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-theme-button',
  templateUrl: './theme-button.component.html',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeButtonComponent {
  private readonly themeService = inject(ThemeService);

  readonly themeSelected = this.themeService.themeSelected;
  readonly ThemeMode = ThemeMode;

  toggleTheme(): void {
    const next = this.themeSelected() === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK;
    this.themeService.setTheme(next);
  }
}
