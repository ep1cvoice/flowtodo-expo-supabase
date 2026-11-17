import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PomodoroNotificationSettings from '@/features/pomodoro/components/PomodoroNotificationSettings';
import {
  getPomodoroNotificationPermission,
  requestPomodoroNotificationPermission,
} from '@/features/pomodoro/lib/notifications';
import { strings } from '@/shared/lib/strings';

jest.mock('@/features/pomodoro/lib/notifications', () => ({
  getPomodoroNotificationPermission: jest.fn(),
  requestPomodoroNotificationPermission: jest.fn(),
}));
let mockIsWeb = true;
jest.mock('@/shared/lib/platform', () => {
  const actual =
    jest.requireActual<typeof import('@/shared/lib/platform')>('@/shared/lib/platform');
  // A real getter (a spread would copy the value once, before the test sets it).
  return Object.defineProperty({ ...actual }, 'isWeb', { get: () => mockIsWeb });
});
jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = jest.requireActual<typeof import('@/shared/constants/theme')>(
    '@/shared/constants/theme'
  );
  return { useTheme: () => ({ colors: lightColors, isDark: false }) };
});

const getPermission = getPomodoroNotificationPermission as jest.Mock;
const requestPermission = requestPomodoroNotificationPermission as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockIsWeb = true;
});

it('asks for permission from the button and shows the result', async () => {
  getPermission.mockResolvedValue('default');
  requestPermission.mockResolvedValue('granted');
  const { findByText, getByText } = await render(<PomodoroNotificationSettings />);
  await fireEvent.press(await findByText(strings.pomodoro.notificationsEnable));
  expect(requestPermission).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(getByText(strings.pomodoro.notificationsOn)).toBeTruthy());
});

it('explains a prompt the browser did not show', async () => {
  getPermission.mockResolvedValue('default');
  requestPermission.mockResolvedValue('default');
  const { findByText } = await render(<PomodoroNotificationSettings />);
  await fireEvent.press(await findByText(strings.pomodoro.notificationsEnable));
  expect(await findByText(strings.pomodoro.notificationsNoPrompt)).toBeTruthy();
});

it('explains how to unblock on web, without a button', async () => {
  getPermission.mockResolvedValue('denied');
  const { findByText, queryByRole } = await render(<PomodoroNotificationSettings />);
  expect(await findByText(strings.pomodoro.notificationsBlockedWeb)).toBeTruthy();
  expect(queryByRole('button')).toBeNull();
});

it('opens the system settings when blocked on native', async () => {
  mockIsWeb = false;
  getPermission.mockResolvedValue('denied');
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  const { findByText } = await render(<PomodoroNotificationSettings />);
  await fireEvent.press(await findByText(strings.pomodoro.notificationsOpenSettings));
  expect(openSettings).toHaveBeenCalled();
});

it('says so when the browser has no notifications', async () => {
  getPermission.mockResolvedValue('unsupported');
  const { findByText } = await render(<PomodoroNotificationSettings />);
  expect(await findByText(strings.pomodoro.notificationsUnsupported)).toBeTruthy();
});
