import { mapCategory, mapTag, mapTask } from '@/lib/tasks/taskMappers';

describe('task mappers', () => {
  it('maps category and tag rows', () => {
    expect(
      mapCategory({
        id: 1,
        user_id: 'u1',
        name: 'Work',
        name_enc: null,
        name_hash: null,
        name_iv: null,
        color: '#0d9488',
        icon: 'briefcase',
        created_at: '2026-01-01T00:00:00Z',
      }, null)
    ).toEqual({
      id: 1,
      name: 'Work',
      color: '#0d9488',
      icon: 'briefcase',
    });

    expect(
      mapTag({
        id: 2,
        user_id: 'u1',
        name: 'urgent',
        color: '#ef4444',
        created_at: '2026-01-01T00:00:00Z',
        name_enc: null,
        name_iv: null,
        name_hash: null,
      }, null)
    ).toEqual({
      id: 2,
      name: 'urgent',
      color: '#ef4444',
    });
  });

  it('maps a task with nested category and tags', () => {
    const task = mapTask({
      id: 10,
      user_id: 'abc',
      title: 'Zrobić migrację',
      title_enc: null,
      title_iv: null,
      description: 'Opis zadania',
      description_enc: null,
      description_iv: null,
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
        name: 'Praca',
        color: '#3b82f6',
        icon: 'Briefcase',
        created_at: '2026-01-01T00:00:00Z',
        name_enc: null,
        name_iv: null,
        name_hash: null,
      },
      task_tags: [
        {
          tags: {
            id: 2,
            user_id: 'abc',
            name: 'work',
            color: '#64748b',
            created_at: '2026-01-01T00:00:00Z',
            name_enc: null,
            name_iv: null,
            name_hash: null,
          },
        },
      ],
    }, null);

    expect(task).toMatchObject({
      id: 10,
      title: 'Zrobić migrację',
      description: 'Opis zadania',
      done: false,
      completedAt: null,
      categoryId: 1,
      sortOrder: 1,
      category: { id: 1, name: 'Praca' },
      tags: [{ id: 2, name: 'work' }],
    });
  });
});
