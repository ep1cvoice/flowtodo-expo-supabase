import {
  COMPLETED_PAGE_SIZE,
  completedKeysetOrFilter,
  getCompletedCursor,
  sortCompletedTasks,
  type CompletedCursor,
} from '@/features/tasks/lib/completedPagination';
import {
  buildLabelLookup,
  mapCategoryOrPlaceholder,
  mapTagOrPlaceholder,
  mapTaskOrPlaceholder,
  type LabelLookup,
  type TaskQueryRow,
} from '@/features/tasks/lib/taskMappers';
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
  task_tags ( tag_id )
`;

export function mapTaskRows(
  rows: TaskQueryRow[] | null | undefined,
  dek: Uint8Array | null,
  labels: LabelLookup
): Task[] {
  return (rows ?? []).map((row) => mapTaskOrPlaceholder(row, dek, labels));
}

async function fetchCompletedRows(userId: string, cursor: CompletedCursor | null) {
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
  return data as TaskQueryRow[] | null;
}

function toCompletedPage(
  data: TaskQueryRow[] | null,
  dek: Uint8Array | null,
  labels: LabelLookup
) {
  const rows = mapTaskRows(data, dek, labels);
  const hasMore = rows.length > COMPLETED_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, COMPLETED_PAGE_SIZE) : rows;
  const nextCursor = page.length > 0 ? getCompletedCursor(page[page.length - 1]) : null;

  return { page, hasMore, nextCursor };
}

/** `labels` must hold the user's already decrypted categories and tags. */
export async function fetchCompletedPage(
  userId: string,
  cursor: CompletedCursor | null,
  dek: Uint8Array | null,
  labels: LabelLookup
) {
  return toCompletedPage(await fetchCompletedRows(userId, cursor), dek, labels);
}

/** Fetches a single task; null when it does not exist (e.g. deleted in the meantime). */
export async function fetchTaskById(
  userId: string,
  id: number,
  dek: Uint8Array | null,
  labels: LabelLookup
): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTaskOrPlaceholder(data as TaskQueryRow, dek, labels) : null;
}

export async function fetchTasksSnapshot(userId: string, dek: Uint8Array | null) {
  const [categoriesRes, tagsRes, activeRes, countRes, completedRes] = await Promise.all([
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
    fetchCompletedRows(userId, null),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (tagsRes.error) throw tagsRes.error;
  if (activeRes.error) throw activeRes.error;
  if (countRes.error) throw countRes.error;

  // Names are encrypted, so the database cannot sort by them — sort after decrypting.
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const categories: Category[] = (categoriesRes.data ?? [])
    .map((row) => mapCategoryOrPlaceholder(row, dek))
    .sort(byName);
  const tags: Tag[] = (tagsRes.data ?? []).map((row) => mapTagOrPlaceholder(row, dek)).sort(byName);
  const labels = buildLabelLookup(categories, tags);
  const activeTasks = mapTaskRows(activeRes.data as TaskQueryRow[] | null, dek, labels);
  const completedPage = toCompletedPage(completedRes, dek, labels);
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
