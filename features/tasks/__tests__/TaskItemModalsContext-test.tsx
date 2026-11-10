import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import {
  TaskItemModalsProvider,
  useTaskItemModals,
} from '@/features/tasks/components/item/TaskItemModalsContext';

const mockState: { tasks: any[] } = { tasks: [] };
const mockEndPomo = jest.fn();
const mockPomo = { activeTaskId: null as number | null };

jest.mock('@/features/tasks/TasksContext', () => ({
  useTasks: () => ({ tasks: mockState.tasks, updateTask: jest.fn(), setTaskScheduled: jest.fn() }),
}));
jest.mock('@/features/pomodoro/PomodoroContext', () => ({
  usePomodoro: () => ({
    activeTaskId: mockPomo.activeTaskId,
    canStart: true,
    startPomo: jest.fn(),
    endPomo: (...a: unknown[]) => mockEndPomo(...a),
  }),
}));
jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));
jest.mock('@/features/tasks/components/item/todoItemStyles', () => ({
  useTodoItemStyles: () => ({ colors: {}, styles: {} }),
}));

// Stub modals: render the task title while visible and expose the callbacks as buttons.
const mockStubModalMounts = jest.fn();
jest.mock('@/features/tasks/components/item/TaskDetailModal', () => {
  const { Text, Pressable } = require('react-native');
  return {
    __esModule: true,
    default: (p: any) => {
      mockStubModalMounts('detail');
      return p.visible ? (
        <>
          <Text>{`detail:${p.task.title}`}</Text>
          <Pressable onPress={p.onClose}>
            <Text>close-detail</Text>
          </Pressable>
        </>
      ) : null;
    },
  };
});
jest.mock('@/features/tasks/components/item/MobileActionsSheet', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/features/tasks/components/form/EditTaskModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/features/tasks/components/calendar/CalendarModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/shared/ui/ConfirmModal', () => {
  const { Text, Pressable } = require('react-native');
  return {
    __esModule: true,
    default: (p: any) =>
      p.visible ? (
        <>
          <Text>{`confirm:${p.message}`}</Text>
          <Pressable onPress={p.onConfirm}>
            <Text>confirm-yes</Text>
          </Pressable>
        </>
      ) : null,
  };
});

const task = (id: number, title: string): any => ({ id, title, done: false, tags: [] });

function Row({ t }: { t: any }) {
  const { open } = useTaskItemModals();
  return (
    <>
      <Pressable onPress={() => open('detail', t)}>
        <Text>{`open-detail-${t.id}`}</Text>
      </Pressable>
      <Pressable onPress={() => open('confirmDelete', t)}>
        <Text>{`open-delete-${t.id}`}</Text>
      </Pressable>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPomo.activeTaskId = null;
  mockEndPomo.mockResolvedValue(undefined);
  mockState.tasks = [task(1, 'First'), task(2, 'Second')];
});

describe('TaskItemModalsProvider', () => {
  it('mounts no modals until a row opens one', async () => {
    await render(
      <TaskItemModalsProvider onToggle={jest.fn()} onDelete={jest.fn()}>
        <Row t={mockState.tasks[0]} />
      </TaskItemModalsProvider>,
    );
    expect(mockStubModalMounts).not.toHaveBeenCalled();
  });

  it('opens the detail modal for the row that was pressed, using one shared instance', async () => {
    const screen = await render(
      <TaskItemModalsProvider onToggle={jest.fn()} onDelete={jest.fn()}>
        <Row t={mockState.tasks[0]} />
        <Row t={mockState.tasks[1]} />
      </TaskItemModalsProvider>,
    );
    await fireEvent.press(screen.getByText('open-detail-2'));
    expect(screen.getByText('detail:Second')).toBeTruthy();
    expect(screen.queryByText('detail:First')).toBeNull();

    await fireEvent.press(screen.getByText('close-detail'));
    expect(screen.queryByText('detail:Second')).toBeNull();

    await fireEvent.press(screen.getByText('open-detail-1'));
    expect(screen.getByText('detail:First')).toBeTruthy();
  });

  it('follows live updates of the active task', async () => {
    const screen = await render(
      <TaskItemModalsProvider onToggle={jest.fn()} onDelete={jest.fn()}>
        <Row t={mockState.tasks[0]} />
      </TaskItemModalsProvider>,
    );
    await fireEvent.press(screen.getByText('open-detail-1'));
    mockState.tasks = [task(1, 'Renamed')];
    await screen.rerender(
      <TaskItemModalsProvider onToggle={jest.fn()} onDelete={jest.fn()}>
        <Row t={mockState.tasks[0]} />
      </TaskItemModalsProvider>,
    );
    expect(screen.getByText('detail:Renamed')).toBeTruthy();
  });

  it('deletes the active task after confirmation and closes the confirm modal', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    const screen = await render(
      <TaskItemModalsProvider onToggle={jest.fn()} onDelete={onDelete}>
        <Row t={mockState.tasks[0]} />
        <Row t={mockState.tasks[1]} />
      </TaskItemModalsProvider>,
    );
    await fireEvent.press(screen.getByText('open-delete-2'));
    await fireEvent.press(screen.getByText('confirm-yes'));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByText('confirm-yes')).toBeNull());
  });

  it('stops an active pomodoro before deleting and aborts if stopping fails', async () => {
    mockPomo.activeTaskId = 1;
    mockEndPomo.mockRejectedValue(new Error('boom'));
    const onDelete = jest.fn();
    const screen = await render(
      <TaskItemModalsProvider onToggle={jest.fn()} onDelete={onDelete}>
        <Row t={mockState.tasks[0]} />
      </TaskItemModalsProvider>,
    );
    await fireEvent.press(screen.getByText('open-delete-1'));
    await fireEvent.press(screen.getByText('confirm-yes'));
    await waitFor(() => expect(mockEndPomo).toHaveBeenCalled());
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('confirm-yes')).toBeTruthy();
  });

  it('throws when useTaskItemModals is used outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Row t={mockState.tasks[0]} />)).rejects.toThrow(/TaskItemModalsProvider/);
  });
});
