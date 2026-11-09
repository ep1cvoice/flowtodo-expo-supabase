import { callsOf, createBuilder } from '@/test/supabaseMock';

jest.mock('@/core/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/core/crypto', () => ({
  encryptField: jest.fn(async () => ({ ciphertext: 'ct', iv: 'iv' })),
  hashForUniqueness: jest.fn(() => 'hash'),
}));
jest.mock('@/features/tasks/lib/encryptTaskFields', () => ({
  encryptTaskFields: jest.fn(async () => ({
    title_enc: 'title_ct',
    title_iv: 'title_iv',
    description_enc: 'desc_ct',
    description_iv: 'desc_iv',
  })),
}));
jest.mock('@/features/tasks/lib/taskMappers', () => ({
  mapCategory: jest.fn((row) => ({ mapped: 'category', row })),
  mapTag: jest.fn((row) => ({ mapped: 'tag', row })),
}));

import { encryptField, hashForUniqueness } from '@/core/crypto';
import { supabase } from '@/core/supabase/client';
import {
  deleteTaskForUser,
  insertEncryptedTag,
  insertEncryptedTask,
  setTaskDoneRow,
  updateEncryptedTask,
  updateTaskSortOrders,
} from '@/features/tasks/lib/mutations';

const from = supabase.from as jest.Mock;
const dek = new Uint8Array(32);

beforeEach(() => {
  jest.clearAllMocks();
  from.mockReset();
});

describe('insertEncryptedTask', () => {
  const base = {
    userId: 'u1',
    dek,
    title: 'Secret title',
    description: 'Secret description',
    categoryId: 3,
    tagIds: [1, 2],
    scheduled: null,
    sortOrder: 5,
  };

  it('writes only encrypted fields, never plaintext', async () => {
    const tasks = createBuilder({ data: { id: 7 } });
    const tags = createBuilder();
    from.mockReturnValueOnce(tasks).mockReturnValueOnce(tags);

    const id = await insertEncryptedTask(base);

    expect(id).toBe(7);
    const [payload] = callsOf(tasks, 'insert')[0];
    expect(payload).not.toHaveProperty('title');
    expect(payload).not.toHaveProperty('description');
    expect(payload).toMatchObject({
      user_id: 'u1',
      title_enc: 'title_ct',
      description_enc: 'desc_ct',
      category_id: 3,
      sort_order: 5,
      done: false,
    });
    expect(JSON.stringify(payload)).not.toContain('Secret');
  });

  it('links tags to the id of the newly created task', async () => {
    const tasks = createBuilder({ data: { id: 7 } });
    const tags = createBuilder();
    from.mockReturnValueOnce(tasks).mockReturnValueOnce(tags);

    await insertEncryptedTask(base);

    expect(from).toHaveBeenNthCalledWith(2, 'task_tags');
    expect(callsOf(tags, 'insert')[0][0]).toEqual([
      { task_id: 7, tag_id: 1 },
      { task_id: 7, tag_id: 2 },
    ]);
  });

  it('does not touch task_tags when there are no tags', async () => {
    from.mockReturnValueOnce(createBuilder({ data: { id: 7 } }));
    await insertEncryptedTask({ ...base, tagIds: [] });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('throws the Supabase error', async () => {
    const err = new Error('db down');
    from.mockReturnValueOnce(createBuilder({ error: err }));
    await expect(insertEncryptedTask(base)).rejects.toBe(err);
  });

  it('throws when inserting tags fails', async () => {
    const err = new Error('tags fail');
    from
      .mockReturnValueOnce(createBuilder({ data: { id: 7 } }))
      .mockReturnValueOnce(createBuilder({ error: err }));
    await expect(insertEncryptedTask(base)).rejects.toBe(err);
  });
});

describe('updateEncryptedTask', () => {
  it('filters by id and user_id, then clears and re-inserts tags', async () => {
    const update = createBuilder();
    const del = createBuilder();
    const ins = createBuilder();
    from.mockReturnValueOnce(update).mockReturnValueOnce(del).mockReturnValueOnce(ins);

    await updateEncryptedTask({
      userId: 'u1',
      dek,
      id: 9,
      title: 'a',
      description: 'b',
      categoryId: null,
      tagIds: [4],
    });

    expect(callsOf(update, 'eq')).toEqual([['id', 9], ['user_id', 'u1']]);
    expect(callsOf(del, 'delete')).toHaveLength(1);
    expect(callsOf(ins, 'insert')[0][0]).toEqual([{ task_id: 9, tag_id: 4 }]);
  });
});

describe('insertEncryptedTag', () => {
  it('trims the name, then encrypts and hashes the trimmed value', async () => {
    const builder = createBuilder({ data: { id: 1 } });
    from.mockReturnValueOnce(builder);

    const result = await insertEncryptedTag('u1', dek, { name: '  Work  ', color: '#fff' } as any);

    expect(encryptField).toHaveBeenCalledWith(dek, 'Work');
    expect(hashForUniqueness).toHaveBeenCalledWith(dek, 'Work');
    expect(callsOf(builder, 'insert')[0][0]).toEqual({
      user_id: 'u1',
      color: '#fff',
      name_enc: 'ct',
      name_iv: 'iv',
      name_hash: 'hash',
    });
    expect(result).toMatchObject({ mapped: 'tag' });
  });
});

describe('simple mutations', () => {
  it('deleteTaskForUser always filters by user_id (safety net next to RLS)', async () => {
    const b = createBuilder();
    from.mockReturnValueOnce(b);
    await deleteTaskForUser('u1', 5);
    expect(callsOf(b, 'eq')).toEqual([['id', 5], ['user_id', 'u1']]);
  });

  it('setTaskDoneRow sets done and completed_at', async () => {
    const b = createBuilder();
    from.mockReturnValueOnce(b);
    await setTaskDoneRow('u1', 5, true, '2026-11-03T10:00:00Z');
    expect(callsOf(b, 'update')[0][0]).toEqual({
      done: true,
      completed_at: '2026-11-03T10:00:00Z',
    });
  });

  it('updateTaskSortOrders calls reorder_tasks RPC once', async () => {
    const rpc = supabase.rpc as jest.Mock;
    rpc.mockResolvedValueOnce({ error: null });
    await updateTaskSortOrders('u1', [
      { id: 1, sortOrder: 0 },
      { id: 2, sortOrder: 1 },
    ]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('reorder_tasks', {
      p_items: [
        { id: 1, sort_order: 0 },
        { id: 2, sort_order: 1 },
      ],
    });
  });

  it('updateTaskSortOrders throws if the RPC fails', async () => {
    const err = new Error('boom');
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: err });
    await expect(updateTaskSortOrders('u1', [{ id: 1, sortOrder: 0 }])).rejects.toBe(err);
  });
});
