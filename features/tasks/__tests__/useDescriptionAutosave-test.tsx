import { act, renderHook } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import { useDescriptionAutosave } from '@/features/tasks/components/item/taskDetail/useDescriptionAutosave';
import { strings } from '@/shared/lib/strings';

const mockShowToast = jest.fn();
const mockUpdateTask = jest.fn();

jest.mock('@/features/tasks/TasksContext', () => ({
  useTasks: () => ({ updateTask: mockUpdateTask }),
}));
jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));
jest.mock('@/shared/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

const makeTask = (over: Record<string, unknown> = {}): any => ({
  id: 5,
  title: 'Title',
  description: 'old',
  done: false,
  categoryId: 2,
  tags: [{ id: 9, name: 't', color: '#000' }],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockUpdateTask.mockResolvedValue(undefined);
  jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
});
afterEach(() => jest.useRealTimers());

describe('useDescriptionAutosave', () => {
  it('starts with the task description', async () => {
    const { result } = await renderHook(() => useDescriptionAutosave(makeTask()));
    expect(result.current.draft).toBe('old');
  });

  it('saves the trimmed draft on blur, keeping the other task fields', async () => {
    const { result } = await renderHook(() => useDescriptionAutosave(makeTask()));
    await act(async () => result.current.handleFocus());
    await act(async () => result.current.setDraft('  new text  '));
    await act(async () => result.current.handleBlur());
    expect(mockUpdateTask).toHaveBeenCalledWith(5, {
      title: 'Title',
      description: 'new text',
      categoryId: 2,
      tagIds: [9],
    });
  });

  it('does not save when the trimmed draft equals the last saved value', async () => {
    const { result } = await renderHook(() => useDescriptionAutosave(makeTask()));
    await act(async () => result.current.setDraft('old  '));
    await act(async () => result.current.handleBlur());
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('does not save twice for the same text', async () => {
    const { result } = await renderHook(() => useDescriptionAutosave(makeTask()));
    await act(async () => result.current.setDraft('changed'));
    await act(async () => result.current.handleBlur());
    await act(async () => result.current.handleBlur());
    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
  });

  it('reverts the draft and toasts when saving fails while not focused', async () => {
    mockUpdateTask.mockRejectedValue(new Error('boom'));
    const { result } = await renderHook(() => useDescriptionAutosave(makeTask()));
    await act(async () => result.current.setDraft('changed'));
    await act(async () => result.current.handleBlur());
    expect(mockShowToast).toHaveBeenCalledWith(strings.tasks.saveDescriptionFailed, 'error');
    expect(result.current.draft).toBe('old');
  });

  it('skips the blur save after armSkipSave until the deferred dismiss runs', async () => {
    const { result } = await renderHook(() => useDescriptionAutosave(makeTask()));
    await act(async () => result.current.setDraft('changed'));
    await act(async () => result.current.armSkipSave());
    await act(async () => result.current.handleBlur());
    expect(mockUpdateTask).not.toHaveBeenCalled();
    await act(async () => {
      jest.runAllTimers();
    });
    expect(Keyboard.dismiss).toHaveBeenCalled();
    await act(async () => result.current.handleBlur());
    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
  });

  it('commitFromOutside saves and dismisses the keyboard', async () => {
    const { result } = await renderHook(() => useDescriptionAutosave(makeTask()));
    await act(async () => result.current.setDraft('changed'));
    await act(async () => result.current.commitFromOutside());
    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.runAllTimers();
    });
    expect(Keyboard.dismiss).toHaveBeenCalled();
  });

  it('follows external description changes while not focused, but not while focused', async () => {
    const { result, rerender } = await renderHook(
      (p: { task: any }) => useDescriptionAutosave(p.task),
      { initialProps: { task: makeTask() } },
    );
    await rerender({ task: makeTask({ description: 'remote' }) });
    expect(result.current.draft).toBe('remote');
    await act(async () => result.current.handleFocus());
    await rerender({ task: makeTask({ description: 'remote 2' }) });
    expect(result.current.draft).toBe('remote');
  });
});
