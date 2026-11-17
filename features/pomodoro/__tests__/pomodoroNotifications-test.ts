import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  cancelPomodoroEndNotification,
  dismissPomodoroEndNotification,
  requestPomodoroNotificationPermission,
  schedulePomodoroEndNotification,
} from '@/features/pomodoro/lib/notifications/index.native';
import { strings } from '@/shared/lib/strings';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('pomodoro-end'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/shared/lib/logger', () => ({ logger: { warn: jest.fn() } }));
jest.mock('@/shared/lib/platform', () => ({ isAndroid: true }));

const mocked = Notifications as unknown as Record<string, jest.Mock>;
// Installed when the module loads, before `beforeEach` clears the mock records.
const handler = mocked.setNotificationHandler.mock.calls[0][0];

beforeEach(() => jest.clearAllMocks());

it('sets up once and schedules a date notification with a fixed id', async () => {
  await schedulePomodoroEndNotification(1_000_000);
  expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
    'pomodoro',
    expect.objectContaining({ sound: 'pomodoro_alarm.wav' })
  );
  // While the app is in front the in-app alarm rings instead.
  const setState = (state: string) =>
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: state });
  setState('active');
  await expect(handler.handleNotification({})).resolves.toMatchObject({
    shouldShowBanner: false,
    shouldPlaySound: false,
  });
  setState('background');
  await expect(handler.handleNotification({})).resolves.toMatchObject({
    shouldShowBanner: true,
    shouldPlaySound: true,
  });
  expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
    identifier: 'pomodoro-end',
    content: expect.objectContaining({
      title: strings.pomodoro.notificationTitle,
      body: strings.pomodoro.notificationBody,
    }),
    trigger: { type: 'date', date: 1_000_000, channelId: 'pomodoro' },
  });
});

it('asks for permission only when it can still be asked', async () => {
  mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: true });
  await requestPomodoroNotificationPermission();
  expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);

  mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: false });
  await requestPomodoroNotificationPermission();
  mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: true, canAskAgain: true });
  await requestPomodoroNotificationPermission();
  expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
});

it('cancels the scheduled request and dismisses the shown one separately', async () => {
  await cancelPomodoroEndNotification();
  expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('pomodoro-end');
  expect(mocked.dismissNotificationAsync).not.toHaveBeenCalled();
  await dismissPomodoroEndNotification();
  expect(mocked.dismissNotificationAsync).toHaveBeenCalledWith('pomodoro-end');
});

it('runs operations in call order, so a quick cancel cannot overtake a schedule', async () => {
  const order: string[] = [];
  mocked.scheduleNotificationAsync.mockImplementationOnce(async () => {
    await new Promise((r) => setTimeout(r, 10));
    order.push('schedule');
  });
  mocked.cancelScheduledNotificationAsync.mockImplementationOnce(async () => {
    order.push('cancel');
  });
  const scheduled = schedulePomodoroEndNotification(1);
  await cancelPomodoroEndNotification();
  await scheduled;
  expect(order).toEqual(['schedule', 'cancel']);
});

it('keeps working after a failed operation', async () => {
  mocked.scheduleNotificationAsync.mockRejectedValueOnce(new Error('boom'));
  await schedulePomodoroEndNotification(1);
  await cancelPomodoroEndNotification();
  expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalled();
});

it('never throws when the native module fails', async () => {
  mocked.scheduleNotificationAsync.mockRejectedValueOnce(new Error('boom'));
  await expect(schedulePomodoroEndNotification(1)).resolves.toBeUndefined();
});
