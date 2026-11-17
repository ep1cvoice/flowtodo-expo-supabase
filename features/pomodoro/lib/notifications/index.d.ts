// End-of-session system notification. Implemented per platform:
// - native (index.native.ts): a local notification scheduled with expo-notifications, so it
//   fires even while the app is suspended or killed.
// - web (index.web.ts): the Notification API through the service worker, fired by a timer in
//   the page (browsers have no scheduled local notifications).

import type { NotificationPermissionState } from '@/features/pomodoro/lib/notifications/types';
export type { NotificationPermissionState };

export function getPomodoroNotificationPermission(): Promise<NotificationPermissionState>;

/**
 * Asks for notification permission if it can still be asked and resolves with the resulting
 * state. Call from a user gesture (browsers ignore requests outside one).
 */
export function requestPomodoroNotificationPermission(): Promise<NotificationPermissionState>;

/** Schedules the "session finished" notification at `fireAt` (ms epoch), replacing any other. */
export function schedulePomodoroEndNotification(fireAt: number): Promise<void>;

/** Cancels the scheduled notification (one already shown stays). */
export function cancelPomodoroEndNotification(): Promise<void>;

/** Removes the notification if it is already shown. */
export function dismissPomodoroEndNotification(): Promise<void>;
