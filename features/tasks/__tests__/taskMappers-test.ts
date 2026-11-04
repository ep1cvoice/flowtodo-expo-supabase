import { DecryptionError } from '@/core/crypto/decryptColumn';
import { mapCategory, mapTag, mapTask } from '@/features/tasks/lib/taskMappers';

jest.mock('@/core/crypto', () => ({
  decryptField: (_dek: Uint8Array, ciphertext: string, iv: string) => {
    if (ciphertext === 'bad') throw new Error('decrypt failed');
    return `dec(${ciphertext}:${iv})`;
  },
}));

const dek = new Uint8Array(32);

describe('task mappers', () => {
  it('maps category and tag rows by decrypting name', () => {
    expect(
      mapCategory(
        {
          id: 1,
          user_id: 'u1',
          name_enc: 'work',
          name_hash: null,
          name_iv: 'iv1',
          color: '#0d9488',
          icon: 'briefcase',
          created_at: '2026-01-01T00:00:00Z',
        },
        dek
      )
    ).toEqual({
      id: 1,
      name: 'dec(work:iv1)',
      color: '#0d9488',
      icon: 'briefcase',
    });

    expect(
      mapTag(
        {
          id: 2,
          user_id: 'u1',
          color: '#ef4444',
          created_at: '2026-01-01T00:00:00Z',
          name_enc: 'urgent',
          name_iv: 'iv2',
          name_hash: null,
        },
        dek
      )
    ).toEqual({
      id: 2,
      name: 'dec(urgent:iv2)',
      color: '#ef4444',
    });
  });

  it('maps a task with nested category and tags', () => {
    const task = mapTask(
      {
        id: 10,
        user_id: 'abc',
        title_enc: 'title',
        title_iv: 'iv-t',
        description_enc: 'desc',
        description_iv: 'iv-d',
        done: false,
        scheduled: null,
        sort_order: 1,
        category_id: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        completed_at: null,
        categories: {
          id: 1,
          user_id: 'abc',
          color: '#3b82f6',
          icon: 'Briefcase',
          created_at: '2026-01-01T00:00:00Z',
          name_enc: 'cat',
          name_iv: 'iv-c',
          name_hash: null,
        },
        task_tags: [
          {
            tags: {
              id: 2,
              user_id: 'abc',
              color: '#64748b',
              created_at: '2026-01-01T00:00:00Z',
              name_enc: 'tag',
              name_iv: 'iv-g',
              name_hash: null,
            },
          },
        ],
      },
      dek
    );

    expect(task).toMatchObject({
      id: 10,
      title: 'dec(title:iv-t)',
      description: 'dec(desc:iv-d)',
      done: false,
      completedAt: null,
      categoryId: 1,
      sortOrder: 1,
      category: { id: 1, name: 'dec(cat:iv-c)' },
      tags: [{ id: 2, name: 'dec(tag:iv-g)' }],
    });
  });

  describe('decryption failures', () => {
    const catRow = {
      id: 3,
      user_id: 'u1',
      color: '#000000',
      icon: 'x',
      created_at: '2026-01-01T00:00:00Z',
      name_hash: null,
    };
    const taskRow = {
      id: 4,
      user_id: 'u1',
      title_enc: 'title',
      title_iv: 'iv-t',
      description_enc: null,
      description_iv: null,
      done: false,
      scheduled: null,
      sort_order: 0,
      category_id: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      completed_at: null,
      categories: null,
      task_tags: null,
    };

    it('throws when there is no DEK', () => {
      const row = { ...catRow, name_enc: 'work', name_iv: 'iv1' };
      expect(() => mapCategory(row, null)).toThrow(DecryptionError);
      expect(() => mapCategory(row, null)).toThrow(/categories#3\.name.*not available/);
    });

    it('throws when ciphertext or IV is missing', () => {
      expect(() => mapCategory({ ...catRow, name_enc: null, name_iv: null }, dek)).toThrow(
        /categories#3\.name: ciphertext is missing/
      );
      expect(() => mapCategory({ ...catRow, name_enc: 'work', name_iv: null }, dek)).toThrow(
        /categories#3\.name: IV is missing/
      );
    });

    it('throws a DecryptionError carrying the original cause when decryption fails', () => {
      const row = { ...catRow, name_enc: 'bad', name_iv: 'iv1' };
      let caught: unknown;
      try {
        mapCategory(row, dek);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(DecryptionError);
      expect((caught as DecryptionError).message).toBe('Failed to decrypt categories#3.name');
      expect(((caught as DecryptionError).cause as Error).message).toBe('decrypt failed');
    });

    it('throws for a tag the same way', () => {
      expect(() =>
        mapTag(
          { id: 5, user_id: 'u1', color: '#fff', created_at: 'x', name_enc: 'bad', name_iv: 'i', name_hash: null },
          dek
        )
      ).toThrow('Failed to decrypt tags#5.name');
    });

    it('throws when a task title cannot be decrypted, instead of returning an empty title', () => {
      expect(() => mapTask({ ...taskRow, title_enc: 'bad' }, dek)).toThrow(
        'Failed to decrypt tasks#4.title'
      );
      expect(() => mapTask({ ...taskRow, title_enc: null, title_iv: null }, dek)).toThrow(
        /tasks#4\.title: ciphertext is missing/
      );
    });

    it('treats a NULL description as empty, but a half-stored one as corrupt', () => {
      expect(mapTask(taskRow, dek).description).toBe('');
      expect(() => mapTask({ ...taskRow, description_enc: 'desc', description_iv: null }, dek)).toThrow(
        /tasks#4\.description: IV is missing/
      );
      expect(() => mapTask({ ...taskRow, description_enc: 'bad', description_iv: 'iv-d' }, dek)).toThrow(
        'Failed to decrypt tasks#4.description'
      );
    });
  });
});
