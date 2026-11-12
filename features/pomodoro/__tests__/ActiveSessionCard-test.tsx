import { fireEvent, render } from '@testing-library/react-native';
import ActiveSessionCard from '@/features/pomodoro/components/ActiveSessionCard';
import { strings } from '@/shared/lib/strings';

jest.mock('lucide-react-native', () => ({ Pause: () => null, Play: () => null, X: () => null }));
let mockMode: 'countdown' | 'countup' = 'countdown';
jest.mock('@/core/auth/AuthContext', () => ({
  useAuth: () => ({ user: { settings: { pomodoroMode: mockMode } } }),
}));
const mockPause = jest.fn().mockResolvedValue(undefined);
const mockResume = jest.fn().mockResolvedValue(undefined);
const mockEnd = jest.fn().mockResolvedValue(undefined);
let mockActive: any = null;

jest.mock('@/features/pomodoro/PomodoroContext', () => ({
  usePomodoroState: () => ({ activePomo: mockActive }),
  usePomodoroActions: () => ({
    pausePomo: mockPause,
    resumePomo: mockResume,
    endPomo: mockEnd,
    getElapsedSeconds: () => 300,
  }),
}));
jest.mock('@/features/tasks/TasksContext', () => ({
  useTasksState: () => ({ activeTasks: [{ id: 7, title: 'Write report' }] }),
}));
jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = require('@/shared/constants/theme');
  return { useTheme: () => ({ colors: lightColors, isDark: false }) };
});

const pomo = (over = {}) => ({
  id: 1,
  taskId: 7,
  startedAt: new Date().toISOString(),
  endedAt: null,
  duration: 1500,
  elapsed: 0,
  pausedAt: null,
  pausedOnLogout: false,
  ...over,
});

describe('ActiveSessionCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a hint when no session is running', async () => {
    mockActive = null;
    const { getByText } = await render(<ActiveSessionCard />);
    expect(getByText(strings.pomodoro.noActiveSession)).toBeTruthy();
  });

  it('shows task title and remaining time, and pauses / ends the session', async () => {
    mockActive = pomo();
    const { getByText, getByLabelText } = await render(<ActiveSessionCard />);
    expect(getByText('Write report')).toBeTruthy();
    expect(getByText('20:00')).toBeTruthy(); // 1500s - 300s
    await fireEvent.press(getByLabelText(strings.pomodoro.pause));
    expect(mockPause).toHaveBeenCalled();
    await fireEvent.press(getByLabelText(strings.pomodoro.endPomodoro));
    expect(mockEnd).toHaveBeenCalledWith('Write report');
  });

  it('shows elapsed time in count-up mode', async () => {
    mockActive = pomo();
    mockMode = 'countup';
    const { getByText } = await render(<ActiveSessionCard />);
    expect(getByText('5:00')).toBeTruthy();
    expect(getByText(strings.pomodoro.elapsedLabel)).toBeTruthy();
    mockMode = 'countdown';
  });

  it('resumes a paused session', async () => {
    mockActive = pomo({ pausedAt: new Date().toISOString() });
    const { getByLabelText } = await render(<ActiveSessionCard />);
    await fireEvent.press(getByLabelText(strings.pomodoro.resume));
    expect(mockResume).toHaveBeenCalled();
  });
});
