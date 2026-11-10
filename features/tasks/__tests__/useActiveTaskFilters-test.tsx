// Characterization tests for filter limits and stale-id filtering in useActiveTaskFilters.
import { StrictMode, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useActiveTaskFilters } from '@/features/tasks/lib/useActiveTaskFilters';

const mockShowToast = jest.fn();
const mockState: { user: any; tasks: any } = { user: null, tasks: null };
const mockSearch = { query: '' };

jest.mock('@/core/auth/AuthContext', () => ({ useAuth: () => ({ user: mockState.user }) }));
jest.mock('@/features/tasks/TasksContext', () => ({ useTasksState: () => mockState.tasks }));
jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));
jest.mock('@/features/tasks/lib/useTaskSearch', () => ({
  useTaskSearch: () => ({
    searchOpen: false,
    searchQuery: mockSearch.query,
    setSearchQuery: jest.fn(),
    hasSearch: mockSearch.query.trim().length > 0,
    toggleSearch: jest.fn(),
    closeSearch: jest.fn(),
  }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const task = (id: number, categoryId: number | null, tagIds: number[] = []): any => ({
  id,
  title: `Task ${id}`,
  description: '',
  done: false,
  scheduled: null,
  completedAt: null,
  created: '2026-01-01T00:00:00Z',
  categoryId,
  category: null,
  sortOrder: id,
  tags: tagIds.map((t) => ({ id: t, name: `t${t}`, color: '#000' })),
});
const entity = (id: number): any => ({ id, name: `n${id}`, color: '#000' });
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

function setTasksState(over: Record<string, unknown> = {}) {
  mockState.tasks = {
    activeTasks: [task(1, 1), task(2, 2), task(3, null)],
    categories: range(12).map(entity),
    tags: range(12).map(entity),
    ...over,
  };
}

type Hook = Awaited<ReturnType<typeof renderHook<ReturnType<typeof useActiveTaskFilters>, unknown>>>;
// Each toggle gets its own act: the callbacks read the selection counts from the latest render.
const toggleCats = async (r: Hook, ids: number[]) => {
  for (const id of ids) await act(async () => r.result.current.handleToggleCategory(id));
};
const toggleTags = async (r: Hook, ids: number[]) => {
  for (const id of ids) await act(async () => r.result.current.handleToggleTag(id));
};

beforeEach(() => {
  mockShowToast.mockClear();
  mockSearch.query = '';
  mockState.user = { id: 'u1', settings: { maxFilterSelections: 5 } };
  setTasksState();
});

it('uses the configured limit (clamped to 5..30)', async () => {
  mockState.user = { id: 'u1', settings: { maxFilterSelections: 2 } };
  const hook = await renderHook(() => useActiveTaskFilters());
  const { result } = hook;
  expect(result.current.maxFilterSelections).toBe(5);
});

it('rejects a selection beyond the combined categories + tags limit and toasts', async () => {
  const hook = await renderHook(() => useActiveTaskFilters());
  const { result } = hook;
  await toggleCats(hook, [1, 2, 3]);
  await toggleTags(hook, [1, 2]);
  expect(result.current.selectedCategoryIds).toEqual([1, 2, 3]);
  expect(result.current.selectedTagIds).toEqual([1, 2]);

  await toggleTags(hook, [3]);
  expect(result.current.selectedTagIds).toEqual([1, 2]);
  expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('up to 5'), 'error');

  await toggleCats(hook, [4]);
  expect(result.current.selectedCategoryIds).toEqual([1, 2, 3]);
});

it('toggling an already selected id removes it, even at the limit', async () => {
  const hook = await renderHook(() => useActiveTaskFilters());
  const { result } = hook;
  await toggleCats(hook, [1, 2, 3, 4, 5]);
  await toggleCats(hook, [5]);
  expect(result.current.selectedCategoryIds).toEqual([1, 2, 3, 4]);
});

it('trims existing selections when the limit is lowered (categories first, tags get the rest)', async () => {
  const hook = await renderHook(() => useActiveTaskFilters());
  const { result, rerender } = hook;
  mockState.user = { id: 'u1', settings: { maxFilterSelections: 10 } };
  await rerender({});
  await toggleCats(hook, [1, 2, 3, 4, 5, 6]);
  await toggleTags(hook, [1, 2, 3, 4]);
  expect(result.current.selectedCategoryIds).toHaveLength(6);
  expect(result.current.selectedTagIds).toHaveLength(4);

  mockState.user = { id: 'u1', settings: { maxFilterSelections: 5 } };
  await rerender({});
  expect(result.current.selectedCategoryIds).toEqual([1, 2, 3, 4, 5]);
  expect(result.current.selectedTagIds).toEqual([]);
});

it('ignores selected ids that no longer exist in categories/tags', async () => {
  const hook = await renderHook(() => useActiveTaskFilters());
  const { result, rerender } = hook;
  await toggleCats(hook, [1, 2]);
  await toggleTags(hook, [1]);
  expect(result.current.validCategoryIds).toEqual([1, 2]);

  setTasksState({ categories: [entity(2)], tags: [] });
  await rerender({});

  // Raw selection is kept, but the valid ids (used for filtering) drop the stale ones.
  expect(result.current.selectedCategoryIds).toEqual([1, 2]);
  expect(result.current.validCategoryIds).toEqual([2]);
  expect(result.current.validTagIds).toEqual([]);
  expect(result.current.hasFilters).toBe(true);
  expect(result.current.filteredTasks.map((t: any) => t.id)).toEqual([2]);
});

it('hasFilters is false when all selected ids are stale', async () => {
  const hook = await renderHook(() => useActiveTaskFilters());
  const { result, rerender } = hook;
  await toggleCats(hook, [1]);
  setTasksState({ categories: [] });
  await rerender({});
  expect(result.current.hasFilters).toBe(false);
  expect(result.current.filteredTasks).toHaveLength(3);
});

it('shows the limit toast exactly once per rejected toggle, also under StrictMode', async () => {
  const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
  const hook = await renderHook(() => useActiveTaskFilters(), { wrapper: strict });
  await toggleCats(hook, [1, 2, 3, 4, 5]);
  expect(mockShowToast).not.toHaveBeenCalled();

  await toggleTags(hook, [1]);

  expect(mockShowToast).toHaveBeenCalledTimes(1);
  expect(hook.result.current.selectedTagIds).toEqual([]);
});

it('trims the selection without side effects inside state updaters (StrictMode)', async () => {
  const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
  const hook = await renderHook(() => useActiveTaskFilters(), { wrapper: strict });
  mockState.user = { id: 'u1', settings: { maxFilterSelections: 10 } };
  await hook.rerender({});
  await toggleCats(hook, [1, 2, 3, 4, 5, 6]);
  await toggleTags(hook, [1, 2, 3, 4]);

  mockState.user = { id: 'u1', settings: { maxFilterSelections: 8 } };
  await hook.rerender({});

  expect(hook.result.current.selectedCategoryIds).toHaveLength(6);
  expect(hook.result.current.selectedTagIds).toEqual([1, 2]);
});

it('filters by the search query', async () => {
  setTasksState({
    activeTasks: [
      { ...task(1, null), title: 'Buy milk' },
      { ...task(2, null), title: 'Walk the dog' },
    ],
  });
  mockSearch.query = 'MILK';

  const { result } = await renderHook(() => useActiveTaskFilters());

  await waitFor(() => expect(result.current.filteredTasks.map((t: any) => t.id)).toEqual([1]));
  expect(result.current.hasSearch).toBe(true);
});
