import { AppState } from 'react-native';
import {
  AndroidImportance,
  cancelScheduledNotificationAsync,
  dismissNotificationAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { isAndroid } from '@/shared/lib/platform';
import { strings } from '@/shared/lib/strings';
import { logger } from '@/shared/lib/logger';
import type { NotificationPermissionState } from '@/features/pomodoro/lib/notifications/types';

const NOTIFICATION_ID = 'pomodoro-end';
const CHANNEL_ID = 'pomodoro';
// Bundled through the expo-notifications config plugin `sounds` option (app.json). Android
// raw resource names allow only [a-z0-9_], so the file name must stay in that form.
const SOUND = 'pomodoro_alarm.wav';

// Set when the module loads, so it is in place before any notification can arrive in this
// process. While the app is open the in-app alarm (modal + sound) takes over, so the system
// notification is only presented when the app is not active.
setNotificationHandler({
  handleNotification: async () => {
    const show = AppState.currentState !== 'active';
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      shouldSetBadge: false,
    };
  },
});

let channel: Promise<unknown> | null = null;

function ensureChannel(): Promise<unknown> {
  if (!isAndroid) return Promise.resolve();
  channel ??= setNotificationChannelAsync(CHANNEL_ID, {
    name: strings.pomodoro.notificationChannel,
    importance: AndroidImportance.HIGH,
    sound: SOUND,
    vibrationPattern: [0, 500, 250, 500],
  }).catch((err) => {
    channel = null;
    throw err;
  });
  return channel;
}

// Native calls are asynchronous, so a cancel issued right after a schedule (start, then an
// immediate pause) could otherwise overtake it and leave a notification for a paused session.
// Every operation runs after the previous one has settled.
let queue: Promise<void> = Promise.resolve();

function enqueue(label: string, op: () => Promise<unknown>): Promise<void> {
  const run = queue.then(op).then(
    () => undefined,
    (err) => {
      logger.warn(`Failed to ${label} pomodoro notification:`, (err as Error)?.message ?? err);
    }
  );
  queue = run;
  return run;
}

const toState = (p: { granted: boolean; canAskAgain: boolean }): NotificationPermissionState =>
  p.granted ? 'granted' : p.canAskAgain ? 'default' : 'denied';

export async function getPomodoroNotificationPermission(): Promise<NotificationPermissionState> {
  try {
    return toState(await getPermissionsAsync());
  } catch (err) {
    logger.warn('Failed to read notification permission:', (err as Error)?.message ?? err);
    return 'unsupported';
  }
}

export async function requestPomodoroNotificationPermission(): Promise<NotificationPermissionState> {
  let state: NotificationPermissionState = 'unsupported';
  await enqueue('request permission for', async () => {
    await ensureChannel();
    const current = await getPermissionsAsync();
    state = toState(current);
    if (state !== 'default') return;
    state = toState(await requestPermissionsAsync());
  });
  return state;
}

export function schedulePomodoroEndNotification(fireAt: number): Promise<void> {
  return enqueue('schedule', async () => {
    await ensureChannel();
    // Scheduling with an existing identifier replaces that request.
    await scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: strings.pomodoro.notificationTitle,
        body: strings.pomodoro.notificationBody,
        sound: SOUND,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: CHANNEL_ID,
      },
    });
  });
}

export function cancelPomodoroEndNotification(): Promise<void> {
  return enqueue('cancel', () => cancelScheduledNotificationAsync(NOTIFICATION_ID));
}

export function dismissPomodoroEndNotification(): Promise<void> {
  return enqueue('dismiss', () => dismissNotificationAsync(NOTIFICATION_ID));
}
