import {
  COMPLETED_PAGE_SIZE,
  completedKeysetOrFilter,
  compareCompletedDesc,
  getCompletedCursor,
  mergeCompletedTasks,
  sortCompletedTasks,
} from '@/lib/tasks/completedPagination';
import type { Task } from '@/types';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: '',
    done: true,
    scheduled: null,
    completedAt: '2026-08-13T12:00:00.000Z',
    created: '2026-01-01T00:00:00Z',
    categoryId: null,
    category: null,
    sortOrder: partial.id,
    tags: [],
    ...partial,
  };
}

describe('completedPagination', () => {
  it('exposes page size', () => {
    expect(COMPLETED_PAGE_SIZE).toBeGreaterThan(0);
  });

  it('builds keyset or-filter', () => {
    expect(
      completedKeysetOrFilter({ completedAt: '2026-08-13T12:00:00.000Z', id: 42 })
    ).toBe(
      'completed_at.lt."2026-08-13T12:00:00.000Z",and(completed_at.eq."2026-08-13T12:00:00.000Z",id.lt.42)'
    );
  });

  it('getCompletedCursor skips null completedAt', () => {
    expect(getCompletedCursor(task({ id: 1, title: 'A', completedAt: null }))).toBeNull();
    expect(getCompletedCursor(task({ id: 2, title: 'B' }))).toEqual({
      completedAt: '2026-08-13T12:00:00.000Z',
      id: 2,
    });
  });

  it('sorts and merges newest first', () => {
    const older = task({ id: 1, title: 'Old', completedAt: '2026-08-10T12:00:00.000Z' });
    const newer = task({ id: 2, title: 'New', completedAt: '2026-08-13T12:00:00.000Z' });
    expect(sortCompletedTasks([older, newer]).map((t) => t.id)).toEqual([2, 1]);
    expect(compareCompletedDesc(newer, older)).toBeLessThan(0);

    const merged = mergeCompletedTasks([older], [
      newer,
      task({ id: 1, title: 'Old updated', completedAt: '2026-08-10T12:00:00.000Z' }),
    ]);
    expect(merged.map((t) => t.id)).toEqual([2, 1]);
    expect(merged[1].title).toBe('Old updated');
  });
});
