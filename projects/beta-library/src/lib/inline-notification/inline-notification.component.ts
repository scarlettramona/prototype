import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NOTIFICATION_STATUS_CONFIG, NotificationStatus } from '../notification.models';

// keep in sync with the `inline-exit-fade` animation in the SCSS (200ms).
const EXIT_ANIMATION_MS = 200;

@Component({
  selector: 'lib-inline-notification',
  imports: [MatIconModule],
  templateUrl: './inline-notification.component.html',
  styleUrl: './inline-notification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineNotificationComponent {
  readonly status = input.required<NotificationStatus>();
  readonly message = input.required<string>();
  readonly title = input<string | undefined>(undefined);
  readonly dismissible = input(true);
  readonly actionLabel = input<string | undefined>(undefined);

  readonly dismissed = output<void>();
  readonly actionClicked = output<void>();

  readonly visible = signal(true);
  readonly animatingOut = signal(false);

  get statusIcon(): string {
    return NOTIFICATION_STATUS_CONFIG[this.status()].icon;
  }

  dismiss(): void {
    this.animatingOut.set(true);
    setTimeout(() => {
      this.visible.set(false);
      this.dismissed.emit();
    }, EXIT_ANIMATION_MS);
  }

  onAction(): void {
    this.actionClicked.emit();
  }
}
