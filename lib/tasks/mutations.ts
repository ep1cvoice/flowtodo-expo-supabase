import { encryptField, hashForUniqueness } from '@/lib/crypto';
import { mapCategory, mapTag } from '@/lib/tasks/taskMappers';
import { encryptTaskFields } from '@/lib/tasks/encryptTaskFields';
import type { AddCategoryInput, AddTagInput } from '@/lib/tasks/types';
import { supabase } from '@/supabase/client';
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
}) {
  const enc = await encryptTaskFields(options.dek, options.title, options.description);

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: options.userId,
      title: '', // plaintext no longer written — real value in title_enc
      description: '', // plaintext no longer written — real value in description_enc
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
      title: '', // plaintext no longer written — real value in title_enc
      description: '', // plaintext no longer written — real value in description_enc
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
  const trimmedName = input.name.trim();
  const nameEnc = await encryptField(dek, trimmedName);
  const nameHash = hashForUniqueness(dek, trimmedName);

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: '', // plaintext no longer written — real value in name_enc
      color: input.color,
      icon: String(input.icon),
      name_enc: nameEnc.ciphertext,
      name_iv: nameEnc.iv,
      name_hash: nameHash,
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
  const trimmedName = input.name.trim();
  const nameEnc = await encryptField(dek, trimmedName);
  const nameHash = hashForUniqueness(dek, trimmedName);

  const { data, error } = await supabase
    .from('tags')
    .insert({
      user_id: userId,
      name: '', // plaintext no longer written — real value in name_enc
      color: input.color,
      name_enc: nameEnc.ciphertext,
      name_iv: nameEnc.iv,
      name_hash: nameHash,
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
