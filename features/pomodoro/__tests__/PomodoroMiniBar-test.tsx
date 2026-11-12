import { fireEvent, render } from '@testing-library/react-native';
import PomodoroMiniBar from '@/features/pomodoro/components/PomodoroMiniBar';
import { strings } from '@/shared/lib/strings';

jest.mock('lucide-react-native', () => ({
  AlarmClock: () => null,
  Pause: () => null,
  Play: () => null,
  X: () => null,
}));
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, G: () => null, Path: () => null }));
jest.mock('@/features/pomodoro/pomodoroAlarm', () => ({
  playPomodoroAlarm: jest.fn().mockResolvedValue(undefined),
  stopPomodoroAlarm: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/shared/ui/AppModal', () => ({
  __esModule: true,
  default: ({ visible, children }: any) => (visible ? children : null),
}));

let mockMode: 'countdown' | 'countup' = 'countdown';
jest.mock('@/core/auth/AuthContext', () => ({
  useAuth: () => ({ user: { settings: { pomodoroMode: mockMode } } }),
}));
const mockPause = jest.fn().mockResolvedValue(undefined);
const mockResume = jest.fn().mockResolvedValue(undefined);
const mockEnd = jest.fn().mockResolvedValue(undefined);
let mockActive: any = null;
let mockElapsed = 300;

jest.mock('@/features/pomodoro/PomodoroContext', () => ({
  usePomodoroState: () => ({ activePomo: mockActive }),
  usePomodoroActions: () => ({
    pausePomo: mockPause,
    resumePomo: mockResume,
    endPomo: mockEnd,
    getElapsedSeconds: () => mockElapsed,
  }),
}));
jest.mock('@/features/tasks/TasksContext', () => ({
  useTasksState: () => ({ activeTasks: [{ id: 7, title: 'Write report' }] }),
}));
jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = require('@/shared/constants/theme');
  return { useTheme: () => ({ colors: lightColors, isDark: false }) };
});

const pomo = (over = {}) => ({ id: 1, taskId: 7, duration: 1500, pausedAt: null, ...over });

describe('PomodoroMiniBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElapsed = 300;
    mockMode = 'countdown';
  });

  it('renders nothing without an active session', async () => {
    mockActive = null;
    const { queryByLabelText } = await render(<PomodoroMiniBar onOpen={jest.fn()} />);
    expect(queryByLabelText(strings.pomodoro.openFullscreen)).toBeNull();
  });

  it('shows remaining time and opens fullscreen on press', async () => {
    mockActive = pomo();
    const onOpen = jest.fn();
    const { getByText, getByLabelText } = await render(<PomodoroMiniBar onOpen={onOpen} />);
    expect(getByText('20:00')).toBeTruthy();
    expect(getByText('Write report')).toBeTruthy();
    await fireEvent.press(getByLabelText(strings.pomodoro.openFullscreen));
    expect(onOpen).toHaveBeenCalled();
  });

  it('pauses and cancels the session', async () => {
    mockActive = pomo();
    const { getByLabelText } = await render(<PomodoroMiniBar onOpen={jest.fn()} />);
    await fireEvent.press(getByLabelText(strings.pomodoro.pause));
    expect(mockPause).toHaveBeenCalled();
    await fireEvent.press(getByLabelText(strings.pomodoro.endPomodoro));
    expect(mockEnd).toHaveBeenCalledWith('Write report');
  });

  it('resumes a paused session', async () => {
    mockActive = pomo({ pausedAt: new Date().toISOString() });
    const { getByLabelText } = await render(<PomodoroMiniBar onOpen={jest.fn()} />);
    await fireEvent.press(getByLabelText(strings.pomodoro.resume));
    expect(mockResume).toHaveBeenCalled();
  });

  it('counts up from zero and never rings in count-up mode', async () => {
    mockActive = pomo();
    mockMode = 'countup';
    mockElapsed = 1600;
    const { getByText, queryByText } = await render(<PomodoroMiniBar onOpen={jest.fn()} />);
    expect(getByText('26:40')).toBeTruthy();
    expect(mockPause).not.toHaveBeenCalled();
    expect(queryByText(strings.pomodoro.finished)).toBeNull();
  });

  it('pauses and raises the alarm when time is up, even while hidden', async () => {
    mockActive = pomo();
    mockElapsed = 1500;
    const { getByText, queryByLabelText } = await render(<PomodoroMiniBar onOpen={jest.fn()} hidden />);
    expect(queryByLabelText(strings.pomodoro.openFullscreen)).toBeNull();
    expect(mockPause).toHaveBeenCalled();
    expect(getByText(strings.pomodoro.finished)).toBeTruthy();
  });
});
