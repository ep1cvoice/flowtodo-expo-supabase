import { createBuilder, callsOf } from '@/test/supabaseMock';
import { createMemoryDb } from '@/test/memoryDb';

import { withDbLock, writeTransaction } from '@/core/localdb/dbLock';
import { SyncAbortedError, SyncSessionError } from '@/features/tasks/lib/store/syncGuard';

import { supabase } from '@/core/supabase/client';
import {
  countPending,
  hasPulled,
  normalizeTimestamp,
  pullAll,
  pushPending,
  syncOnce,
} from '@/features/tasks/lib/store/syncEngine';

const mockRpc = jest.fn();
jest.mock('@/core/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    // Like the real builder: awaitable and cancellable with `.abortSignal()`.
    rpc: (...args: unknown[]) => {
      const result = Promise.resolve(mockRpc(...args));
      return Object.assign(result, { abortSignal: () => result });
    },
    auth: { getSession: jest.fn() },
  },
}));
jest.mock('@/shared/lib/logger', () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

const from = supabase.from as jest.Mock;
const rpc = mockRpc;
const getSession = supabase.auth.getSession as jest.Mock;
const sessionOf = (id: string | null) => ({
  data: { session: id ? { user: { id } } : null },
  error: null,
});
const asDb = (db: ReturnType<typeof createMemoryDb>) => db as never;

const remoteTask = (id: number, extra: object = {}) => ({
  id,
  user_id: 'u1',
  title_enc: `t${id}`,
  title_iv: 'iv',
  description_enc: null,
  description_iv: null,
  done: false,
  scheduled: null,
  completed_at: null,
  sort_order: id,
  category_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  task_tags: [],
  ...extra,
});

/** Routes supabase.from(table) to a builder holding that table's remote rows. */
function mockRemote(tables: Record<string, unknown[]>) {
  const builders: Record<string, any[]> = {};
  from.mockImplementation((table: string) => {
    const b = createBuilder({ data: tables[table] ?? [] });
    (builders[table] ??= []).push(b);
    return b;
  });
  return builders;
}

const insertDirtyTask = (db: ReturnType<typeof createMemoryDb>, id: number, state = 'dirty') =>
  db.runAsync(
    `INSERT INTO tasks (id, title_enc, title_iv, done, sort_order, tag_ids, created_at, updated_at, sync_state, rev)
     VALUES (?, 'local', 'iv', 0, 0, '[5]', 'x', 'x', ?, 1)`,
    id,
    state
  );

beforeEach(() => {
  from.mockReset();
  rpc.mockReset().mockResolvedValue({ error: null });
  getSession.mockReset().mockResolvedValue(sessionOf('u1'));
});

describe('normalizeTimestamp', () => {
  it('turns Postgres offsets into canonical UTC strings', () => {
    expect(normalizeTimestamp('2026-02-01T01:00:00+01:00')).toBe('2026-02-01T00:00:00.000Z');
    expect(normalizeTimestamp(null)).toBeNull();
  });
});

describe('pullAll', () => {
  it('mirrors remote rows, removes synced rows deleted remotely and records the pull', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 99, 'synced');
    mockRemote({ tasks: [remoteTask(1, { task_tags: [{ tag_id: 7 }] })] });

    expect(await hasPulled(asDb(db))).toBe(false);
    await pullAll(asDb(db), 'u1');

    const ids = (await db.getAllAsync<{ id: number }>('SELECT id FROM tasks')).map((r) => r.id);
    expect(ids).toEqual([1]);
    expect(await hasPulled(asDb(db))).toBe(true);
  });

  it('never overwrites or removes rows with pending local changes', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 1, 'dirty');
    await insertDirtyTask(db, 2, 'deleted');
    mockRemote({ tasks: [remoteTask(1), remoteTask(2)] });

    await pullAll(asDb(db), 'u1');

    const rows = await db.getAllAsync<{ id: number; title_enc: string; sync_state: string }>(
      'SELECT id, title_enc, sync_state FROM tasks ORDER BY id'
    );
    expect(rows).toEqual([
      { id: 1, title_enc: 'local', sync_state: 'dirty' },
      { id: 2, title_enc: 'local', sync_state: 'deleted' },
    ]);
  });

  it('drops references to labels that no longer exist', async () => {
    const db = createMemoryDb();
    mockRemote({ tasks: [remoteTask(1, { category_id: 3, task_tags: [{ tag_id: 7 }] })] });
    await pullAll(asDb(db), 'u1');
    const row = await db.getFirstAsync<{ category_id: number | null; tag_ids: string }>(
      'SELECT * FROM tasks'
    );
    expect(row).toMatchObject({ category_id: null, tag_ids: '[]' });
  });
});

describe('pushPending', () => {
  it('upserts dirty tasks, replaces their tags and marks them synced', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 10);
    const builders = mockRemote({});

    await pushPending(asDb(db), 'u1');

    expect(callsOf(builders.tasks[0], 'upsert')[0][0]).toMatchObject({
      id: 10,
      user_id: 'u1',
      title_enc: 'local',
    });
    expect(callsOf(builders.tasks[0], 'upsert')[0][0]).not.toHaveProperty('done');
    expect(rpc).toHaveBeenCalledWith(
      'update_task_with_tags',
      expect.objectContaining({ p_task_id: 10, p_tag_ids: [5] })
    );
    expect(
      (await db.getFirstAsync<{ sync_state: string }>('SELECT sync_state FROM tasks'))!.sync_state
    ).toBe('synced');
  });

  it('deletes remotely and purges rows marked deleted', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 10, 'deleted');
    const builders = mockRemote({});

    await pushPending(asDb(db), 'u1');

    expect(callsOf(builders.tasks[0], 'delete')).toHaveLength(1);
    expect(await db.getAllAsync('SELECT id FROM tasks')).toHaveLength(0);
  });

  it('keeps a row dirty when it changed while the push was in flight', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 10);
    rpc.mockImplementation(async () => {
      await db.runAsync('UPDATE tasks SET rev = rev + 1 WHERE id = 10');
      return { error: null };
    });
    mockRemote({});

    await pushPending(asDb(db), 'u1');

    expect(
      (await db.getFirstAsync<{ sync_state: string }>('SELECT sync_state FROM tasks'))!.sync_state
    ).toBe('dirty');
  });

  it('adopts the remote label when another device created the same name', async () => {
    const db = createMemoryDb();
    await db.runAsync(
      `INSERT INTO categories (id, name_enc, name_iv, name_hash, color, icon, created_at, sync_state, rev)
       VALUES (1, 'n', 'iv', 'h', '#000', 'x', 'x', 'dirty', 1)`
    );
    await db.runAsync(
      `INSERT INTO tasks (id, category_id, created_at, updated_at, sync_state) VALUES (10, 1, 'x', 'x', 'synced')`
    );
    // First categories call (upsert) fails with a unique violation, second (lookup) returns the remote row.
    let call = 0;
    from.mockImplementation((table: string) => {
      if (table !== 'categories') return createBuilder({});
      return createBuilder(call++ === 0 ? { error: { code: '23505' } } : { data: { id: 500 } });
    });

    await pushPending(asDb(db), 'u1');

    expect(await db.getAllAsync('SELECT id FROM categories')).toHaveLength(0);
    expect(
      (await db.getFirstAsync<{ category_id: number }>(
        'SELECT category_id FROM tasks WHERE id = 10'
      ))!.category_id
    ).toBe(500);
  });
});

describe('id collisions', () => {
  it('gives a task a new id and retries when another user already owns its id', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 10);
    const builders: any[] = [];
    let n = 0;
    from.mockImplementation(() => {
      const b = createBuilder({ error: n++ === 0 ? { code: '42501' } : null });
      builders.push(b);
      return b;
    });

    await pushPending(asDb(db), 'u1');

    const rows = await db.getAllAsync<{ id: number; sync_state: string }>(
      'SELECT id, sync_state FROM tasks'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).not.toBe(10);
    expect(rows[0].sync_state).toBe('synced');
    expect(callsOf(builders[1], 'upsert')[0][0].id).toBe(rows[0].id);
    expect(rpc).toHaveBeenCalledWith(
      'update_task_with_tags',
      expect.objectContaining({ p_task_id: rows[0].id })
    );
  });
});

describe('countPending', () => {
  it('counts rows that are not synced yet', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 1, 'dirty');
    await insertDirtyTask(db, 2, 'deleted');
    await insertDirtyTask(db, 3, 'synced');
    expect(await countPending(asDb(db))).toBe(2);
  });
});

describe('syncOnce', () => {
  it('still pulls when the push fails, keeping the row pending', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 10);
    mockRemote({ tasks: [remoteTask(1)] });
    rpc.mockResolvedValue({ error: { message: 'offline', code: 'X' } });

    const pushError = await syncOnce(asDb(db), 'u1');
    expect(pushError?.message).toBe('offline');

    const rows = await db.getAllAsync<{ id: number; sync_state: string }>(
      'SELECT id, sync_state FROM tasks ORDER BY id'
    );
    expect(rows).toEqual([
      { id: 1, sync_state: 'synced' },
      { id: 10, sync_state: 'dirty' },
    ]);
  });
});

describe('session guard', () => {
  it('does not apply a pull (or wipe the replica) without this account’s session', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 1, 'synced');
    mockRemote({ tasks: [] }); // what RLS answers without a session

    for (const session of [sessionOf(null), sessionOf('someone-else')]) {
      getSession.mockResolvedValue(session);
      await expect(pullAll(asDb(db), 'u1')).rejects.toThrow(SyncSessionError);
    }

    expect(await db.getAllAsync('SELECT id FROM tasks')).toHaveLength(1);
    expect(await hasPulled(asDb(db))).toBe(false);
  });

  it('does not apply a pull when the session ended while it was in flight', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 1, 'synced');
    mockRemote({ tasks: [] });
    getSession.mockResolvedValueOnce(sessionOf('u1')).mockResolvedValue(sessionOf(null));

    await expect(pullAll(asDb(db), 'u1')).rejects.toThrow(SyncSessionError);
    expect(await db.getAllAsync('SELECT id FROM tasks')).toHaveLength(1);
  });

  it('pushes nothing (and gives no row a new id) with another account’s session', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 10);
    mockRemote({});
    getSession.mockResolvedValue(sessionOf('someone-else'));

    await expect(syncOnce(asDb(db), 'u1')).rejects.toThrow(SyncSessionError);
    expect(from).not.toHaveBeenCalled();
    expect(await db.getAllAsync('SELECT id, sync_state FROM tasks')).toEqual([
      { id: 10, sync_state: 'dirty' },
    ]);
  });

  it('stops before the next request once the round is aborted', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 10);
    mockRemote({});
    const controller = new AbortController();
    controller.abort();

    await expect(syncOnce(asDb(db), 'u1', { signal: controller.signal })).rejects.toThrow(
      SyncAbortedError
    );
    expect(from).not.toHaveBeenCalled();
  });
});

describe('label deleted and re-created under the same name', () => {
  it('deletes the old label remotely before creating the new one', async () => {
    const db = createMemoryDb();
    await db.runAsync(
      `INSERT INTO categories (id, name_enc, name_iv, name_hash, color, icon, created_at, sync_state, rev)
       VALUES (1, 'n', 'iv', 'h', '#000', 'x', 'x', 'deleted', 2),
              (2, 'n', 'iv', 'h', '#000', 'x', 'x', 'dirty', 1)`
    );
    await db.runAsync(
      `INSERT INTO tasks (id, category_id, created_at, updated_at, sync_state) VALUES (10, 2, 'x', 'x', 'synced')`
    );
    const builders = mockRemote({});

    await pushPending(asDb(db), 'u1');

    // One builder per request, in request order.
    const order = builders.categories.map((b) =>
      callsOf(b, 'delete').length ? 'delete' : callsOf(b, 'upsert').length ? 'upsert' : '?'
    );
    expect(order).toEqual(['delete', 'upsert']);
    expect(await db.getAllAsync('SELECT id, sync_state FROM categories')).toEqual([
      { id: 2, sync_state: 'synced' },
    ]);
    expect(
      (await db.getFirstAsync<{ category_id: number }>('SELECT category_id FROM tasks'))!
        .category_id
    ).toBe(2);
  });
});

describe('adopting a remote tag', () => {
  it('re-points only tasks that really carry the tag (not 120, 312…)', async () => {
    const db = createMemoryDb();
    await db.runAsync(
      `INSERT INTO tags (id, name_enc, name_iv, name_hash, color, created_at, sync_state, rev)
       VALUES (12, 'n', 'iv', 'h', '#000', 'x', 'dirty', 1)`
    );
    await db.runAsync(
      `INSERT INTO tasks (id, tag_ids, created_at, updated_at, sync_state)
       VALUES (1, '[12]', 'x', 'x', 'synced'), (2, '[120,312]', 'x', 'x', 'synced')`
    );
    let call = 0;
    from.mockImplementation((table: string) => {
      if (table !== 'tags') return createBuilder({});
      return createBuilder(call++ === 0 ? { error: { code: '23505' } } : { data: { id: 500 } });
    });
    rpc.mockResolvedValue({ error: { message: 'offline' } }); // keep the tasks' state visible

    await pushPending(asDb(db), 'u1').catch(() => {});

    expect(await db.getAllAsync('SELECT id, tag_ids, sync_state FROM tasks ORDER BY id')).toEqual([
      { id: 1, tag_ids: '[500]', sync_state: 'dirty' },
      { id: 2, tag_ids: '[120,312]', sync_state: 'synced' },
    ]);
  });
});

describe('new id for a task', () => {
  it('moves its pomodoros along', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 10);
    await db.runAsync(
      `INSERT INTO pomodoros (id, task_id, duration, started_at, created_at, sync_state, rev)
       VALUES (7, 10, 1500, 'x', 'x', 'synced', 0)`
    );
    let n = 0;
    from.mockImplementation((table: string) =>
      createBuilder({ error: table === 'tasks' && n++ === 0 ? { code: '42501' } : null })
    );

    await pushPending(asDb(db), 'u1');

    const task = await db.getFirstAsync<{ id: number }>('SELECT id FROM tasks');
    const pomo = await db.getFirstAsync<{ task_id: number }>('SELECT task_id FROM pomodoros');
    expect(task!.id).not.toBe(10);
    expect(pomo!.task_id).toBe(task!.id);
  });
});

describe('pull vs. local writes', () => {
  it('a local edit made during the pull is neither overwritten nor rolled back', async () => {
    const db = createMemoryDb();
    await insertDirtyTask(db, 1, 'synced');
    mockRemote({ tasks: [remoteTask(1, { title_enc: 'remote' })] });

    // The edit is issued while the pull is between its requests and its transaction.
    getSession.mockResolvedValueOnce(sessionOf('u1')).mockImplementationOnce(async () => {
      void withDbLock(asDb(db), () =>
        db.runAsync(
          `UPDATE tasks SET title_enc = 'edited', sync_state = 'dirty', rev = rev + 1 WHERE id = 1`
        )
      );
      return sessionOf('u1');
    });

    await pullAll(asDb(db), 'u1');
    await withDbLock(asDb(db), async () => {});

    expect(await db.getFirstAsync('SELECT title_enc, sync_state FROM tasks')).toEqual({
      title_enc: 'edited',
      sync_state: 'dirty',
    });
  });

  it('a transaction started during the pull waits instead of failing', async () => {
    const db = createMemoryDb();
    mockRemote({ tasks: [remoteTask(1)] });
    let nested: Promise<void> | null = null;
    getSession.mockResolvedValueOnce(sessionOf('u1')).mockImplementationOnce(async () => {
      nested = writeTransaction(asDb(db), async () => {
        await db.runAsync(`UPDATE tasks SET category_id = NULL WHERE category_id = 3`);
      });
      return sessionOf('u1');
    });

    await pullAll(asDb(db), 'u1');
    await expect(nested).resolves.toBeUndefined();
  });
});
