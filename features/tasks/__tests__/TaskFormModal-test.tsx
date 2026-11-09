import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AddTaskModal from '@/features/tasks/components/form/AddTaskModal';
import TaskFormModal from '@/features/tasks/components/form/TaskFormModal';

const mockShowToast = jest.fn();

jest.mock('@/features/tasks/TasksContext', () => ({
  useTasks: () => ({ addCategory: jest.fn(), addTag: jest.fn() }),
}));

jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast, hideToast: jest.fn(), toast: null }),
}));

jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = require('@/shared/constants/theme');
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

// Child modals / pickers are not under test here.
jest.mock('@/features/tasks/components/form/LabelModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/tasks/components/form/TagChipPicker', () => ({ __esModule: true, default: () => null }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

const TITLE_PLACEHOLDER = 'Enter task title...';
const DESCRIPTION_PLACEHOLDER = 'Enter description...';

function formProps(overrides: Record<string, unknown> = {}): any {
  return {
    visible: true,
    heading: 'Add New Task',
    submitLabel: 'Add Task',
    submittingLabel: 'Adding…',
    SubmitIcon: () => null,
    categories: [],
    tags: [],
    initialValues: { title: '', description: '', categoryId: null, tagIds: [] },
    resetOnClose: true,
    failLog: 'Failed to add task:',
    successToast: 'Task created.',
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onClose: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockShowToast.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('<TaskFormModal />', () => {
  it('renders the heading, both fields and the action buttons', async () => {
    const screen = await render(<TaskFormModal {...formProps()} />);

    expect(screen.getByText('Add New Task')).toBeTruthy();
    expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByPlaceholderText(DESCRIPTION_PLACEHOLDER)).toBeTruthy();
    expect(screen.getByText('Add Task')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows a validation error and does not submit when the title is empty', async () => {
    const props = formProps();
    const screen = await render(<TaskFormModal {...props} />);

    await fireEvent.press(screen.getByText('Add Task'));

    await waitFor(() => expect(screen.getByText('Title is required')).toBeTruthy());
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('rejects a title longer than 50 characters', async () => {
    const props = formProps();
    const screen = await render(<TaskFormModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'a'.repeat(51));
    await fireEvent.press(screen.getByText('Add Task'));

    await waitFor(() =>
      expect(screen.getByText('Title must be less than 50 characters')).toBeTruthy()
    );
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a title with unsupported characters', async () => {
    const props = formProps();
    const screen = await render(<TaskFormModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Hello <script>');
    await fireEvent.press(screen.getByText('Add Task'));

    await waitFor(() =>
      expect(screen.getByText('Title contains unsupported characters.')).toBeTruthy()
    );
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('submits the typed values, shows the success toast and closes', async () => {
    const props = formProps();
    const screen = await render(<TaskFormModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Buy milk');
    await fireEvent.changeText(screen.getByPlaceholderText(DESCRIPTION_PLACEHOLDER), 'Two liters');
    await fireEvent.press(screen.getByText('Add Task'));

    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(props.onSubmit).toHaveBeenCalledWith({
      title: 'Buy milk',
      description: 'Two liters',
      categoryId: null,
      tagIds: [],
    });
    expect(mockShowToast).toHaveBeenCalledWith('Task created.');
  });

  it('shows an error toast and stays open when saving fails', async () => {
    const props = formProps({ onSubmit: jest.fn().mockRejectedValue(new Error('db down')) });
    const screen = await render(<TaskFormModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Buy milk');
    await fireEvent.press(screen.getByText('Add Task'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Could not save task.', 'error'));
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Add Task')).toBeTruthy(); // button is usable again
  });

  it('Cancel closes the form and, with resetOnClose, clears the typed text', async () => {
    const props = formProps();
    const screen = await render(<TaskFormModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Draft');
    await fireEvent.press(screen.getByText('Cancel'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER).props.value).toBe('');
  });
});

describe('<AddTaskModal />', () => {
  function addProps(overrides: Record<string, unknown> = {}): any {
    return {
      visible: true,
      onAdd: jest.fn().mockResolvedValue(undefined),
      onClose: jest.fn(),
      categories: [],
      tags: [],
      ...overrides,
    };
  }

  it('calls onAdd with the form values and no due date by default', async () => {
    const props = addProps();
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Buy milk');
    await fireEvent.press(screen.getByText('Add Task'));

    await waitFor(() => expect(props.onAdd).toHaveBeenCalledTimes(1));
    expect(props.onAdd).toHaveBeenCalledWith({
      title: 'Buy milk',
      description: '',
      categoryId: null,
      tagIds: [],
      scheduled: null,
    });
  });

  it('adds the selected calendar day as the due date', async () => {
    const props = addProps({ defaultScheduled: new Date(2026, 10, 10) });
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Pay rent');
    await fireEvent.press(screen.getByText('Add Task'));

    await waitFor(() => expect(props.onAdd).toHaveBeenCalledTimes(1));
    expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ scheduled: '2026-11-10' }));
  });

  it('pre-selects the default category and tags', async () => {
    const props = addProps({ defaultCategoryId: 3, defaultTagIds: [1, 2] });
    const screen = await render(<AddTaskModal {...props} />);

    await fireEvent.changeText(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Filtered task');
    await fireEvent.press(screen.getByText('Add Task'));

    await waitFor(() => expect(props.onAdd).toHaveBeenCalledTimes(1));
    expect(props.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 3, tagIds: [1, 2] })
    );
  });
});
