import { applyFilteredReorder } from '@/lib/tasks/taskReorder';
import type { Task } from '@/types';

function task(id: number, title = `t${id}`): Task {
  return {
    id,
    title,
    description: '',
    done: false,
    scheduled: null,
    completedAt: null,
    created: '2026-01-01T00:00:00Z',
    categoryId: null,
    category: null,
    sortOrder: id,
    tags: [],
  };
}

describe('applyFilteredReorder', () => {
  it('puts filtered items back into their slots only', () => {
    const full = [task(1), task(2), task(3), task(4)];
    // filter shows 2 and 4; user swaps them
    const reorderedFiltered = [task(4), task(2)];

    const next = applyFilteredReorder(full, reorderedFiltered);

    expect(next.map((t) => t.id)).toEqual([1, 4, 3, 2]);
  });

  it('returns filtered list when ids do not map to slots', () => {
    const full = [task(1), task(2)];
    // id 9 is not in the full active list → no slots to merge into
    const broken = [task(9)];

    expect(applyFilteredReorder(full, broken)).toEqual(broken);
  });
});

