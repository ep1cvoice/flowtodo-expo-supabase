import { render, screen } from '@testing-library/react-native';
import ToDoItem from '@/features/tasks/components/item/ToDoItem';

const mockCheckboxRender = jest.fn();
const mockBadgeRender = jest.fn();
const mockOpen = jest.fn();

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/features/tasks/components/item/TaskCheckbox', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockCheckboxRender(props);
    return null;
  },
}));
jest.mock('@/features/tasks/components/item/DueDateBadge', () => ({
  __esModule: true,
  default: (props: { date: Date }) => {
    mockBadgeRender(props.date);
    return null;
  },
}));
jest.mock('@/features/tasks/components/item/TaskDesktopActions', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/tasks/components/item/TaskMobileTrailing', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/tasks/components/item/TaskReorderButtons', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/tasks/components/item/TaskTagLabels', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/tasks/components/item/TaskItemModalsContext', () => ({
  useTaskItemModals: () => ({ open: mockOpen }),
}));
jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = jest.requireActual<typeof import('@/shared/constants/theme')>('@/shared/constants/theme');
  return { useTheme: () => ({ colors: lightColors, isDark: false }) };
});
jest.mock('@/features/tasks/components/item/todoItemStyles', () => ({
  useTodoItemStyles: () => ({
    colors: jest.requireActual<typeof import('@/shared/constants/theme')>('@/shared/constants/theme').lightColors,
    styles: new Proxy({}, { get: () => ({}) }),
  }),
}));

const task: any = {
  id: 1,
  title: 'Write tests',
  description: '',
  done: false,
  scheduled: '2026-03-01T00:00:00.000Z',
  completedAt: null,
  created: '2026-01-01T00:00:00Z',
  categoryId: null,
  category: null,
  sortOrder: 0,
  tags: [],
};

const baseProps = {
  isMobile: false,
  isPomoActive: false,
  canStart: true,
  onStartPomodoro: jest.fn(),
  onToggleDone: jest.fn().mockResolvedValue(true),
};

beforeEach(() => {
  mockCheckboxRender.mockClear();
  mockBadgeRender.mockClear();
});

describe('ToDoItem memoization', () => {
  it('does not re-render when re-rendered with identical props', async () => {
    const { rerender } = await render(<ToDoItem task={task} {...baseProps} />);
    expect(screen.getByLabelText('Write tests')).toBeTruthy();
    expect(mockCheckboxRender).toHaveBeenCalledTimes(1);

    await rerender(<ToDoItem task={task} {...baseProps} />);

    expect(mockCheckboxRender).toHaveBeenCalledTimes(1);
  });

  it('re-renders when a prop it displays changes', async () => {
    const { rerender } = await render(<ToDoItem task={task} {...baseProps} />);

    await rerender(<ToDoItem task={task} {...baseProps} isPomoActive />);

    expect(mockCheckboxRender).toHaveBeenCalledTimes(2);
  });

  it('keeps the same due Date instance while the schedule is unchanged', async () => {
    const { rerender } = await render(<ToDoItem task={task} {...baseProps} />);
    // A new task object with the same schedule (e.g. a title edit) re-renders the row...
    await rerender(<ToDoItem task={{ ...task, title: 'Renamed' }} {...baseProps} />);

    expect(mockBadgeRender).toHaveBeenCalledTimes(2);
    // ...but the badge receives the very same Date, not a fresh one.
    expect(mockBadgeRender.mock.calls[1][0]).toBe(mockBadgeRender.mock.calls[0][0]);
  });
});
