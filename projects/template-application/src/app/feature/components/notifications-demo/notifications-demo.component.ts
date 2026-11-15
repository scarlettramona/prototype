import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CalloutComponent, InlineNotificationComponent, type NotificationStatus, ToastService } from 'beta-library';

import { PageComponent } from '../../../ui/patterns/page/page.component';

@Component({
  selector: 'app-notifications-demo',
  imports: [PageComponent, InlineNotificationComponent, CalloutComponent, MatButtonModule, MatCheckboxModule],
  templateUrl: './notifications-demo.component.html',
  styleUrl: './notifications-demo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsDemoComponent {
  private readonly toasts = inject(ToastService);

  /** Drives the dismissible inline example so it can be re-created on restore. */
  readonly inlineVisible = signal(true);

  /** Whether fired toasts auto-dismiss; off => they persist until cleared. */
  readonly autoDismiss = signal(true);

  fireToast(status: NotificationStatus, message: string): void {
    const options = { autoDismiss: this.autoDismiss(), dismissAfterMs: 5000 };
    switch (status) {
      case 'info':
        this.toasts.info(message, options);
        break;
      case 'success':
        this.toasts.success(message, options);
        break;
      case 'warning':
        this.toasts.warning(message, options);
        break;
      case 'error':
        this.toasts.error(message, options);
        break;
    }
  }

  fireBurst(): void {
    const samples: readonly (readonly [NotificationStatus, string])[] = [
      ['info', 'Background job queued'],
      ['success', 'Record saved'],
      ['warning', 'API rate limit at 80%'],
      ['error', 'Failed to load records'],
      ['info', 'Sync started…'],
    ];
    for (const [status, message] of samples) {
      this.fireToast(status, message);
    }
  }

  clearAll(): void {
    this.toasts.clearAll();
  }

  onUndo(): void {
    this.toasts.success('Change reverted');
  }
}
