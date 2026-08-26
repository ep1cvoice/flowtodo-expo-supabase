import type { Task } from '@/types';

/** Normalize query for case-insensitive substring match. */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Match title or description (case-insensitive). Empty query → all tasks. */
export function taskMatchesSearch(task: Task, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const title = task.title.toLowerCase();
  const description = (task.description ?? '').toLowerCase();
  return title.includes(normalizedQuery) || description.includes(normalizedQuery);
}

export function filterTasksBySearch(tasks: Task[], query: string): Task[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return tasks;
  return tasks.filter((task) => taskMatchesSearch(task, normalized));
}
