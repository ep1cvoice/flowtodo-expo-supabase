import {
  compareTasksBySort,
  isTaskSortMode,
  sortTasks,
  type TaskSortMode,
} from '@/lib/taskSort';
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

describe('taskSort', () => {
  it('validates sort modes', () => {
    expect(isTaskSortMode('manual')).toBe(true);
    expect(isTaskSortMode('due')).toBe(true);
    expect(isTaskSortMode('created')).toBe(true);
    expect(isTaskSortMode('title')).toBe(true);
    expect(isTaskSortMode('priority')).toBe(false);
    expect(isTaskSortMode(null)).toBe(false);
  });

  it('manual sorts by sortOrder', () => {
    const tasks = [
      task({ id: 2, title: 'B', sortOrder: 2 }),
      task({ id: 1, title: 'A', sortOrder: 0 }),
      task({ id: 3, title: 'C', sortOrder: 1 }),
    ];
    expect(sortTasks(tasks, 'manual').map((t) => t.id)).toEqual([1, 3, 2]);
  });

  it('due date: soonest first, nulls last', () => {
    const tasks = [
      task({ id: 1, title: 'No date', scheduled: null, sortOrder: 0 }),
      task({ id: 2, title: 'Later', scheduled: '2026-06-01', sortOrder: 1 }),
      task({ id: 3, title: 'Soon', scheduled: '2026-03-01', sortOrder: 2 }),
    ];
    expect(sortTasks(tasks, 'due').map((t) => t.id)).toEqual([3, 2, 1]);
  });

  it('created: newest first', () => {
    const tasks = [
      task({ id: 1, title: 'Old', created: '2026-01-01T00:00:00Z', sortOrder: 0 }),
      task({ id: 2, title: 'New', created: '2026-03-01T00:00:00Z', sortOrder: 1 }),
      task({ id: 3, title: 'Mid', created: '2026-02-01T00:00:00Z', sortOrder: 2 }),
    ];
    expect(sortTasks(tasks, 'created').map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('title: A–Z case-insensitive', () => {
    const tasks = [
      task({ id: 1, title: 'zebra', sortOrder: 0 }),
      task({ id: 2, title: 'Apple', sortOrder: 1 }),
      task({ id: 3, title: 'mango', sortOrder: 2 }),
    ];
    expect(sortTasks(tasks, 'title').map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('does not mutate the input array', () => {
    const tasks = [
      task({ id: 2, title: 'B', sortOrder: 2 }),
      task({ id: 1, title: 'A', sortOrder: 0 }),
    ];
    const copy = [...tasks];
    sortTasks(tasks, 'manual');
    expect(tasks.map((t) => t.id)).toEqual(copy.map((t) => t.id));
  });

  it('ties break by sortOrder then id', () => {
    const a = task({ id: 2, title: 'Same', scheduled: '2026-01-01', sortOrder: 5 });
    const b = task({ id: 1, title: 'Same', scheduled: '2026-01-01', sortOrder: 5 });
    expect(compareTasksBySort(a, b, 'due' as TaskSortMode)).toBeGreaterThan(0);
  });
});
