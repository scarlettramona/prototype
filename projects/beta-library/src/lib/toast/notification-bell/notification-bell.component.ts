import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../toast.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';

@Component({
  selector: 'lib-notification-bell',
  imports: [AsyncPipe, MatBadgeModule, MatButtonModule, MatIconModule, NotificationPanelComponent],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent {
  private readonly toastService = inject(ToastService);
  readonly unreadCount$ = this.toastService.unreadCount$;
  readonly isPanelOpen = signal(false);

  togglePanel(): void {
    this.setPanel(!this.isPanelOpen());
  }

  closePanel(): void {
    this.setPanel(false);
  }

  formatBadge(count: number): string {
    if (count === 0) {
      return '';
    }
    return count > 9 ? '9+' : `${count}`;
  }

  private setPanel(open: boolean): void {
    if (open === this.isPanelOpen()) {
      return;
    }
    this.isPanelOpen.set(open);
    if (!open) {
      this.toastService.markAllRead();
    }
  }
}
