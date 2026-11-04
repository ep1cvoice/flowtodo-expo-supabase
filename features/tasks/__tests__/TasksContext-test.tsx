// File: __tests__/TasksContext-test.tsx
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { TasksProvider, useTasks } from '@/features/tasks/TasksContext';

const mockAuthState: { user: any; loading: boolean; dek: Uint8Array | null } = {
  user: null,
  loading: false,
  dek: null,
};

jest.mock('@/core/auth/AuthContext', () => ({ useAuth: () => mockAuthState }));
jest.mock('@/shared/lib/withTimeout', () => ({ withTimeout: (p: Promise<unknown>) => p }));
jest.mock('@/features/tasks/lib/seedDemoData', () => ({ seedDemoData: jest.fn() }));
jest.mock('@/features/tasks/lib/queries', () => ({
  fetchTasksSnapshot: jest.fn(),
  fetchCompletedPage: jest.fn(),
}));
jest.mock('@/features/tasks/lib/mutations', () => ({
  deleteCategoryForUser: jest.fn(),
  deleteTagForUser: jest.fn(),
  deleteTaskForUser: jest.fn(),
  deleteTasksByDone: jest.fn(),
  insertEncryptedCategory: jest.fn(),
  insertEncryptedTag: jest.fn(),
  insertEncryptedTask: jest.fn(),
  setTaskDoneRow: jest.fn(),
  setTaskScheduledRow: jest.fn(),
  updateEncryptedTask: jest.fn(),
  updateTaskSortOrders: jest.fn(),
}));

import { seedDemoData } from '@/features/tasks/lib/seedDemoData';
import { fetchTasksSnapshot } from '@/features/tasks/lib/queries';
import { insertEncryptedTask, updateEncryptedTask } from '@/features/tasks/lib/mutations';

const fetchSnapshot = fetchTasksSnapshot as jest.Mock;
const insertTask = insertEncryptedTask as jest.Mock;
const updateTask = updateEncryptedTask as jest.Mock;
const seed = seedDemoData as jest.Mock;

const dek = new Uint8Array(32).fill(1);
const user = { id: 'u1', email: 'a@b.com' };

const task = (id: number, sortOrder: number): any => ({
  id,
  title: `Task ${id}`,
  description: '',
  done: false,
  scheduled: null,
  completedAt: null,
  created: '2026-01-01T00:00:00Z',
  categoryId: null,
  category: null,
  sortOrder,
  tags: [],
});

const snapshotWith = (activeTasks: any[]) => ({
  categories: [],
  tags: [],
  activeTasks,
  completedTasks: [],
  completedCount: 0,
  nextCursor: null,
  hasMore: false,
});

const input = {
  title: 'Buy milk',
  description: 'Two liters',
  categoryId: 2,
  tagIds: [1],
};

const wrapper = ({ children }: { children: ReactNode }) => <TasksProvider>{children}</TasksProvider>;

async function renderTasks() {
  const hook = await renderHook(() => useTasks(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockAuthState.user = user;
  mockAuthState.loading = false;
  mockAuthState.dek = dek;
  fetchSnapshot.mockResolvedValue(snapshotWith([task(1, 3), task(2, 5)]));
  insertTask.mockResolvedValue(undefined);
  updateTask.mockResolvedValue(undefined);
  seed.mockResolvedValue(undefined);
});

describe('initial load', () => {
  it('loads the snapshot for the signed-in user with their DEK', async () => {
    const { result } = await renderTasks();

    expect(fetchSnapshot).toHaveBeenCalledWith('u1', dek);
    expect(result.current.activeTasks.map((t) => t.id)).toEqual([1, 2]);
    expect(seed).not.toHaveBeenCalled();
  });

  it('seeds demo data and reloads when the account is empty', async () => {
    fetchSnapshot.mockResolvedValueOnce(snapshotWith([])).mockResolvedValueOnce(snapshotWith([task(9, 0)]));

    const { result } = await renderTasks();

    expect(seed).toHaveBeenCalledWith('u1', dek);
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(result.current.activeTasks.map((t) => t.id)).toEqual([9]);
  });

  it('does not seed while the DEK is not available', async () => {
    mockAuthState.dek = null;
    fetchSnapshot.mockResolvedValue(snapshotWith([]));

    await renderTasks();

    expect(seed).not.toHaveBeenCalled();
  });

  it('does not query anything when signed out', async () => {
    mockAuthState.user = null;
    mockAuthState.dek = null;

    const { result } = await renderTasks();

    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(result.current.tasks).toEqual([]);
  });
});

describe('addTask', () => {
  it('writes nothing while the app is locked (no DEK)', async () => {
    mockAuthState.dek = null;
    const { result } = await renderTasks();

    await act(async () => {
      await expect(result.current.addTask(input)).rejects.toThrow();
    });

    expect(insertTask).not.toHaveBeenCalled();
    expect(fetchSnapshot).toHaveBeenCalledTimes(1); // only the initial load
  });

  it('throws "Not signed in" and writes nothing without a user', async () => {
    mockAuthState.user = null;
    const { result } = await renderTasks();

    await act(async () => {
      await expect(result.current.addTask(input)).rejects.toThrow('Not signed in');
    });

    expect(insertTask).not.toHaveBeenCalled();
  });

  it('encrypts with the session DEK, puts the new task first and refreshes the list', async () => {
    const { result } = await renderTasks();

    await act(async () => {
      await result.current.addTask(input);
    });

    expect(insertTask).toHaveBeenCalledWith({
      userId: 'u1',
      dek,
      title: 'Buy milk',
      description: 'Two liters',
      categoryId: 2,
      tagIds: [1],
      scheduled: null,
      sortOrder: 2, // lowest existing sortOrder (3) minus 1
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
  });

  it('uses sortOrder 0 when the list is empty', async () => {
    fetchSnapshot.mockResolvedValue({ ...snapshotWith([task(1, 1)]), activeTasks: [] , completedTasks: [task(7, 0)] });
    const { result } = await renderTasks();

    await act(async () => {
      await result.current.addTask(input);
    });

    expect(insertTask).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 0 }));
  });

  it('passes the scheduled date through', async () => {
    const { result } = await renderTasks();

    await act(async () => {
      await result.current.addTask({ ...input, scheduled: '2026-11-10' });
    });

    expect(insertTask).toHaveBeenCalledWith(expect.objectContaining({ scheduled: '2026-11-10' }));
  });

  it('propagates a write error and does not refresh the list', async () => {
    const err = new Error('db down');
    insertTask.mockRejectedValue(err);
    const { result } = await renderTasks();

    await act(async () => {
      await expect(result.current.addTask(input)).rejects.toBe(err);
    });

    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe('updateTask', () => {
  it('writes nothing while the app is locked (no DEK)', async () => {
    mockAuthState.dek = null;
    const { result } = await renderTasks();

    await act(async () => {
      await expect(result.current.updateTask(1, input)).rejects.toThrow();
    });

    expect(updateTask).not.toHaveBeenCalled();
  });

  it('encrypts with the session DEK and refreshes the list', async () => {
    const { result } = await renderTasks();

    await act(async () => {
      await result.current.updateTask(1, input);
    });

    expect(updateTask).toHaveBeenCalledWith({
      userId: 'u1',
      dek,
      id: 1,
      title: 'Buy milk',
      description: 'Two liters',
      categoryId: 2,
      tagIds: [1],
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
  });
});
