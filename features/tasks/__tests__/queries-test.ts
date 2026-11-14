import { callsOf, createBuilder } from '@/test/supabaseMock';

import { supabase } from '@/core/supabase/client';
import { fetchTasksSnapshot, TASK_SELECT } from '@/features/tasks/lib/queries';

jest.mock('@/core/supabase/client', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/core/crypto', () => ({
  decryptField: (_dek: Uint8Array, ciphertext: string, iv: string) => `dec(${ciphertext}:${iv})`,
}));

const from = supabase.from as jest.Mock;
const dek = new Uint8Array(32);

const taskRow = (id: number, extra: object = {}) => ({
  id,
  user_id: 'u1',
  title_enc: `t${id}`,
  title_iv: 'iv',
  description_enc: null,
  description_iv: null,
  done: false,
  scheduled: null,
  sort_order: id,
  category_id: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  completed_at: null,
  task_tags: [{ tag_id: 7 }],
  ...extra,
});

describe('fetchTasksSnapshot', () => {
  it('does not embed labels in task rows and resolves them from the fetched categories/tags', async () => {
    const categories = createBuilder({
      data: [
        { id: 1, user_id: 'u1', name_enc: 'work', name_iv: 'ivc', name_hash: null, color: '#111', icon: 'x', created_at: 'x' },
      ],
    });
    const tags = createBuilder({
      data: [{ id: 7, user_id: 'u1', name_enc: 'urgent', name_iv: 'ivg', name_hash: null, color: '#222', created_at: 'x' }],
    });
    const active = createBuilder({ data: [taskRow(10)] });
    const count = createBuilder({ count: 1 });
    const completed = createBuilder({
      data: [taskRow(11, { done: true, completed_at: '2026-02-01T00:00:00Z' })],
    });
    from
      .mockReturnValueOnce(categories)
      .mockReturnValueOnce(tags)
      .mockReturnValueOnce(active)
      .mockReturnValueOnce(count)
      .mockReturnValueOnce(completed);

    const snapshot = await fetchTasksSnapshot('u1', dek);

    expect(TASK_SELECT).not.toMatch(/categories|name_enc/);
    expect(callsOf(active, 'select')[0][0]).toBe(TASK_SELECT);
    expect(snapshot.activeTasks[0]).toMatchObject({
      id: 10,
      category: { id: 1, name: 'dec(work:ivc)' },
      tags: [{ id: 7, name: 'dec(urgent:ivg)' }],
    });
    // Same decrypted objects are shared instead of being decrypted per task.
    expect(snapshot.activeTasks[0].category).toBe(snapshot.categories[0]);
    expect(snapshot.completedTasks[0].tags?.[0]).toBe(snapshot.tags[0]);
  });
});
