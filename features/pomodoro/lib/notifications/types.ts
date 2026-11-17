/**
 * - `granted`: notifications will be shown.
 * - `default`: never asked (or the prompt was dismissed); asking may show the prompt.
 * - `denied`: blocked; only the browser / system settings can turn them back on.
 * - `unsupported`: this browser has no notifications (or the page is not a secure context).
 */
export type NotificationPermissionState = 'granted' | 'default' | 'denied' | 'unsupported';
