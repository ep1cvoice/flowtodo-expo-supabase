// Characterization tests for the optimistic-update / rollback behavior of useTaskMutations.
import { useState } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { useTaskMutations } from '@/features/tasks/lib/useTaskMutations';

jest.mock('@/features/tasks/lib/mutations', () => ({
  deleteCategoryForUser: jest.fn(),
  deleteTagForUser: jest.fn(),
  deleteTaskForUser: jest.fn(),
  deleteTasksByDone: jest.fn(),
  insertEncryptedCategory: jest.fn(),
  insertEncryptedTag: jest.fn(),
  insertEncryptedTask: jest.fn(),
  setTaskDoneRow: jest.fn(),
  setTaskScheduledRow: jest.fn(),
  updateEncryptedTask: jest.fn(),
  updateTaskSortOrders: jest.fn(),
}));

import * as m from '@/features/tasks/lib/mutations';

const mocked = m as unknown as Record<string, jest.Mock>;

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

const cat = (id: number): any => ({ id, name: `c${id}`, color: '#000' });
const tag = (id: number): any => ({ id, name: `t${id}`, color: '#000' });

function setup(initial?: { active?: any[]; completed?: any[]; categories?: any[]; tags?: any[] }) {
  return renderHook(() => {
    const [activeTasks, setActiveTasks] = useState<any[]>(initial?.active ?? []);
    const [completedTasks, setCompletedTasks] = useState<any[]>(initial?.completed ?? []);
    const [completedCount, setCompletedCount] = useState((initial?.completed ?? []).length);
    const [categories, setCategories] = useState<any[]>(initial?.categories ?? []);
    const [tags, setTags] = useState<any[]>(initial?.tags ?? []);
    const actions = useTaskMutations({
      user: { id: 'u1', email: 'a@b.c' } as any,
      dek: new Uint8Array(32),
      activeTasks,
      completedTasks,
      completedCount,
      categories,
      tags,
      refresh: jest.fn(),
      setActiveTasks,
      setCompletedTasks,
      setCompletedCount,
      setCompletedCursor: jest.fn(),
      setHasMoreCompleted: jest.fn(),
      setCategories,
      setTags,
    });
    return { actions, activeTasks, completedTasks, completedCount, categories, tags };
  });
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('toggleTask', () => {
  it('moves an active task to completed on success', async () => {
    const { result } = await setup({ active: [task(1, 0), task(2, 1)] });
    await act(() => result.current.actions.toggleTask(1));
    expect(result.current.activeTasks.map((t) => t.id)).toEqual([2]);
    expect(result.current.completedTasks.map((t) => t.id)).toEqual([1]);
    expect(result.current.completedTasks[0].done).toBe(true);
    expect(result.current.completedCount).toBe(1);
    expect(mocked.setTaskDoneRow).toHaveBeenCalledWith('u1', 1, true, expect.any(String));
  });

  it('rolls back and rethrows when persisting fails', async () => {
    mocked.setTaskDoneRow.mockRejectedValue(new Error('boom'));
    const { result } = await setup({ active: [task(1, 0), task(2, 1)] });
    await act(async () => {
      await expect(result.current.actions.toggleTask(1)).rejects.toThrow('boom');
    });
    expect(result.current.activeTasks.map((t) => t.id)).toEqual([1, 2]);
    expect(result.current.completedTasks).toEqual([]);
    expect(result.current.completedCount).toBe(0);
  });

  it('rolls back un-completing a task when persisting fails', async () => {
    mocked.setTaskDoneRow.mockRejectedValue(new Error('boom'));
    const done = task(1, 0, { done: true, completedAt: '2026-01-02T00:00:00Z' });
    const { result } = await setup({ completed: [done] });
    await act(async () => {
      await expect(result.current.actions.toggleTask(1)).rejects.toThrow('boom');
    });
    expect(result.current.activeTasks).toEqual([]);
    expect(result.current.completedTasks.map((t) => t.id)).toEqual([1]);
    expect(result.current.completedCount).toBe(1);
  });

  it('ignores unknown ids', async () => {
    const { result } = await setup({ active: [task(1, 0)] });
    await act(() => result.current.actions.toggleTask(99));
    expect(mocked.setTaskDoneRow).not.toHaveBeenCalled();
  });
});

describe('deleteCategory', () => {
  const initial = () => ({
    categories: [cat(1), cat(2)],
    active: [task(1, 0, { categoryId: 1, category: cat(1) }), task(2, 1, { categoryId: 2, category: cat(2) })],
  });

  it('removes the category and clears it from tasks', async () => {
    const { result } = await setup(initial());
    await act(() => result.current.actions.deleteCategory(1));
    expect(result.current.categories.map((c) => c.id)).toEqual([2]);
    expect(result.current.activeTasks[0]).toMatchObject({ categoryId: null, category: null });
    expect(result.current.activeTasks[1].categoryId).toBe(2);
  });

  it('rolls back categories and tasks when persisting fails', async () => {
    mocked.deleteCategoryForUser.mockRejectedValue(new Error('boom'));
    const { result } = await setup(initial());
    await act(async () => {
      await expect(result.current.actions.deleteCategory(1)).rejects.toThrow('boom');
    });
    expect(result.current.categories.map((c) => c.id)).toEqual([1, 2]);
    expect(result.current.activeTasks[0].categoryId).toBe(1);
  });
});

describe('deleteTag', () => {
  const initial = () => ({
    tags: [tag(1), tag(2)],
    active: [task(1, 0, { tags: [tag(1), tag(2)] })],
  });

  it('removes the tag and strips it from tasks', async () => {
    const { result } = await setup(initial());
    await act(() => result.current.actions.deleteTag(1));
    expect(result.current.tags.map((t) => t.id)).toEqual([2]);
    expect(result.current.activeTasks[0].tags.map((t: any) => t.id)).toEqual([2]);
  });

  it('rolls back tags and tasks when persisting fails', async () => {
    mocked.deleteTagForUser.mockRejectedValue(new Error('boom'));
    const { result } = await setup(initial());
    await act(async () => {
      await expect(result.current.actions.deleteTag(1)).rejects.toThrow('boom');
    });
    expect(result.current.tags.map((t) => t.id)).toEqual([1, 2]);
    expect(result.current.activeTasks[0].tags.map((t: any) => t.id)).toEqual([1, 2]);
  });
});

describe('reorderTasks', () => {
  const items = [
    { id: 1, sortOrder: 1 },
    { id: 2, sortOrder: 0 },
  ];

  it('applies new sort orders optimistically', async () => {
    const { result } = await setup({ active: [task(1, 0), task(2, 1)] });
    await act(() => result.current.actions.reorderTasks(items));
    expect(result.current.activeTasks.map((t) => [t.id, t.sortOrder])).toEqual([
      [1, 1],
      [2, 0],
    ]);
    expect(mocked.updateTaskSortOrders).toHaveBeenCalledWith('u1', items);
  });

  it('rolls back sort orders when persisting fails', async () => {
    mocked.updateTaskSortOrders.mockRejectedValue(new Error('boom'));
    const { result } = await setup({ active: [task(1, 0), task(2, 1)] });
    await act(async () => {
      await expect(result.current.actions.reorderTasks(items)).rejects.toThrow('boom');
    });
    expect(result.current.activeTasks.map((t) => [t.id, t.sortOrder])).toEqual([
      [1, 0],
      [2, 1],
    ]);
  });

  it('is a no-op for an empty list', async () => {
    const { result } = await setup({ active: [task(1, 0)] });
    await act(() => result.current.actions.reorderTasks([]));
    expect(mocked.updateTaskSortOrders).not.toHaveBeenCalled();
  });
});
