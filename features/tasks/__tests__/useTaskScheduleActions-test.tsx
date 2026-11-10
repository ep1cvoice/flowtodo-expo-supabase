import { act, renderHook } from '@testing-library/react-native';
import { useTaskScheduleActions } from '@/features/tasks/lib/useTaskScheduleActions';
import { toScheduledIso } from '@/features/tasks/lib/calendarDate';
import { strings } from '@/shared/lib/strings';

const mockShowToast = jest.fn();
const mockSetTaskScheduled = jest.fn();

jest.mock('@/features/tasks/TasksContext', () => ({
  useTasks: () => ({ setTaskScheduled: mockSetTaskScheduled }),
}));
jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSetTaskScheduled.mockResolvedValue(undefined);
});

describe('useTaskScheduleActions', () => {
  it('clears the date and then calls onSaved', async () => {
    const onSaved = jest.fn();
    const { result } = await renderHook(() => useTaskScheduleActions({ id: 7 }, onSaved));
    await act(async () => result.current.handleClearDate());
    expect(mockSetTaskScheduled).toHaveBeenCalledWith(7, null);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('saves the confirmed date as a scheduled ISO string', async () => {
    const onSaved = jest.fn();
    const date = new Date(2026, 4, 12);
    const { result } = await renderHook(() => useTaskScheduleActions({ id: 3 }, onSaved));
    await act(async () => result.current.handleConfirmDate(date));
    expect(mockSetTaskScheduled).toHaveBeenCalledWith(3, toScheduledIso(date));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast and skips onSaved when the update fails', async () => {
    mockSetTaskScheduled.mockRejectedValue(new Error('boom'));
    const onSaved = jest.fn();
    const { result } = await renderHook(() => useTaskScheduleActions({ id: 1 }, onSaved));
    await act(async () => result.current.handleClearDate());
    expect(onSaved).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(strings.tasks.updateDateFailed, 'error');
  });
});
