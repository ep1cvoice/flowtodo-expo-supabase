import { encryptField, hashForUniqueness } from '@/lib/crypto';
import { supabase } from '@/supabase/client';

/**
 * Jednorazowa (idempotentna) migracja: doszyfrowuje istniejące plaintextowe
 * rekordy usera, które nie mają jeszcze wypełnionych kolumn *_enc.
 * Bezpieczna do wielokrotnego uruchomienia — pomija już zaszyfrowane wiersze.
 */
export async function migrateUserEncryption(userId: string, dek: Uint8Array): Promise<void> {
  await Promise.all([
    migrateTasks(userId, dek),
    migrateTags(userId, dek),
    migrateCategories(userId, dek),
    migratePomodoros(userId, dek),
  ]);
}

async function migrateTasks(userId: string, dek: Uint8Array) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description')
    .eq('user_id', userId)
    .is('title_enc', null);

  if (error) {
    console.warn('migrateTasks: fetch failed', error.message);
    return;
  }
  if (!data || data.length === 0) return;

  for (const row of data) {
    try {
      const titleEnc = await encryptField(dek, row.title ?? '');
      const hasDescription = !!row.description?.trim();
      const descEnc = hasDescription ? await encryptField(dek, row.description!) : null;

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          title_enc: titleEnc.ciphertext,
          title_iv: titleEnc.iv,
          description_enc: descEnc?.ciphertext ?? null,
          description_iv: descEnc?.iv ?? null,
        })
        .eq('id', row.id)
        .eq('user_id', userId);

      if (updateError) console.warn(`migrateTasks: update failed for id=${row.id}`, updateError.message);
    } catch (err) {
      console.warn(`migrateTasks: encryption failed for id=${row.id}`, err);
    }
  }
}

async function migrateTags(userId: string, dek: Uint8Array) {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', userId)
    .is('name_enc', null);

  if (error) {
    console.warn('migrateTags: fetch failed', error.message);
    return;
  }
  if (!data || data.length === 0) return;

  for (const row of data) {
    try {
      const nameEnc = await encryptField(dek, row.name);
      const nameHash = hashForUniqueness(dek, row.name);

      const { error: updateError } = await supabase
        .from('tags')
        .update({
          name_enc: nameEnc.ciphertext,
          name_iv: nameEnc.iv,
          name_hash: nameHash,
        })
        .eq('id', row.id)
        .eq('user_id', userId);

      if (updateError) console.warn(`migrateTags: update failed for id=${row.id}`, updateError.message);
    } catch (err) {
      console.warn(`migrateTags: encryption failed for id=${row.id}`, err);
    }
  }
}

async function migrateCategories(userId: string, dek: Uint8Array) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .is('name_enc', null);

  if (error) {
    console.warn('migrateCategories: fetch failed', error.message);
    return;
  }
  if (!data || data.length === 0) return;

  for (const row of data) {
    try {
      const nameEnc = await encryptField(dek, row.name);
      const nameHash = hashForUniqueness(dek, row.name);

      const { error: updateError } = await supabase
        .from('categories')
        .update({
          name_enc: nameEnc.ciphertext,
          name_iv: nameEnc.iv,
          name_hash: nameHash,
        })
        .eq('id', row.id)
        .eq('user_id', userId);

      if (updateError) console.warn(`migrateCategories: update failed for id=${row.id}`, updateError.message);
    } catch (err) {
      console.warn(`migrateCategories: encryption failed for id=${row.id}`, err);
    }
  }
}

async function migratePomodoros(userId: string, dek: Uint8Array) {
  const { data, error } = await supabase
    .from('pomodoros')
    .select('id, task_name')
    .eq('user_id', userId)
    .is('task_name_enc', null);

  if (error) {
    console.warn('migratePomodoros: fetch failed', error.message);
    return;
  }
  if (!data || data.length === 0) return;

  for (const row of data) {
    try {
      const taskNameEnc = await encryptField(dek, row.task_name ?? '');

      const { error: updateError } = await supabase
        .from('pomodoros')
        .update({
          task_name_enc: taskNameEnc.ciphertext,
          task_name_iv: taskNameEnc.iv,
        })
        .eq('id', row.id)
        .eq('user_id', userId);

      if (updateError) console.warn(`migratePomodoros: update failed for id=${row.id}`, updateError.message);
    } catch (err) {
      console.warn(`migratePomodoros: encryption failed for id=${row.id}`, err);
    }
  }
}
