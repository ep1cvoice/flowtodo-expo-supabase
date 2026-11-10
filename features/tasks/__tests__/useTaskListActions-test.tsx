import { act, renderHook } from '@testing-library/react-native';
import { useTaskRowProps } from '@/features/tasks/lib/useTaskListActions';

const mockPomo = { activeTaskId: null as number | null, canStart: true };
const mockStartPomo = jest.fn();
const mockEndPomo = jest.fn();
const mockShowToast = jest.fn();

jest.mock('@/features/pomodoro/PomodoroContext', () => ({
  usePomodoroState: () => ({ ...mockPomo }),
  usePomodoroActions: () => ({ startPomo: mockStartPomo, endPomo: mockEndPomo }),
}));
jest.mock('@/shared/providers/ToastContext', () => ({ useToast: () => ({ showToast: mockShowToast }) }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

const task = (id: number, extra: Record<string, unknown> = {}): any => ({ id, title: `T${id}`, done: false, ...extra });
const onToggle = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  mockPomo.activeTaskId = null;
  mockPomo.canStart = true;
  mockEndPomo.mockResolvedValue(undefined);
  mockStartPomo.mockResolvedValue(undefined);
});

it('keeps rowProps stable when the pomodoro state changes without affecting canStart', async () => {
  const { result, rerender } = await renderHook(() => useTaskRowProps(onToggle));
  const before = result.current.rowProps;

  await rerender({});

  expect(result.current.rowProps).toBe(before);
});

it('starts a pomodoro with the task, unless it is done or one is running', async () => {
  const { result, rerender } = await renderHook(() => useTaskRowProps(onToggle));

  result.current.rowProps.onStartPomodoro(task(1));
  expect(mockStartPomo).toHaveBeenCalledWith(expect.objectContaining({ id: 1, title: 'T1' }));

  mockStartPomo.mockClear();
  result.current.rowProps.onStartPomodoro(task(2, { done: true }));
  expect(mockStartPomo).not.toHaveBeenCalled();

  mockPomo.canStart = false;
  await rerender({});
  result.current.rowProps.onStartPomodoro(task(3));
  expect(mockStartPomo).not.toHaveBeenCalled();
});

it('stops the active pomodoro (by title) before toggling, and aborts if stopping fails', async () => {
  mockPomo.activeTaskId = 1;
  mockPomo.canStart = false;
  const { result } = await renderHook(() => useTaskRowProps(onToggle));

  await act(async () => {
    expect(await result.current.rowProps.onToggleDone(task(1))).toBe(true);
  });
  expect(mockEndPomo).toHaveBeenCalledWith('T1');
  expect(onToggle).toHaveBeenCalledWith(1);

  onToggle.mockClear();
  mockEndPomo.mockRejectedValue(new Error('boom'));
  await act(async () => {
    expect(await result.current.rowProps.onToggleDone(task(1))).toBe(false);
  });
  expect(onToggle).not.toHaveBeenCalled();
  expect(mockShowToast).toHaveBeenCalled();
});

it('toggles another task without touching the running pomodoro', async () => {
  mockPomo.activeTaskId = 1;
  const { result } = await renderHook(() => useTaskRowProps(onToggle));

  await act(async () => {
    await result.current.rowProps.onToggleDone(task(2));
  });

  expect(mockEndPomo).not.toHaveBeenCalled();
  expect(onToggle).toHaveBeenCalledWith(2);
});
