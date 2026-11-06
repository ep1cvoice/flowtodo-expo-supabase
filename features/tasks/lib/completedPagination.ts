import type { Task } from '@/types';

export const COMPLETED_PAGE_SIZE = 30;

export type CompletedCursor = {
  completedAt: string;
  id: number;
};

export function getCompletedCursor(task: Task): CompletedCursor | null {
  if (!task.completedAt) return null;
  return { completedAt: task.completedAt, id: task.id };
}

/** Newest completed_at first; tie-break by id desc. */
export function compareCompletedDesc(a: Task, b: Task): number {
  const aAt = a.completedAt ? new Date(a.completedAt).getTime() : 0;
  const bAt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
  if (bAt !== aAt) return bAt - aAt;
  return b.id - a.id;
}

export function sortCompletedTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(compareCompletedDesc);
}

/** Merge pages by id, keep newest-first order. */
export function mergeCompletedTasks(existing: Task[], incoming: Task[]): Task[] {
  const map = new Map<number, Task>();
  for (const task of existing) map.set(task.id, task);
  for (const task of incoming) map.set(task.id, task);
  return sortCompletedTasks([...map.values()]);
}

/**
 * PostgREST `or` filter for keyset page after cursor (completed_at desc, id desc).
 * Assumes completed_at is non-null.
 */
export function completedKeysetOrFilter(cursor: CompletedCursor): string {
  const at = cursor.completedAt;
  return `completed_at.lt."${at}",and(completed_at.eq."${at}",id.lt.${cursor.id})`;
}
