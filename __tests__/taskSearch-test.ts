import { filterTasksBySearch, normalizeSearchQuery, taskMatchesSearch } from '@/lib/taskSearch';
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

describe('taskSearch', () => {
  it('normalizes query', () => {
    expect(normalizeSearchQuery('  Hello  ')).toBe('hello');
    expect(normalizeSearchQuery('')).toBe('');
  });

  it('matches title or description', () => {
    const t = task({ id: 1, title: 'Buy Milk', description: 'From the store' });
    expect(taskMatchesSearch(t, 'milk')).toBe(true);
    expect(taskMatchesSearch(t, 'store')).toBe(true);
    expect(taskMatchesSearch(t, 'bread')).toBe(false);
    expect(taskMatchesSearch(t, '')).toBe(true);
  });

  it('filters a list; empty query returns all', () => {
    const tasks = [
      task({ id: 1, title: 'Alpha' }),
      task({ id: 2, title: 'Beta task', description: 'alpha notes' }),
      task({ id: 3, title: 'Gamma' }),
    ];
    expect(filterTasksBySearch(tasks, '').map((t) => t.id)).toEqual([1, 2, 3]);
    expect(filterTasksBySearch(tasks, 'alpha').map((t) => t.id)).toEqual([1, 2]);
    expect(filterTasksBySearch(tasks, 'zzz')).toEqual([]);
  });
});
