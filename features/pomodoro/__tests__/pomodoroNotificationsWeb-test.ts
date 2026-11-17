import {
  cancelPomodoroEndNotification,
  dismissPomodoroEndNotification,
  requestPomodoroNotificationPermission,
  schedulePomodoroEndNotification,
} from '@/features/pomodoro/lib/notifications/index.web';
import { strings } from '@/shared/lib/strings';

jest.mock('@/shared/lib/logger', () => ({ logger: { warn: jest.fn() } }));

const g = globalThis as any;
const showNotification = jest.fn().mockResolvedValue(undefined);
const close = jest.fn();
const getNotifications = jest.fn().mockResolvedValue([{ close }]);
const requestPermission = jest.fn().mockResolvedValue('granted');
const saved = { window: g.window, document: g.document, Notification: g.Notification };
const savedSw = Object.getOwnPropertyDescriptor(g.navigator ?? {}, 'serviceWorker');

beforeAll(() => {
  g.Notification = { permission: 'granted', requestPermission };
  g.window = { Notification: g.Notification };
  g.document = { visibilityState: 'hidden', hasFocus: () => g.document.focused };
  Object.defineProperty(g.navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: async () => ({ active: {}, showNotification, getNotifications }),
    },
  });
});

afterAll(() => {
  g.window = saved.window;
  g.document = saved.document;
  g.Notification = saved.Notification;
  if (savedSw) Object.defineProperty(g.navigator, 'serviceWorker', savedSw);
  else delete g.navigator.serviceWorker;
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  g.document.visibilityState = 'hidden';
  g.document.focused = false;
  g.Notification.permission = 'granted';
});

afterEach(() => jest.useRealTimers());

it('shows the notification through the service worker when the end time comes', async () => {
  await schedulePomodoroEndNotification(Date.now() + 5000);
  await jest.advanceTimersByTimeAsync(4999);
  expect(showNotification).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(showNotification).toHaveBeenCalledWith(
    strings.pomodoro.notificationTitle,
    expect.objectContaining({ body: strings.pomodoro.notificationBody, tag: 'pomodoro-end' })
  );
});

it('stays quiet while the page is visible and focused (the in-app alarm rings)', async () => {
  g.document.visibilityState = 'visible';
  g.document.focused = true;
  await schedulePomodoroEndNotification(Date.now() + 1000);
  await jest.advanceTimersByTimeAsync(1000);
  expect(showNotification).not.toHaveBeenCalled();
});

it('still notifies a visible window that is not focused', async () => {
  g.document.visibilityState = 'visible';
  await schedulePomodoroEndNotification(Date.now() + 1000);
  await jest.advanceTimersByTimeAsync(1000);
  expect(showNotification).toHaveBeenCalled();
});

it('replaces and cancels the pending timer', async () => {
  await schedulePomodoroEndNotification(Date.now() + 1000);
  await schedulePomodoroEndNotification(Date.now() + 3000);
  await jest.advanceTimersByTimeAsync(1000);
  expect(showNotification).not.toHaveBeenCalled();
  await cancelPomodoroEndNotification();
  await jest.advanceTimersByTimeAsync(5000);
  expect(showNotification).not.toHaveBeenCalled();
});

it('closes a shown notification on dismiss', async () => {
  await dismissPomodoroEndNotification();
  expect(getNotifications).toHaveBeenCalledWith({ tag: 'pomodoro-end' });
  expect(close).toHaveBeenCalled();
});

it('asks for permission only when it was never asked', async () => {
  await requestPomodoroNotificationPermission();
  expect(requestPermission).not.toHaveBeenCalled();
  g.Notification.permission = 'default';
  await requestPomodoroNotificationPermission();
  expect(requestPermission).toHaveBeenCalledTimes(1);
});
