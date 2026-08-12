import type { Category, Tag, Task } from '@/types';
import type { Database } from '@/types/database';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type TagRow = Database['public']['Tables']['tags']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];

export type TaskQueryRow = TaskRow & {
  categories: CategoryRow | null;
  task_tags: { tags: TagRow | null }[] | null;
};

export function mapCategory(row: CategoryRow): Category {
  return {
    id: Number(row.id),
    name: row.name,
    color: row.color,
    icon: row.icon,
  };
}

export function mapTag(row: TagRow): Tag {
  return {
    id: Number(row.id),
    name: row.name,
    color: row.color,
  };
}

export function mapTask(row: TaskQueryRow): Task {
  const category = row.categories ? mapCategory(row.categories) : null;
  const tags = (row.task_tags ?? [])
    .map((link) => (link.tags ? mapTag(link.tags) : null))
    .filter((t): t is Tag => t != null);

  return {
    id: Number(row.id),
    title: row.title,
    description: row.description ?? '',
    done: row.done,
    scheduled: row.scheduled,
    completedAt: row.completed_at,
    created: row.created_at,
    categoryId: row.category_id != null ? Number(row.category_id) : null,
    category,
    sortOrder: row.sort_order,
    tags,
  };
}
