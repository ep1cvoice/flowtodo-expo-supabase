import { initialTasksData, tasksReducer, type TasksData } from '@/features/tasks/lib/tasksReducer';

const task = (id: number, sortOrder: number, extra: Record<string, unknown> = {}): any => ({
  id,
  title: `Task ${id}`,
  description: '',
  done: false,
  scheduled: null,
  completedAt: null,
  created: '2026-01-01T00:00:00Z',
  categoryId: null,
  category: null,
  sortOrder,
  tags: [],
  ...extra,
});
const cat = (id: number): any => ({ id, name: `c${id}`, color: '#000', icon: 'x' });
const tag = (id: number): any => ({ id, name: `t${id}`, color: '#000' });

const withData = (extra: Partial<TasksData>): TasksData => ({ ...initialTasksData, ...extra });

describe('tasksReducer', () => {
  it('snapshotLoaded replaces every slice', () => {
    const next = tasksReducer(withData({ completedCount: 9 }), {
      type: 'snapshotLoaded',
      snapshot: {
        categories: [cat(1)],
        tags: [tag(1)],
        activeTasks: [task(1, 0)],
        completedTasks: [],
        completedCount: 2,
        nextCursor: { completedAt: 'x', id: 1 },
        hasMore: true,
      },
    });
    expect(next).toMatchObject({
      completedCount: 2,
      completedCursor: { completedAt: 'x', id: 1 },
      hasMoreCompleted: true,
    });
    expect(next.categories).toHaveLength(1);
  });

  it('reset returns the initial data', () => {
    expect(tasksReducer(withData({ completedCount: 3 }), { type: 'reset' })).toBe(initialTasksData);
  });

  it('taskMoved moves between buckets and keeps the count consistent', () => {
    const start = withData({ activeTasks: [task(1, 0), task(2, 1)] });
    const done = { ...task(1, 0), done: true, completedAt: '2026-01-02T00:00:00Z' };
    const completed = tasksReducer(start, { type: 'taskMoved', task: done });
    expect(completed.activeTasks.map((t) => t.id)).toEqual([2]);
    expect(completed.completedTasks.map((t) => t.id)).toEqual([1]);
    expect(completed.completedCount).toBe(1);

    const back = tasksReducer(completed, { type: 'taskMoved', task: task(1, 0) });
    expect(back.activeTasks.map((t) => t.id)).toEqual([1, 2]);
    expect(back.completedTasks).toEqual([]);
    expect(back.completedCount).toBe(0);
  });

  it('taskRemoved only decrements the count for completed tasks', () => {
    const start = withData({
      activeTasks: [task(1, 0)],
      completedTasks: [task(2, 0, { done: true })],
      completedCount: 5,
    });
    expect(tasksReducer(start, { type: 'taskRemoved', id: 1 }).completedCount).toBe(5);
    expect(tasksReducer(start, { type: 'taskRemoved', id: 2 }).completedCount).toBe(4);
  });

  it('categoryRemoved / tagRemoved clean up tasks', () => {
    const start = withData({
      categories: [cat(1)],
      tags: [tag(1), tag(2)],
      activeTasks: [task(1, 0, { categoryId: 1, category: cat(1), tags: [tag(1), tag(2)] })],
    });
    const noCat = tasksReducer(start, { type: 'categoryRemoved', id: 1 });
    expect(noCat.categories).toEqual([]);
    expect(noCat.activeTasks[0]).toMatchObject({ categoryId: null, category: null });
    const noTag = tasksReducer(start, { type: 'tagRemoved', id: 1 });
    expect(noTag.tags.map((t) => t.id)).toEqual([2]);
    expect(noTag.activeTasks[0].tags!.map((t) => t.id)).toEqual([2]);
  });

  it('categoryInserted / tagInserted restore at the index and are idempotent', () => {
    const start = withData({ categories: [cat(2)], tags: [tag(2)] });
    const a = tasksReducer(start, { type: 'categoryInserted', category: cat(1), index: 0 });
    expect(a.categories.map((c) => c.id)).toEqual([1, 2]);
    expect(tasksReducer(a, { type: 'categoryInserted', category: cat(1), index: 0 })).toBe(a);
    const b = tasksReducer(start, { type: 'tagInserted', tag: tag(1), index: 5 });
    expect(b.tags.map((t) => t.id)).toEqual([2, 1]);
  });

  it('sortOrdersApplied and tasksPatched touch only the given tasks', () => {
    const start = withData({ activeTasks: [task(1, 0), task(2, 1)] });
    const ordered = tasksReducer(start, { type: 'sortOrdersApplied', orders: { 2: -1 } });
    expect(ordered.activeTasks.map((t) => t.sortOrder)).toEqual([0, -1]);
    const patched = tasksReducer(start, {
      type: 'tasksPatched',
      patches: { 1: { scheduled: '2026-02-02' } },
    });
    expect(patched.activeTasks[0].scheduled).toBe('2026-02-02');
    expect(patched.activeTasks[1]).toBe(start.activeTasks[1]);
  });

  it('allCompletedCleared resets pagination too', () => {
    const next = tasksReducer(
      withData({
        completedTasks: [task(1, 0, { done: true })],
        completedCount: 4,
        completedCursor: { completedAt: 'x', id: 1 },
        hasMoreCompleted: true,
      }),
      { type: 'allCompletedCleared' }
    );
    expect(next).toMatchObject({
      completedTasks: [],
      completedCount: 0,
      completedCursor: null,
      hasMoreCompleted: false,
    });
  });
});

describe('taskUpserted', () => {
  const mk = (id: number, extra: object = {}): any => ({
    id, title: `t${id}`, description: '', done: false, scheduled: null, completedAt: null,
    created: 'x', categoryId: null, category: null, sortOrder: id, tags: [], ...extra,
  });

  it('replaces a loaded task in place, in either bucket', () => {
    const start = { ...initialTasksData, activeTasks: [mk(1), mk(2)], completedTasks: [mk(3, { done: true, completedAt: '2026-01-01T00:00:00Z' })], completedCount: 1 };
    const a = tasksReducer(start, { type: 'taskUpserted', task: mk(2, { title: 'new' }) });
    expect(a.activeTasks.map((t) => t.title)).toEqual(['t1', 'new']);
    const c = tasksReducer(start, { type: 'taskUpserted', task: mk(3, { title: 'new', done: true, completedAt: '2026-01-01T00:00:00Z' }) });
    expect(c.completedTasks[0].title).toBe('new');
    expect(c.completedCount).toBe(1);
  });

  it('inserts an unknown task into the active list by sortOrder', () => {
    const start = { ...initialTasksData, activeTasks: [mk(1, { sortOrder: 3 }), mk(2, { sortOrder: 5 })] };
    const next = tasksReducer(start, { type: 'taskUpserted', task: mk(9, { sortOrder: 2 }) });
    expect(next.activeTasks.map((t) => t.id)).toEqual([9, 1, 2]);
  });
});
