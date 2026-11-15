import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NOTIFICATION_STATUS_CONFIG } from '../notification.models';

export type CalloutStatus = 'info' | 'warning';

@Component({
  selector: 'lib-callout',
  imports: [MatIconModule],
  templateUrl: './callout.component.html',
  styleUrl: './callout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalloutComponent {
  readonly status = input<CalloutStatus>('info');
  readonly message = input.required<string>();
  readonly title = input<string | undefined>(undefined);

  get statusIcon(): string {
    return NOTIFICATION_STATUS_CONFIG[this.status()].icon;
  }
}
