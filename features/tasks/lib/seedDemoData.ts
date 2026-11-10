import { encryptedColumns } from '@/core/crypto/encryptedColumns';
import { supabase } from '@/core/supabase/client';
import {
  DEMO_CATEGORIES,
  DEMO_TAGS,
  DEMO_TASKS,
  scheduledAtNoon,
} from '@/features/tasks/lib/demoSeed';
import { encryptTaskFields } from '@/features/tasks/lib/encryptTaskFields';

/**
 * Seeds demo categories, tags, and active tasks for a brand-new account, once.
 * Everything is encrypted with the user's DEK on the device and written by a single RPC, so it
 * is atomic. `profiles.demo_seeded_at` records that it happened, so the demo content does not
 * return after the user deletes everything. Completed stays empty.
 *
 * @returns true when data was seeded, false when the account had already been seeded.
 */
export async function seedDemoData(userId: string, dek: Uint8Array): Promise<boolean> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('demo_seeded_at')
    .eq('id', userId)
    .single();
  if (profileError) throw profileError;
  if (profile.demo_seeded_at) return false;

  const categories = await Promise.all(
    DEMO_CATEGORIES.map(async (c) => ({
      key: c.key,
      color: c.color,
      icon: c.icon,
      ...(await encryptedColumns(dek, 'name', c.name, { hash: true })),
    }))
  );
  const tags = await Promise.all(
    DEMO_TAGS.map(async (t) => ({
      key: t.key,
      color: t.color,
      ...(await encryptedColumns(dek, 'name', t.name, { hash: true })),
    }))
  );
  // The RPC inserts tasks in array order, which keeps the insertion order stable.
  const tasks = await Promise.all(
    DEMO_TASKS.map(async (demo) => ({
      ...(await encryptTaskFields(dek, demo.title, demo.description)),
      category_key: demo.categoryKey,
      tag_keys: demo.tagKeys,
      scheduled:
        demo.scheduledOffsetDays != null ? scheduledAtNoon(demo.scheduledOffsetDays) : null,
      sort_order: demo.sortOrder,
    }))
  );

  const { data, error } = await supabase.rpc('seed_demo_data', {
    p_categories: categories,
    p_tags: tags,
    p_tasks: tasks,
  });
  if (error) throw error;
  return data === true;
}
