import { mapCategory, mapTag, mapTask } from '@/lib/taskMappers';

describe('task mappers', () => {
  it('maps category and tag rows', () => {
    expect(
      mapCategory({
        id: 1,
        user_id: 'u1',
        name: 'Work',
        color: '#0d9488',
        icon: 'briefcase',
        created_at: '2026-01-01T00:00:00Z',
      })
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
      })
    ).toEqual({
      id: 2,
      name: 'urgent',
      color: '#ef4444',
    });
  });

  it('maps a task with nested category and tags', () => {
    const task = mapTask({
      id: 10,
      user_id: 'u1',
      title: 'Ship tests',
      description: 'must-have only',
      done: false,
      scheduled: null,
      sort_order: 3,
      category_id: 1,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      categories: {
        id: 1,
        user_id: 'u1',
        name: 'Work',
        color: '#0d9488',
        icon: 'briefcase',
        created_at: '2026-01-01T00:00:00Z',
      },
      task_tags: [
        {
          tags: {
            id: 2,
            user_id: 'u1',
            name: 'urgent',
            color: '#ef4444',
            created_at: '2026-01-01T00:00:00Z',
          },
        },
      ],
    });

    expect(task).toMatchObject({
      id: 10,
      title: 'Ship tests',
      description: 'must-have only',
      done: false,
      categoryId: 1,
      sortOrder: 3,
      category: { id: 1, name: 'Work' },
      tags: [{ id: 2, name: 'urgent' }],
    });
  });
});
