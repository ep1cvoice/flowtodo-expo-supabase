import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PomodoroScreen from '@/features/pomodoro/components/PomodoroScreen';
import { strings } from '@/shared/lib/strings';

const mockUpdateProfile = jest.fn();
const mockShowToast = jest.fn();
const mockNavigate = jest.fn();

jest.mock('lucide-react-native', () => ({ ChevronRight: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));

jest.mock('@/core/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { settings: { pomodoroTime: 30, pomodoroMode: 'countdown' } },
    updateProfile: mockUpdateProfile,
  }),
}));
jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));
jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = jest.requireActual<typeof import('@/shared/constants/theme')>(
    '@/shared/constants/theme'
  );
  return { useTheme: () => ({ colors: lightColors, isDark: false }) };
});
jest.mock(
  '@/shared/ui/ScreenBackground',
  () =>
    ({ children }: { children?: React.ReactNode }) =>
      children
);
jest.mock('@/features/pomodoro/components/ActiveSessionCard', () => () => null);
jest.mock('@/features/pomodoro/components/PomodoroStats', () => () => null);
jest.mock('@/features/pomodoro/components/PomodoroHistory', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return function PomodoroHistoryStub() {
    return <Text>history-stub</Text>;
  };
});

describe('PomodoroScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('breadcrumb links back to settings', async () => {
    const { getByText } = await render(<PomodoroScreen />);
    await fireEvent.press(getByText(strings.nav.settings));
    expect(mockNavigate).toHaveBeenCalledWith('/(main)/(tabs)/settings');
  });

  it('shows the saved duration and the history', async () => {
    const { getByDisplayValue, getByText } = await render(<PomodoroScreen />);
    expect(getByDisplayValue('30')).toBeTruthy();
    expect(getByText('history-stub')).toBeTruthy();
  });

  it('rejects out-of-range values without saving', async () => {
    const { getByDisplayValue, getByText } = await render(<PomodoroScreen />);
    await fireEvent.changeText(getByDisplayValue('30'), '99');
    await fireEvent.press(getByText(strings.pomodoro.setTime));
    expect(getByText(strings.pomodoro.timeRange)).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('saves a valid value and shows a toast', async () => {
    mockUpdateProfile.mockResolvedValue({ error: null });
    const { getByDisplayValue, getByText } = await render(<PomodoroScreen />);
    await fireEvent.changeText(getByDisplayValue('30'), '45');
    await fireEvent.press(getByText(strings.pomodoro.setTime));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ pomodoroTime: 45 }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(strings.pomodoro.timeSaved));
  });

  it('switches the timer mode and saves it', async () => {
    mockUpdateProfile.mockResolvedValue({ error: null });
    const { getByLabelText } = await render(<PomodoroScreen />);
    await fireEvent.press(getByLabelText(strings.pomodoro.modeCountup));
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({ pomodoroMode: 'countup' })
    );
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(strings.pomodoro.modeSaved));
  });

  it('does not save when the current mode is pressed again', async () => {
    const { getByLabelText } = await render(<PomodoroScreen />);
    await fireEvent.press(getByLabelText(strings.pomodoro.modeCountdown));
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('shows an error toast when saving fails', async () => {
    mockUpdateProfile.mockResolvedValue({ error: 'boom' });
    const { getByText } = await render(<PomodoroScreen />);
    await fireEvent.press(getByText(strings.pomodoro.setTime));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(expect.anything(), 'error'));
  });
});
