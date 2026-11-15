export type NotificationStatus = 'info' | 'success' | 'warning' | 'error';

export const NOTIFICATION_STATUS_CONFIG: Record<NotificationStatus, { icon: string }> = {
  info: { icon: 'info' },
  success: { icon: 'check_circle' },
  warning: { icon: 'warning' },
  error: { icon: 'error' },
};
