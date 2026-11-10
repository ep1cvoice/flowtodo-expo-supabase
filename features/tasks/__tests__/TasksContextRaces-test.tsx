// Late refresh responses (after a timeout, a newer request or a user change) must be ignored.
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { TasksProvider, useTasksActions, useTasksState } from '@/features/tasks/TasksContext';

const mockAuthState: { user: any; loading: boolean; dek: Uint8Array | null } = {
  user: null,
  loading: false,
  dek: null,
};
let mockForceTimeout: (() => void) | null = null;

const mockShowToast = jest.fn();
jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));
jest.mock('@/core/auth/AuthContext', () => ({ useAuth: () => mockAuthState }));
jest.mock('@/core/auth/EncryptionContext', () => ({ useEncryption: () => mockAuthState }));
jest.mock('@/shared/lib/withTimeout', () => ({
  // Resolves/rejects with the promise, but lets a test trigger the timeout by hand.
  withTimeout: (p: Promise<unknown>) =>
    new Promise((resolve, reject) => {
      mockForceTimeout = () => reject(new Error('timed out'));
      p.then(resolve, reject);
    }),
}));
jest.mock('@/features/tasks/lib/seedDemoData', () => ({ seedDemoData: jest.fn() }));
jest.mock('@/features/tasks/lib/queries', () => ({
  fetchTasksSnapshot: jest.fn(),
  fetchCompletedPage: jest.fn(),
  fetchTaskById: jest.fn(),
}));
jest.mock('@/features/tasks/lib/mutations', () => ({}));

import { fetchTasksSnapshot } from '@/features/tasks/lib/queries';

const fetchSnapshot = fetchTasksSnapshot as jest.Mock;
const dek = new Uint8Array(32).fill(1);

const task = (id: number): any => ({
  id,
  title: `Task ${id}`,
  description: '',
  done: false,
  scheduled: null,
  completedAt: null,
  created: '2026-01-01T00:00:00Z',
  categoryId: null,
  category: null,
  sortOrder: id,
  tags: [],
});
const snapshotWith = (activeTasks: any[]) => ({
  categories: [{ id: 1, name: 'c', color: '#000', icon: 'x' }],
  tags: [],
  activeTasks,
  completedTasks: [],
  completedCount: 0,
  nextCursor: null,
  hasMore: false,
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const wrapper = ({ children }: { children: ReactNode }) => <TasksProvider>{children}</TasksProvider>;
const useBoth = () => ({ state: useTasksState(), actions: useTasksActions() });

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockForceTimeout = null;
  mockAuthState.user = { id: 'u1', email: 'a@b.com' };
  mockAuthState.loading = false;
  mockAuthState.dek = dek;
});

it('ignores a response that arrives after the request timed out', async () => {
  const late = deferred<any>();
  fetchSnapshot.mockReturnValue(late.promise);

  const { result } = await renderHook(useBoth, { wrapper });
  await act(async () => mockForceTimeout!());
  await waitFor(() => expect(result.current.state.loading).toBe(false));

  await act(async () => late.resolve(snapshotWith([task(1)])));

  expect(result.current.state.activeTasks).toEqual([]);
});

it('ignores an older response that arrives after a newer one', async () => {
  const first = deferred<any>();
  const second = deferred<any>();
  fetchSnapshot.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

  const { result } = await renderHook(useBoth, { wrapper });
  let refetching!: Promise<void>;
  await act(async () => {
    refetching = result.current.actions.refetch();
  });
  await act(async () => second.resolve(snapshotWith([task(2)])));
  await act(async () => refetching);
  await act(async () => first.resolve(snapshotWith([task(1)])));

  expect(result.current.state.activeTasks.map((t) => t.id)).toEqual([2]);
});

it('ignores a response for a user who has signed out in the meantime', async () => {
  const late = deferred<any>();
  fetchSnapshot.mockReturnValue(late.promise);

  const { result, rerender } = await renderHook(useBoth, { wrapper });
  mockAuthState.user = null;
  await rerender({});
  await act(async () => late.resolve(snapshotWith([task(1)])));

  expect(result.current.state.activeTasks).toEqual([]);
  expect(result.current.state.categories).toEqual([]);
});

it('keeps action identities stable across data changes', async () => {
  fetchSnapshot.mockResolvedValue(snapshotWith([task(1)]));

  const { result } = await renderHook(useBoth, { wrapper });
  await waitFor(() => expect(result.current.state.activeTasks).toHaveLength(1));
  const before = result.current.actions;

  fetchSnapshot.mockResolvedValue(snapshotWith([task(1), task(2)]));
  await act(() => result.current.actions.refetch());

  expect(result.current.state.activeTasks).toHaveLength(2);
  expect(result.current.actions).toBe(before);
});
