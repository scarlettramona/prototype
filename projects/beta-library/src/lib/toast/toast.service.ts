import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Toast, TOAST_CONFIG, ToastOptions } from './toast.models';
import type { NotificationStatus } from '../notification.models';

let nextId = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly config = inject(TOAST_CONFIG);
  private readonly toastsSubject = new BehaviorSubject<Toast[]>([]);

  readonly allToasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  readonly activeToasts$: Observable<Toast[]> = this.toastsSubject.pipe(
    map((toasts) => {
      const active = toasts.filter((t) => !t.dismissed);
      const maxVisible = this.config.maxVisibleToasts;
      if (maxVisible != null && active.length > maxVisible) {
        return active.slice(0, maxVisible);
      }
      return active;
    }),
  );

  readonly unreadCount$: Observable<number> = this.toastsSubject.pipe(
    map((toasts) => toasts.filter((t) => !t.read).length),
  );

  info(message: string, options?: Partial<ToastOptions>): string {
    return this.createToast('info', message, options);
  }

  success(message: string, options?: Partial<ToastOptions>): string {
    return this.createToast('success', message, options);
  }

  warning(message: string, options?: Partial<ToastOptions>): string {
    return this.createToast('warning', message, options);
  }

  error(message: string, options?: Partial<ToastOptions>): string {
    return this.createToast('error', message, options);
  }

  dismiss(id: string): void {
    const toasts = this.toastsSubject.value.map((t) => (t.id === id ? { ...t, dismissed: true } : t));
    this.toastsSubject.next(toasts);
  }

  clearAll(): void {
    const toasts = this.toastsSubject.value.map((t) => (t.dismissed ? t : { ...t, dismissed: true }));
    this.toastsSubject.next(toasts);
  }

  clearHistory(): void {
    this.toastsSubject.next([]);
  }

  markAsRead(id: string): void {
    const toasts = this.toastsSubject.value.map((t) => (t.id === id ? { ...t, read: true } : t));
    this.toastsSubject.next(toasts);
  }

  markAllRead(): void {
    const toasts = this.toastsSubject.value.map((t) => (t.read ? t : { ...t, read: true }));
    this.toastsSubject.next(toasts);
  }

  private createToast(status: NotificationStatus, message: string, options?: Partial<ToastOptions>): string {
    const id = `toast-${++nextId}`;
    const toast: Toast = {
      id,
      status,
      message,
      timestamp: Date.now(),
      autoDismiss: options?.autoDismiss ?? this.config.defaultAutoDismiss,
      dismissAfterMs: options?.dismissAfterMs ?? this.config.defaultDismissMs,
      dismissed: false,
      read: false,
    };
    this.toastsSubject.next([toast, ...this.toastsSubject.value]);
    return id;
  }
}
