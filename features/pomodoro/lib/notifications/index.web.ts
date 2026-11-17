import { strings } from '@/shared/lib/strings';
import { logger } from '@/shared/lib/logger';

// Browsers cannot schedule local notifications, so a page timer fires it. A single (not
// chained) timeout in a hidden tab is only throttled to about one second, so it stays on
// time while the tab is in the background. iOS suspends the page entirely, so there the
// notification only appears once the PWA is reopened.
const TAG = 'pomodoro-end';
const ICON = '/apple-touch-icon.png';

let timer: ReturnType<typeof setTimeout> | null = null;

const supported = () => typeof window !== 'undefined' && 'Notification' in window;

async function serviceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  // `ready` never settles when no worker is registered (localhost), so only ask when one is.
  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.active ? registration : null;
}

async function show(): Promise<void> {
  if (!supported() || Notification.permission !== 'granted') return;
  // A page the user is looking at shows the in-app alarm instead. A visible but unfocused
  // window (another app on top on desktop) still gets the notification.
  if (document.visibilityState === 'visible' && document.hasFocus()) return;
  const options: NotificationOptions = {
    body: strings.pomodoro.notificationBody,
    tag: TAG,
    icon: ICON,
    requireInteraction: true,
  };
  try {
    const registration = await serviceWorker();
    // Mobile browsers only allow notifications created through a service worker.
    if (registration)
      await registration.showNotification(strings.pomodoro.notificationTitle, options);
    else new Notification(strings.pomodoro.notificationTitle, options);
  } catch (err) {
    logger.warn('Failed to show pomodoro notification:', (err as Error)?.message ?? err);
  }
}

export async function requestPomodoroNotificationPermission(): Promise<void> {
  if (!supported() || Notification.permission !== 'default') return;
  try {
    await Notification.requestPermission();
  } catch (err) {
    logger.warn('Failed to request notification permission:', (err as Error)?.message ?? err);
  }
}

export async function schedulePomodoroEndNotification(fireAt: number): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = setTimeout(
    () => {
      timer = null;
      void show();
    },
    Math.max(0, fireAt - Date.now())
  );
}

export async function cancelPomodoroEndNotification(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

export async function dismissPomodoroEndNotification(): Promise<void> {
  try {
    const registration = await serviceWorker();
    const shown = (await registration?.getNotifications({ tag: TAG })) ?? [];
    for (const notification of shown) notification.close();
  } catch (err) {
    logger.warn('Failed to close pomodoro notification:', (err as Error)?.message ?? err);
  }
}
