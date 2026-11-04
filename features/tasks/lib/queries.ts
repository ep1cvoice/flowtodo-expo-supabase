import {
  COMPLETED_PAGE_SIZE,
  completedKeysetOrFilter,
  getCompletedCursor,
  sortCompletedTasks,
  type CompletedCursor,
} from '@/features/tasks/lib/completedPagination';
import { mapCategory, mapTag, mapTask, type TaskQueryRow } from '@/features/tasks/lib/taskMappers';
import { supabase } from '@/core/supabase/client';
import type { Category, Tag, Task } from '@/types';

export const TASK_SELECT = `
  id,
  user_id,
  title_enc,
  title_iv,
  description_enc,
  description_iv,
  done,
  scheduled,
  completed_at,
  sort_order,
  category_id,
  created_at,
  updated_at,
  categories ( id, user_id, name_enc, name_iv, name_hash, color, icon, created_at ),
  task_tags ( tags ( id, user_id, name_enc, name_iv, name_hash, color, created_at ) )
`;

export function mapTaskRows(
  rows: TaskQueryRow[] | null | undefined,
  dek: Uint8Array | null
): Task[] {
  return (rows ?? []).map((row) => mapTask(row, dek));
}

export async function fetchCompletedPage(
  userId: string,
  cursor: CompletedCursor | null,
  dek: Uint8Array | null
) {
  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('user_id', userId)
    .eq('done', true)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(COMPLETED_PAGE_SIZE + 1);

  if (cursor) {
    query = query.or(completedKeysetOrFilter(cursor));
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = mapTaskRows(data as TaskQueryRow[] | null, dek);
  const hasMore = rows.length > COMPLETED_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, COMPLETED_PAGE_SIZE) : rows;
  const nextCursor = page.length > 0 ? getCompletedCursor(page[page.length - 1]) : null;

  return { page, hasMore, nextCursor };
}

export async function fetchTasksSnapshot(userId: string, dek: Uint8Array | null) {
  const [categoriesRes, tagsRes, activeRes, countRes, completedPage] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('tags').select('*').eq('user_id', userId),
    supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('user_id', userId)
      .eq('done', false)
      .order('sort_order', { ascending: true }),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('done', true),
    fetchCompletedPage(userId, null, dek),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (tagsRes.error) throw tagsRes.error;
  if (activeRes.error) throw activeRes.error;
  if (countRes.error) throw countRes.error;

  // Names are encrypted, so the database cannot sort by them — sort after decrypting.
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const categories: Category[] = (categoriesRes.data ?? [])
    .map((row) => mapCategory(row, dek))
    .sort(byName);
  const tags: Tag[] = (tagsRes.data ?? []).map((row) => mapTag(row, dek)).sort(byName);
  const activeTasks = mapTaskRows(activeRes.data as TaskQueryRow[] | null, dek);
  const completedTasks = sortCompletedTasks(completedPage.page);

  return {
    categories,
    tags,
    activeTasks,
    completedTasks,
    completedCount: countRes.count ?? completedTasks.length,
    nextCursor: completedPage.nextCursor,
    hasMore: completedPage.hasMore,
  };
}
