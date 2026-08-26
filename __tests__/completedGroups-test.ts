import {
  formatCompletedDayLabel,
  getCompletedSectionMeta,
  groupCompletedTasks,
  startOfLocalDay,
} from '@/lib/tasks/completedGroups';
import type { Task } from '@/types';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: '',
    done: true,
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

describe('completedGroups', () => {
  const now = new Date(2026, 7, 13, 15, 30, 0); 

  it('startOfLocalDay zeroes the clock', () => {
    const d = startOfLocalDay(new Date(2026, 7, 13, 15, 30, 0));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(13);
  });

  it('labels today / yesterday / concrete older dates', () => {
    expect(getCompletedSectionMeta(new Date(2026, 7, 13, 9, 0).toISOString(), now)).toEqual({
      key: 'today',
      title: 'Today',
      sortKey: startOfLocalDay(now).getTime(),
    });
    expect(getCompletedSectionMeta(new Date(2026, 7, 12, 23, 59).toISOString(), now).title).toBe(
      'Yesterday'
    );
    const older = getCompletedSectionMeta(new Date(2026, 7, 10, 12, 0).toISOString(), now);
    expect(older.key).toBe('2026-08-10');
    expect(older.title).toBe(formatCompletedDayLabel(startOfLocalDay(new Date(2026, 7, 10)), now));
    expect(getCompletedSectionMeta(null, now).key).toBe('unknown');
  });

  it('includes year when day is not in the current year', () => {
    const label = formatCompletedDayLabel(startOfLocalDay(new Date(2025, 7, 10)), now);
    expect(label).toMatch(/2025/);
  });

  it('groups by day and orders newest sections first', () => {
    const tasks = [
      task({ id: 1, title: 'T1', completedAt: new Date(2026, 7, 13, 10).toISOString() }),
      task({ id: 2, title: 'T2', completedAt: new Date(2026, 7, 13, 8).toISOString() }),
      task({ id: 3, title: 'T3', completedAt: new Date(2026, 7, 10, 8).toISOString() }),
      task({ id: 4, title: 'T4', completedAt: new Date(2026, 7, 11, 8).toISOString() }),
    ];
    const sections = groupCompletedTasks(tasks, now);
    expect(sections.map((s) => s.key)).toEqual(['today', '2026-08-11', '2026-08-10']);
    expect(sections[0].data.map((t) => t.id)).toEqual([1, 2]);
    expect(sections[1].data.map((t) => t.id)).toEqual([4]);
    expect(sections[2].data.map((t) => t.id)).toEqual([3]);
  });
});
