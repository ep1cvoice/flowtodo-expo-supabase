import { filterActiveTaskList, filterTasksByLabels, getActiveEmptyCopy } from '@/lib/taskFilters';
import type { Task } from '@/types';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: '',
    done: false,
    scheduled: null,
    completedAt: null,
    created: '2026-01-01T00:00:00Z',
    categoryId: null,
    category: null,
    sortOrder: partial.id,
    tags: [],
    ...partial,
  };
}

describe('filterTasksByLabels', () => {
  const tasks = [
    task({ id: 1, title: 'A', categoryId: 10, tags: [{ id: 1, name: 'x', color: '#000' }] }),
    task({ id: 2, title: 'B', categoryId: 20, tags: [{ id: 2, name: 'y', color: '#000' }] }),
    task({ id: 3, title: 'C', categoryId: 10, tags: [{ id: 2, name: 'y', color: '#000' }] }),
  ];

  it('returns all when no labels selected', () => {
    expect(filterTasksByLabels(tasks, [], []).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('requires selected category', () => {
    expect(filterTasksByLabels(tasks, [10], []).map((t) => t.id)).toEqual([1, 3]);
  });

  it('matches any selected tag (OR)', () => {
    expect(filterTasksByLabels(tasks, [], [1, 2]).map((t) => t.id)).toEqual([1, 2, 3]);
    expect(filterTasksByLabels(tasks, [], [1]).map((t) => t.id)).toEqual([1]);
  });

  it('combines category AND tag filters', () => {
    expect(filterTasksByLabels(tasks, [10], [2]).map((t) => t.id)).toEqual([3]);
  });
});

describe('filterActiveTaskList', () => {
  it('applies search after labels', () => {
    const tasks = [
      task({ id: 1, title: 'Milk', categoryId: 10 }),
      task({ id: 2, title: 'Bread', categoryId: 10 }),
      task({ id: 3, title: 'Milk', categoryId: 20 }),
    ];
    expect(
      filterActiveTaskList(tasks, {
        sortMode: 'manual',
        categoryIds: [10],
        tagIds: [],
        searchQuery: 'milk',
        selectedDay: null,
      }).map((t) => t.id)
    ).toEqual([1]);
  });
});

describe('getActiveEmptyCopy', () => {
  it('uses day copy when only a day is selected', () => {
    expect(
      getActiveEmptyCopy({
        hasDayFilter: true,
        hasSearch: false,
        hasFilters: false,
        validCategoryIds: [],
        validTagIds: [],
      })
    ).toEqual({
      title: 'No tasks on this day',
      text: 'Create a task or pick another day',
    });
  });

  it('uses tag copy when only tags are selected', () => {
    expect(
      getActiveEmptyCopy({
        hasDayFilter: false,
        hasSearch: false,
        hasFilters: true,
        validCategoryIds: [],
        validTagIds: [1],
      }).title
    ).toBe('No tasks with these tags');
  });
});
