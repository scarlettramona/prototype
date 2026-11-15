import { InjectionToken } from '@angular/core';
import { NotificationStatus } from '../notification.models';

export type { NotificationStatus };

export type ToastOptions = {
  autoDismiss: boolean;
  dismissAfterMs: number;
};

export type Toast = {
  id: string;
  status: NotificationStatus;
  message: string;
  timestamp: number;
  autoDismiss: boolean;
  dismissAfterMs: number;
  dismissed: boolean;
  read: boolean;
};

export type ToastConfig = {
  showTimestamps: boolean;
  defaultDismissMs: number;
  defaultAutoDismiss: boolean;
  maxVisibleToasts: number | null;
};

export const DEFAULT_TOAST_CONFIG: ToastConfig = {
  showTimestamps: true,
  defaultDismissMs: 5000,
  defaultAutoDismiss: true,
  maxVisibleToasts: 5,
};

export const TOAST_CONFIG = new InjectionToken<ToastConfig>('TOAST_CONFIG', {
  providedIn: 'root',
  factory: (): ToastConfig => DEFAULT_TOAST_CONFIG,
});
