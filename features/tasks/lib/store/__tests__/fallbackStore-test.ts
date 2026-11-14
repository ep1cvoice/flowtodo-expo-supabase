import { withFallback } from '@/features/tasks/lib/store/fallbackStore';
import type { TaskStore } from '@/features/tasks/lib/store/types';

jest.mock('@/shared/lib/logger', () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

const fakeStore = (name: string) =>
  ({
    localFirst: true,
    fetchTasksSnapshot: jest.fn(async () => ({ from: name })),
    insertTask: jest.fn(async () => 1),
    deleteTask: jest.fn(async () => {}),
    requestSync: jest.fn(),
    flush: jest.fn(async () => {}),
    subscribe: jest.fn(() => () => {}),
    getSyncStatus: jest.fn(),
    subscribeSyncStatus: jest.fn(() => () => {}),
  }) as unknown as TaskStore & Record<string, jest.Mock>;

const flush = () => new Promise<void>((r) => setImmediate(r));

it('uses the local store when the database opens, passing userId from options objects too', async () => {
  const local = fakeStore('local');
  const remote = fakeStore('remote');
  const probe = jest.fn(async () => {});
  const store = withFallback(local, remote, probe);

  expect(await store.fetchTasksSnapshot('u1', null)).toEqual({ from: 'local' });
  await store.insertTask({ userId: 'u1' } as never);
  expect(local.insertTask).toHaveBeenCalled();
  expect(remote.fetchTasksSnapshot).not.toHaveBeenCalled();
  expect(probe).toHaveBeenCalledTimes(1); // decided once per user
  expect(store.localFirst).toBe(true);

  store.requestSync('u1');
  await flush();
  expect(local.requestSync).toHaveBeenCalledWith('u1');
});

it('falls back to the online store for good when the database cannot be opened', async () => {
  const local = fakeStore('local');
  const remote = fakeStore('remote');
  const store = withFallback(local, remote, async () => {
    throw new Error('OPFS locked by another tab');
  });

  expect(await store.fetchTasksSnapshot('u1', null)).toEqual({ from: 'remote' });
  await store.deleteTask('u1', 5);
  expect(remote.deleteTask).toHaveBeenCalledWith('u1', 5);
  expect(local.deleteTask).not.toHaveBeenCalled();
  expect(store.localFirst).toBe(false);

  store.requestSync('u1');
  await store.flush('u1');
  await flush();
  expect(local.requestSync).not.toHaveBeenCalled();
  expect(local.flush).not.toHaveBeenCalled();
});
