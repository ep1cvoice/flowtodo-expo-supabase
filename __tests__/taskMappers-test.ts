import { mapCategory, mapTag, mapTask } from '@/lib/tasks/taskMappers';

jest.mock('@/lib/crypto', () => ({
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
          name: '',
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
          name: '',
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
        title: '',
        title_enc: 'title',
        title_iv: 'iv-t',
        description: '',
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
          name: '',
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
              name: '',
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

  it('does not fall back to plaintext columns', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const row = {
      id: 3,
      user_id: 'u1',
      name: 'leaked-plaintext',
      color: '#000000',
      icon: 'x',
      created_at: '2026-01-01T00:00:00Z',
      name_hash: null,
    };

    // no DEK
    expect(
      mapCategory({ ...row, name_enc: 'work', name_iv: 'iv1' }, null).name
    ).toBe('');
    // missing enc/iv
    expect(mapCategory({ ...row, name_enc: null, name_iv: null }, dek).name).toBe('');
    // decrypt failure
    expect(mapCategory({ ...row, name_enc: 'bad', name_iv: 'iv1' }, dek).name).toBe('');

    warn.mockRestore();
  });
});
