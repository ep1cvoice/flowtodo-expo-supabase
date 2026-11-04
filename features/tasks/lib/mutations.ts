import { encryptedColumns } from '@/core/crypto/encryptedColumns';
import { mapCategory, mapTag } from '@/features/tasks/lib/taskMappers';
import { encryptTaskFields } from '@/features/tasks/lib/encryptTaskFields';
import type { AddCategoryInput, AddTagInput } from '@/features/tasks/lib/types';
import { supabase } from '@/core/supabase/client';
import type { Category, Tag } from '@/types';

export async function insertEncryptedTask(options: {
  userId: string;
  dek: Uint8Array;
  title: string;
  description: string;
  categoryId: number | null;
  tagIds: number[];
  scheduled: string | null;
  sortOrder: number;
}): Promise<number> {
  const enc = await encryptTaskFields(options.dek, options.title, options.description);

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: options.userId,
      category_id: options.categoryId,
      sort_order: options.sortOrder,
      done: false,
      scheduled: options.scheduled,
      ...enc,
    })
    .select('id')
    .single();

  if (error) throw error;

  if (options.tagIds.length > 0) {
    const { error: tagError } = await supabase.from('task_tags').insert(
      options.tagIds.map((tag_id) => ({ task_id: data.id, tag_id }))
    );
    if (tagError) throw tagError;
  }

  return Number(data.id);
}

export async function updateEncryptedTask(options: {
  userId: string;
  dek: Uint8Array;
  id: number;
  title: string;
  description: string;
  categoryId: number | null;
  tagIds: number[];
}) {
  const enc = await encryptTaskFields(options.dek, options.title, options.description);

  const { error } = await supabase
    .from('tasks')
    .update({
      category_id: options.categoryId,
      ...enc,
    })
    .eq('id', options.id)
    .eq('user_id', options.userId);

  if (error) throw error;

  const { error: clearError } = await supabase.from('task_tags').delete().eq('task_id', options.id);
  if (clearError) throw clearError;

  if (options.tagIds.length > 0) {
    const { error: tagError } = await supabase
      .from('task_tags')
      .insert(options.tagIds.map((tag_id) => ({ task_id: options.id, tag_id })));
    if (tagError) throw tagError;
  }
}

export async function insertEncryptedCategory(
  userId: string,
  dek: Uint8Array,
  input: AddCategoryInput
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      color: input.color,
      icon: String(input.icon),
      ...(await encryptedColumns(dek, 'name', input.name, { hash: true })),
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapCategory(data, dek);
}

export async function insertEncryptedTag(
  userId: string,
  dek: Uint8Array,
  input: AddTagInput
): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({
      user_id: userId,
      color: input.color,
      ...(await encryptedColumns(dek, 'name', input.name, { hash: true })),
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapTag(data, dek);
}

export async function deleteCategoryForUser(userId: string, id: number) {
  const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteTagForUser(userId: string, id: number) {
  const { error } = await supabase.from('tags').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function setTaskScheduledRow(
  userId: string,
  id: number,
  scheduled: string | null
) {
  const { error } = await supabase
    .from('tasks')
    .update({ scheduled })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function setTaskDoneRow(
  userId: string,
  id: number,
  done: boolean,
  completedAt: string | null
) {
  const { error } = await supabase
    .from('tasks')
    .update({ done, completed_at: completedAt })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteTaskForUser(userId: string, id: number) {
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteTasksByDone(userId: string, done: boolean) {
  const { error } = await supabase.from('tasks').delete().eq('user_id', userId).eq('done', done);
  if (error) throw error;
}

export async function updateTaskSortOrders(
  userId: string,
  items: { id: number; sortOrder: number }[]
) {
  const results = await Promise.all(
    items.map(({ id, sortOrder }) =>
      supabase.from('tasks').update({ sort_order: sortOrder }).eq('id', id).eq('user_id', userId)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
