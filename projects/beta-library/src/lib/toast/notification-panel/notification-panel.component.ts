import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { AsyncPipe, UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../toast.service';

@Component({
  selector: 'lib-notification-panel',
  imports: [AsyncPipe, UpperCasePipe, MatButtonModule, MatIconModule],
  templateUrl: './notification-panel.component.html',
  styleUrl: './notification-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPanelComponent {
  private readonly toastService = inject(ToastService);
  readonly allToasts$ = this.toastService.allToasts$;
  readonly closed = output<void>();

  formatFullTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
    this.toastService.markAsRead(id);
  }

  clearAll(): void {
    this.toastService.clearHistory();
  }

  onOverlayClick(): void {
    this.closed.emit();
  }

  onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closed.emit();
    }
  }
}
