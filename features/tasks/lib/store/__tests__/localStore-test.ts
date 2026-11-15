import { createMemoryDb } from '@/test/memoryDb';

import { setKnownOnline } from '@/shared/lib/connectivity';
import { newLocalId } from '@/features/tasks/lib/store/localId';
import { cancelSyncRetries, localTaskStore as store } from '@/features/tasks/lib/store/localStore';
import { hasPulled, pullAll, pushPending, syncOnce } from '@/features/tasks/lib/store/syncEngine';
import { SyncSessionError } from '@/features/tasks/lib/store/syncGuard';
import { COMPLETED_PAGE_SIZE } from '@/features/tasks/lib/completedPagination';

const mockMemory = createMemoryDb();
jest.mock('@/core/localdb/openUserDb', () => ({ openUserDb: async () => mockMemory }));
jest.mock('@/core/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/shared/lib/logger', () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));
jest.mock('@/features/tasks/lib/store/syncEngine', () => ({
  ...jest.requireActual('@/features/tasks/lib/store/syncEngine'),
  hasPulled: jest.fn(async () => true),
  pullAll: jest.fn(async () => true),
  pushPending: jest.fn(async () => {}),
  syncOnce: jest.fn(async () => {}),
}));
jest.mock('@/core/crypto', () => ({
  encryptField: async (_d: Uint8Array, text: string) => ({ ciphertext: `enc(${text})`, iv: 'iv' }),
  decryptField: (_d: Uint8Array, ct: string) => ct.slice(4, -1),
  hashForUniqueness: (_d: Uint8Array, text: string) => `h(${text})`,
}));

const dek = new Uint8Array(32);
const base = { userId: 'u1', dek, description: '', categoryId: null, tagIds: [], scheduled: null };

afterEach(() => {
  jest.useRealTimers();
  cancelSyncRetries();
});

beforeEach(async () => {
  setKnownOnline(true);
  for (const t of ['tasks', 'categories', 'tags', 'meta'])
    await mockMemory.execAsync(`DELETE FROM ${t}`);
  jest.clearAllMocks();
  // clearAllMocks keeps implementations; a hanging one must not leak into the next test.
  (syncOnce as jest.Mock).mockImplementation(async () => {});
});

it('generates unique, increasing ids within the safe integer range', () => {
  const ids = Array.from({ length: 50 }, newLocalId);
  expect(new Set(ids).size).toBe(50);
  expect(ids.every((id) => Number.isSafeInteger(id))).toBe(true);
});

it('writes tasks locally as dirty, readable immediately, and requests a sync', async () => {
  const id = await store.insertTask({ ...base, title: 'Buy milk', sortOrder: 0 });
  const snapshot = await store.fetchTasksSnapshot('u1', dek);

  expect(snapshot.activeTasks).toMatchObject([{ id, title: 'Buy milk', done: false }]);
  expect(
    (await mockMemory.getFirstAsync<{ sync_state: string }>('SELECT sync_state FROM tasks'))!
      .sync_state
  ).toBe('dirty');
  await new Promise<void>((r) => setImmediate(r));
  expect(syncOnce).toHaveBeenCalledWith(expect.anything(), 'u1', {
    signal: expect.anything(),
  });
});

it('moves tasks between active and completed and pages completed ones', async () => {
  const a = await store.insertTask({ ...base, title: 'A', sortOrder: 0 });
  const b = await store.insertTask({ ...base, title: 'B', sortOrder: 1 });
  await store.setTaskCompletedAt('u1', a, '2026-03-01T10:00:00.000Z');
  await store.setTaskCompletedAt('u1', b, '2026-03-02T10:00:00.000Z');

  const snapshot = await store.fetchTasksSnapshot('u1', dek);
  expect(snapshot.activeTasks).toHaveLength(0);
  expect(snapshot.completedTasks.map((t) => t.title)).toEqual(['B', 'A']);
  expect(snapshot.completedCount).toBe(2);

  const page = await store.fetchCompletedPage(
    'u1',
    { completedAt: '2026-03-02T10:00:00.000Z', id: b },
    dek,
    { categories: new Map(), tags: new Map() }
  );
  expect(page.page.map((t) => t.title)).toEqual(['A']);
});

it('hides deleted rows while keeping a tombstone for the next push', async () => {
  const id = await store.insertTask({ ...base, title: 'Gone', sortOrder: 0 });
  await store.deleteTask('u1', id);

  expect((await store.fetchTasksSnapshot('u1', dek)).activeTasks).toHaveLength(0);
  expect(
    await store.fetchTaskById('u1', id, dek, { categories: new Map(), tags: new Map() })
  ).toBeNull();
  expect(
    (await mockMemory.getFirstAsync<{ sync_state: string }>('SELECT sync_state FROM tasks'))!
      .sync_state
  ).toBe('deleted');
});

it('cleans label references locally when a category or tag is deleted', async () => {
  const cat = await store.insertCategory('u1', dek, {
    name: 'Work',
    color: '#111',
    icon: 'Briefcase',
  });
  const tag = await store.insertTag('u1', dek, { name: 'urgent', color: '#222' });
  const id = await store.insertTask({
    ...base,
    title: 'T',
    categoryId: cat.id,
    tagIds: [tag.id],
    sortOrder: 0,
  });

  let task = (await store.fetchTasksSnapshot('u1', dek)).activeTasks[0];
  expect(task).toMatchObject({ id, category: { name: 'Work' }, tags: [{ name: 'urgent' }] });

  await store.deleteCategory('u1', cat.id);
  await store.deleteTag('u1', tag.id);
  const snapshot = await store.fetchTasksSnapshot('u1', dek);
  task = snapshot.activeTasks[0];
  expect(snapshot.categories).toHaveLength(0);
  expect(task.category).toBeNull();
  expect(task.tags).toEqual([]);
});

it('rejects a duplicate label name locally', async () => {
  await store.insertTag('u1', dek, { name: 'x', color: '#222' });
  await expect(store.insertTag('u1', dek, { name: 'x', color: '#333' })).rejects.toThrow();
});

it('pulls before the first read on a fresh device', async () => {
  // Checked once before queueing the pull and once more when its turn comes.
  (hasPulled as jest.Mock).mockResolvedValueOnce(false).mockResolvedValueOnce(false);
  await store.fetchTasksSnapshot('u1', dek);
  expect(pullAll).toHaveBeenCalledTimes(1);
});

it('exposes sync status: pending changes, then up to date after a round', async () => {
  await store.insertTask({ ...base, title: 'S', sortOrder: 0 });
  await new Promise<void>((r) => setTimeout(r, 20));
  const status = store.getSyncStatus();
  expect(status.syncing).toBe(false);
  expect(status.error).toBeNull();
  expect(status.lastSyncedAt).not.toBeNull();
  // syncOnce is mocked, so the row is still dirty and counted as pending.
  expect(status.pending).toBe(1);
});

it('reports a failed push in the status', async () => {
  (syncOnce as jest.Mock).mockResolvedValueOnce(new Error('offline'));
  await store.insertTask({ ...base, title: 'E', sortOrder: 0 });
  await new Promise<void>((r) => setTimeout(r, 20));
  expect(store.getSyncStatus().error).toBe('offline');
});

it('flush pushes pending rows and rejects when offline', async () => {
  await store.insertTask({ ...base, title: 'F', sortOrder: 0 });
  await new Promise<void>((r) => setTimeout(r, 20));
  await store.flush('u1');
  expect(pushPending).toHaveBeenCalled();

  (pushPending as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await expect(store.flush('u1')).rejects.toThrow('offline');
});

it('does not start a sync while offline, so the status never shows "syncing"', async () => {
  setKnownOnline(false);
  await store.insertTask({ ...base, title: 'Offline', sortOrder: 0 });
  await new Promise<void>((r) => setTimeout(r, 20));

  expect(syncOnce).not.toHaveBeenCalled();
  expect(store.getSyncStatus().syncing).toBe(false);
  expect(store.getSyncStatus().pending).toBe(1);
  await expect(store.flush('u1')).rejects.toThrow();
});

it('turns object-shaped (Supabase) errors into readable status text', async () => {
  (syncOnce as jest.Mock).mockRejectedValueOnce({ message: 'permission denied', code: '42501' });
  await store.insertTask({ ...base, title: 'E2', sortOrder: 0 });
  await new Promise<void>((r) => setTimeout(r, 20));
  expect(store.getSyncStatus().error).toBe('permission denied');
});

it('retries a failed round with backoff and stops once it succeeds', async () => {
  jest.useFakeTimers();
  (syncOnce as jest.Mock)
    .mockResolvedValueOnce(new Error('Network request failed'))
    .mockResolvedValueOnce(new Error('Network request failed'))
    .mockResolvedValue(null);

  await store.insertTask({ ...base, title: 'R', sortOrder: 0 });
  await jest.advanceTimersByTimeAsync(10);
  expect(syncOnce).toHaveBeenCalledTimes(1);
  expect(store.getSyncStatus().error).toBe('Network request failed');

  await jest.advanceTimersByTimeAsync(2_000); // first retry
  expect(syncOnce).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(5_000); // second retry succeeds
  expect(syncOnce).toHaveBeenCalledTimes(3);
  expect(store.getSyncStatus().error).toBeNull();

  await jest.advanceTimersByTimeAsync(120_000); // nothing more scheduled
  expect(syncOnce).toHaveBeenCalledTimes(3);
});

it('does not poll while offline; the reconnect sync takes over', async () => {
  jest.useFakeTimers();
  (syncOnce as jest.Mock).mockResolvedValueOnce(new Error('Network request failed'));
  await store.insertTask({ ...base, title: 'O', sortOrder: 0 });
  await jest.advanceTimersByTimeAsync(10);
  setKnownOnline(false);
  await jest.advanceTimersByTimeAsync(120_000);
  expect(syncOnce).toHaveBeenCalledTimes(1);
});

it('a timed-out round is cancelled, and the next one starts only after it stopped', async () => {
  jest.useFakeTimers();
  let running = 0;
  let maxRunning = 0;
  let firstSignal: AbortSignal | undefined;
  (syncOnce as jest.Mock).mockImplementation(
    (_db: unknown, _u: string, { signal }: { signal: AbortSignal }) => {
      firstSignal ??= signal;
      running++;
      maxRunning = Math.max(maxRunning, running);
      return new Promise((resolve, reject) => {
        // Hangs until aborted (like a request on a dead connection), then needs a moment.
        signal.addEventListener('abort', () =>
          setTimeout(() => {
            running--;
            reject(new Error('aborted'));
          }, 1_000)
        );
      });
    }
  );

  await store.insertTask({ ...base, title: 'T', sortOrder: 0 });
  await jest.advanceTimersByTimeAsync(30_000); // the round times out
  expect(firstSignal?.aborted).toBe(true);
  store.requestSync('u1'); // arrives while the cancelled round is still stopping
  await jest.advanceTimersByTimeAsync(500);
  expect(syncOnce).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(1_000);
  expect(syncOnce).toHaveBeenCalledTimes(2);
  expect(maxRunning).toBe(1);
  const stopping = store.stopSync('u1');
  await jest.advanceTimersByTimeAsync(2_000);
  await stopping;
});

it('stopSync aborts the running round and cancels scheduled retries', async () => {
  jest.useFakeTimers();
  let signal: AbortSignal | undefined;
  (syncOnce as jest.Mock).mockResolvedValueOnce(new Error('Network request failed'));
  await store.insertTask({ ...base, title: 'L', sortOrder: 0 });
  await jest.advanceTimersByTimeAsync(10);
  expect(syncOnce).toHaveBeenCalledTimes(1); // failed, a retry is scheduled

  await store.stopSync('u1');
  await jest.advanceTimersByTimeAsync(120_000);
  expect(syncOnce).toHaveBeenCalledTimes(1);

  (syncOnce as jest.Mock).mockImplementationOnce(
    (_db: unknown, _u: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise((_resolve, reject) =>
        signal!.addEventListener('abort', () => reject(new Error('aborted')))
      );
    }
  );
  store.requestSync('u1');
  await jest.advanceTimersByTimeAsync(10);
  await store.stopSync('u1');
  expect(signal?.aborted).toBe(true);
});

it('does not retry a round that had no session for the account', async () => {
  jest.useFakeTimers();
  (syncOnce as jest.Mock).mockRejectedValueOnce(new SyncSessionError());
  await store.insertTask({ ...base, title: 'N', sortOrder: 0 });
  await jest.advanceTimersByTimeAsync(120_000);
  expect(syncOnce).toHaveBeenCalledTimes(1);
});

it('a re-read keeps as many completed tasks as are already loaded', async () => {
  for (let i = 0; i < COMPLETED_PAGE_SIZE + 5; i++) {
    const id = await store.insertTask({ ...base, title: `C${i}`, sortOrder: i });
    await store.setTaskCompletedAt('u1', id, new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString());
  }

  const first = await store.fetchTasksSnapshot('u1', dek);
  expect(first.completedTasks).toHaveLength(COMPLETED_PAGE_SIZE);
  expect(first.hasMore).toBe(true);

  const reread = await store.fetchTasksSnapshot('u1', dek, {
    completedLimit: COMPLETED_PAGE_SIZE + 5,
  });
  expect(reread.completedTasks).toHaveLength(COMPLETED_PAGE_SIZE + 5);
  expect(reread.hasMore).toBe(false);
});
