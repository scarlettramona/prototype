import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Toast, TOAST_CONFIG, ToastConfig } from './toast.models';
import { NOTIFICATION_STATUS_CONFIG } from '../notification.models';

// Must match --transition-slow / --transition-normal-slow in toast.component.scss.
const ENTER_ANIMATION_MS = 350;
const EXIT_ANIMATION_MS = 300;

@Component({
  selector: 'lib-toast',
  imports: [MatIconModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent implements OnInit, OnDestroy {
  private readonly config = inject<ToastConfig>(TOAST_CONFIG);

  readonly toast = input.required<Toast>();
  readonly dismissed = output<string>();

  readonly animationState = signal<'entering' | 'visible' | 'exiting'>('entering');
  readonly showTimestamps = signal(false);

  private remainingMs = 0;
  private timerStartedAt = 0;
  private hovered = false;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
  private entryTimeout: ReturnType<typeof setTimeout> | null = null;
  private exitTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.showTimestamps.set(this.config.showTimestamps);

    this.entryTimeout = setTimeout(() => {
      this.animationState.set('visible');
      if (this.toast().autoDismiss) {
        this.remainingMs = this.toast().dismissAfterMs;
        if (!this.hovered) {
          this.armDismissTimer();
        }
      }
    }, ENTER_ANIMATION_MS);
  }

  ngOnDestroy(): void {
    this.clearDismissTimer();
    if (this.entryTimeout) {
      clearTimeout(this.entryTimeout);
    }
    if (this.exitTimeout) {
      clearTimeout(this.exitTimeout);
    }
  }

  get statusIcon(): string {
    return NOTIFICATION_STATUS_CONFIG[this.toast().status].icon;
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onMouseEnter(): void {
    if (!this.toast().autoDismiss || this.animationState() === 'exiting') {
      return;
    }
    this.hovered = true;
    if (this.dismissTimer != null) {
      this.remainingMs = Math.max(0, this.remainingMs - (performance.now() - this.timerStartedAt));
      this.clearDismissTimer();
    }
  }

  onMouseLeave(): void {
    if (!this.toast().autoDismiss || this.animationState() === 'exiting') {
      return;
    }
    this.hovered = false;
    if (this.animationState() === 'visible') {
      this.armDismissTimer();
    }
  }

  close(): void {
    // Idempotent: ensures `dismissed` is emitted exactly once.
    if (this.animationState() === 'exiting') {
      return;
    }
    this.clearDismissTimer();
    this.animationState.set('exiting');
    this.exitTimeout = setTimeout(() => {
      this.dismissed.emit(this.toast().id);
    }, EXIT_ANIMATION_MS);
  }

  private armDismissTimer(): void {
    this.clearDismissTimer();
    this.timerStartedAt = performance.now();
    this.dismissTimer = setTimeout(() => this.close(), this.remainingMs);
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer != null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }
}
