import type { Task } from '@/types';

/** Normalize query for case-insensitive substring match. */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

// Lowercased searchable text per task object, computed once instead of on every keystroke.
// Tasks are immutable (updates create new objects), so the cache never goes stale.
const searchFieldsCache = new WeakMap<Task, { title: string; description: string }>();

function getSearchFields(task: Task) {
  let fields = searchFieldsCache.get(task);
  if (!fields) {
    fields = {
      title: task.title.toLowerCase(),
      description: (task.description ?? '').toLowerCase(),
    };
    searchFieldsCache.set(task, fields);
  }
  return fields;
}

/** Match title or description (case-insensitive). Empty query → all tasks. */
export function taskMatchesSearch(task: Task, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const { title, description } = getSearchFields(task);
  return title.includes(normalizedQuery) || description.includes(normalizedQuery);
}

export function filterTasksBySearch(tasks: Task[], query: string): Task[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return tasks;
  return tasks.filter((task) => taskMatchesSearch(task, normalized));
}
