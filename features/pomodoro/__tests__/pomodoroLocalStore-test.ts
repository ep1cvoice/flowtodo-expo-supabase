import { createBuilder, callsOf } from '@/test/supabaseMock';
import { createMemoryDb } from '@/test/memoryDb';
import { supabase } from '@/core/supabase/client';
import { localTaskStore } from '@/features/tasks/lib/store/localStore';
import { localPomodoroStore as store } from '@/features/pomodoro/lib/store/localStore';
import {
  applyRemotePomodoros,
  pushPomodoroDeletes,
  pushPomodoros,
} from '@/features/pomodoro/lib/store/pomodoroSync';

const mockMemory = createMemoryDb();
jest.mock('@/core/localdb/openUserDb', () => ({ openUserDb: async () => mockMemory }));
jest.mock('@/core/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/shared/lib/logger', () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));
jest.mock('@/features/tasks/lib/store/localStore', () => ({
  localTaskStore: { requestSync: jest.fn() },
}));
jest.mock('@/features/tasks/lib/store/syncEngine', () => ({
  hasPulled: jest.fn(async () => true),
  pullAll: jest.fn(async () => true),
}));
jest.mock('@/core/crypto', () => ({
  encryptField: async (_d: Uint8Array, text: string) => ({ ciphertext: `enc(${text})`, iv: 'iv' }),
  decryptField: (_d: Uint8Array, ct: string) => ct.slice(4, -1),
  hashForUniqueness: (_d: Uint8Array, text: string) => `h(${text})`,
}));

const from = supabase.from as jest.Mock;
const db = mockMemory as never;
const dek = new Uint8Array(32);
const start = { userId: 'u1', dek, taskId: 7, taskName: 'Write', durationSec: 1500 };
const T0 = '2026-01-01T10:00:00.000Z';

const rows = () =>
  mockMemory.getAllAsync<any>('SELECT * FROM pomodoros ORDER BY id');

beforeEach(async () => {
  await mockMemory.execAsync('DELETE FROM pomodoros; DELETE FROM tasks');
  jest.clearAllMocks();
  from.mockReset();
});

describe('local pomodoro store', () => {
  it('starts a session locally as a dirty row and requests a sync', async () => {
    const pomo = await store.insertPomodoro({ ...start, startedAt: T0 });
    expect(pomo).toMatchObject({ taskId: 7, duration: 1500, elapsed: 0, pausedAt: null });
    expect((await rows())[0]).toMatchObject({ sync_state: 'dirty', task_name_enc: 'enc(Write)' });
    expect(localTaskStore.requestSync).toHaveBeenCalledWith('u1');
  });

  it('pauses, resumes and ends a session, then lists it in history and stats', async () => {
    const { id } = await store.insertPomodoro({ ...start, startedAt: T0 });
    await store.pausePomodoroRow({ userId: 'u1', id, elapsed: 5000, pausedAt: T0 });
    expect((await store.fetchPomodoros('u1', dek)).active).toMatchObject({
      elapsed: 5000,
      pausedAt: T0,
    });

    const resumed = await store.resumePomodoroAndFetch({ userId: 'u1', id, startedAt: T0 });
    expect(resumed.pausedAt).toBeNull();

    await store.endPomodoroRow({
      userId: 'u1',
      dek,
      id,
      elapsed: 9000,
      endedAt: '2026-01-01T11:00:00.000Z',
      taskName: 'Write',
    });
    const { active, history } = await store.fetchPomodoros('u1', dek);
    expect(active).toBeNull();
    expect(history).toMatchObject([{ id, taskName: 'Write', elapsed: 9000 }]);
    expect(await store.fetchStatsRows('u1', T0)).toEqual([
      { endedAt: '2026-01-01T11:00:00.000Z', elapsed: 9000, duration: 1500 },
    ]);
  });

  it('only freezes still-active sessions when onlyActive is set', async () => {
    const { id } = await store.insertPomodoro({ ...start, startedAt: T0 });
    await store.endPomodoroRow({ userId: 'u1', dek, id, elapsed: 1, endedAt: T0, taskName: 'x' });
    await store.pausePomodoroRow({ userId: 'u1', id, elapsed: 2, pausedAt: T0, onlyActive: true });
    expect((await rows())[0]).toMatchObject({ elapsed: 1, paused_at: null });
  });

  it('deletes only finished sessions (soft, until synced)', async () => {
    const { id } = await store.insertPomodoro({ ...start, startedAt: T0 });
    await store.deletePomodoroRecord('u1', id);
    expect((await rows())[0].sync_state).toBe('dirty');
    await store.endPomodoroRow({ userId: 'u1', dek, id, elapsed: 1, endedAt: T0, taskName: 'x' });
    await store.deletePomodoroRecord('u1', id);
    expect((await rows())[0].sync_state).toBe('deleted');
    expect((await store.fetchPomodoros('u1', dek)).history).toEqual([]);
  });
});

describe('pomodoro sync', () => {
  const mockUpsert = (errors: ({ code: string } | null)[]) => {
    const builders: any[] = [];
    from.mockImplementation(() => {
      const b = createBuilder({ error: errors[builders.length] ?? null });
      builders.push(b);
      return b;
    });
    return builders;
  };

  it('pushes dirty sessions and marks them synced', async () => {
    const { id } = await store.insertPomodoro({ ...start, startedAt: T0 });
    await mockMemory.execAsync(`INSERT INTO tasks (id, done, sort_order, tag_ids, created_at, updated_at)
      VALUES (7, 0, 0, '[]', 'x', 'x')`);
    const builders = mockUpsert([]);
    await pushPomodoros(db, 'u1');
    expect(callsOf(builders[0], 'upsert')[0][0]).toMatchObject({
      id,
      user_id: 'u1',
      task_id: 7,
      paused_on_logout: false,
    });
    expect((await rows())[0].sync_state).toBe('synced');
  });

  it('drops a reference to a task that no longer exists', async () => {
    await store.insertPomodoro({ ...start, startedAt: T0 });
    const builders = mockUpsert([]);
    await pushPomodoros(db, 'u1');
    expect(callsOf(builders[0], 'upsert')[0][0]).toMatchObject({ task_id: null });
  });

  it('finishes a local session locally when the server already has an active one', async () => {
    const { id } = await store.insertPomodoro({ ...start, startedAt: T0 });
    await mockMemory.execAsync(`INSERT INTO tasks (id, done, sort_order, tag_ids, created_at, updated_at)
      VALUES (7, 0, 0, '[]', 'x', 'x')`);
    mockUpsert([{ code: '23505' }]);
    await pushPomodoros(db, 'u1');
    const row = (await rows())[0];
    expect(row).toMatchObject({ id, sync_state: 'synced' });
    expect(row.ended_at).not.toBeNull();
  });

  it('purges deleted rows after the server confirmed', async () => {
    const { id } = await store.insertPomodoro({ ...start, startedAt: T0 });
    await store.endPomodoroRow({ userId: 'u1', dek, id, elapsed: 1, endedAt: T0, taskName: 'x' });
    await store.deletePomodoroRecord('u1', id);
    mockUpsert([]);
    await pushPomodoroDeletes(db, 'u1');
    expect(await rows()).toEqual([]);
  });

  it('mirrors remote rows but keeps pending local changes', async () => {
    const { id } = await store.insertPomodoro({ ...start, startedAt: T0 });
    await mockMemory.execAsync(
      `INSERT INTO pomodoros (id, duration, started_at, created_at, sync_state) VALUES (99, 1, 'x', 'x', 'synced')`
    );
    const remote = (rowId: number, elapsed: number) => ({
      id: rowId,
      task_id: null,
      task_name_enc: null,
      task_name_iv: null,
      duration: 1500,
      elapsed,
      started_at: '2026-01-01T11:00:00+01:00',
      paused_at: null,
      ended_at: '2026-01-01T11:30:00+01:00',
      paused_on_logout: false,
      created_at: T0,
    });
    await applyRemotePomodoros(db, [remote(id, 777), remote(5, 100)]);
    const all = await rows();
    expect(all.map((r) => r.id)).toEqual([5, id]);
    expect(all.find((r) => r.id === id)).toMatchObject({ elapsed: 0, sync_state: 'dirty' });
    expect(all.find((r) => r.id === 5)).toMatchObject({
      started_at: '2026-01-01T10:00:00.000Z',
      sync_state: 'synced',
    });
  });
});
