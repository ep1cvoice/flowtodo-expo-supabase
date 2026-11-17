import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AddTaskModal from '@/features/tasks/components/form/AddTaskModal';

const mockShowToast = jest.fn();

jest.mock('@/features/tasks/TasksContext', () => ({
  useTasksState: () => ({
    categories: [{ id: 3, name: 'Work', color: '#2563eb', icon: 'briefcase' }],
    tags: [
      { id: 1, name: 'urgent', color: '#dc2626' },
      { id: 2, name: 'home', color: '#16a34a' },
    ],
  }),
  useTasksActions: () => ({ addCategory: jest.fn(), addTag: jest.fn() }),
}));

jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast, hideToast: jest.fn(), toast: null }),
}));

jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = jest.requireActual<typeof import('@/shared/constants/theme')>(
    '@/shared/constants/theme'
  );
  return {
    useTheme: () => ({
      colors: lightColors,
      isDark: false,
      theme: 'light',
      setTheme: jest.fn(),
      ready: true,
    }),
  };
});

jest.mock('@/shared/lib/useKeyboardBottomInset', () => ({ useKeyboardHeight: () => 0 }));

jest.mock('@/features/tasks/lib/calendarDate', () => ({
  ...jest.requireActual('@/features/tasks/lib/calendarDate'),
  toScheduledIso: jest.fn(() => '2026-11-10'),
}));

// Child modals are not under test here.
jest.mock('@/features/tasks/components/form/LabelModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/features/tasks/components/calendar/CalendarModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

const TITLE_PLACEHOLDER = 'What needs to be done?';
const DESCRIPTION_PLACEHOLDER = 'Add a description (optional)';

function addProps(overrides: Record<string, unknown> = {}): any {
  return {
    visible: true,
    onAdd: jest.fn().mockResolvedValue(undefined),
    onClose: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockShowToast.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('<AddTaskModal />', () => {
  it('shows placeholders for every field and the add button', async () => {
    const screen = await render(<AddTaskModal {...addProps()} />);

    expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByPlaceholderText(DESCRIPTION_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByText('Choose category')).toBeTruthy();
    expect(screen.getByText('Add tags')).toBeTruthy();
    expect(screen.getByText('Due date')).toBeTruthy();
    expect(screen.getByText('Add task')).toBeTruthy();
  });

  it('shows a validation error and does not submit when the title is empty', async () => {
    const props = addProps();
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.press(screen.getByText('Add task'));

    await waitFor(() => expect(screen.getByText('Title is required')).toBeTruthy());
    expect(props.onAdd).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('rejects a title with unsupported characters', async () => {
    const props = addProps();
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Hello <script>');
    await fireEvent.press(screen.getByText('Add task'));

    await waitFor(() =>
      expect(screen.getByText('Title contains unsupported characters.')).toBeTruthy()
    );
    expect(props.onAdd).not.toHaveBeenCalled();
  });

  it('adds the typed values with no due date, shows the toast and closes', async () => {
    const props = addProps();
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Buy milk');
    await fireEvent.changeText(screen.getByPlaceholderText(DESCRIPTION_PLACEHOLDER), 'Two liters');
    await fireEvent.press(screen.getByText('Add task'));

    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(props.onAdd).toHaveBeenCalledWith({
      title: 'Buy milk',
      description: 'Two liters',
      categoryId: null,
      tagIds: [],
      scheduled: null,
    });
    expect(mockShowToast).toHaveBeenCalledWith('Task created.');
  });

  it('submits from the keyboard', async () => {
    const props = addProps();
    const screen = await render(<AddTaskModal {...props} />);

    const input = screen.getByPlaceholderText(TITLE_PLACEHOLDER);
    await fireEvent.changeText(input, 'Quick task');
    await fireEvent(input, 'submitEditing');

    await waitFor(() => expect(props.onAdd).toHaveBeenCalledTimes(1));
  });

  it('shows an error toast and stays open when saving fails', async () => {
    const props = addProps({ onAdd: jest.fn().mockRejectedValue(new Error('db down')) });
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Buy milk');
    await fireEvent.press(screen.getByText('Add task'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Could not save task.', 'error'));
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Add task')).toBeTruthy(); // button is usable again
  });

  it('adds the selected calendar day as the due date', async () => {
    const props = addProps({ defaultScheduled: new Date(2026, 10, 10) });
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Pay rent');
    await fireEvent.press(screen.getByText('Add task'));

    await waitFor(() => expect(props.onAdd).toHaveBeenCalledTimes(1));
    expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ scheduled: '2026-11-10' }));
  });

  it('pre-selects the default category and tags and shows them', async () => {
    const props = addProps({ defaultCategoryId: 3, defaultTagIds: [1, 2] });
    const screen = await render(<AddTaskModal {...props} />);

    expect(screen.getByText('Work')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Filtered task');
    await fireEvent.press(screen.getByText('Add task'));

    await waitFor(() => expect(props.onAdd).toHaveBeenCalledTimes(1));
    expect(props.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 3, tagIds: [1, 2] })
    );
  });

  it('picks a category from the menu', async () => {
    const props = addProps();
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.press(screen.getByText('Choose category'));
    await fireEvent.press(screen.getByText('Work'));
    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Report');
    await fireEvent.press(screen.getByText('Add task'));

    await waitFor(() => expect(props.onAdd).toHaveBeenCalledTimes(1));
    expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 3 }));
  });

  it('starts empty again when reopened', async () => {
    const props = addProps();
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Draft');
    await screen.rerender(<AddTaskModal {...props} visible={false} />);
    await screen.rerender(<AddTaskModal {...props} visible />);

    expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER).props.value).toBe('');
  });
});
