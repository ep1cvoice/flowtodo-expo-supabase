import {
  DEMO_CATEGORIES,
  DEMO_TAGS,
  DEMO_TASKS,
  scheduledAtNoon,
} from '@/data/demoSeed';
import { supabase } from '@/supabase/client';

/**
 * Inserts demo categories, tags, and active tasks for a brand-new empty account.
 * Completed stays empty. Idempotent only via caller (seed when workspace is empty).
 */
export async function seedDemoData(userId: string): Promise<void> {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .insert(
      DEMO_CATEGORIES.map((c) => ({
        user_id: userId,
        name: c.name,
        color: c.color,
        icon: c.icon,
      }))
    )
    .select('id, name');

  if (catError) throw catError;

  const categoryIdByKey = new Map<string, number>();
  for (const demo of DEMO_CATEGORIES) {
    const row = categories?.find((c) => c.name === demo.name);
    if (row) categoryIdByKey.set(demo.key, Number(row.id));
  }

  const { data: tags, error: tagError } = await supabase
    .from('tags')
    .insert(
      DEMO_TAGS.map((t) => ({
        user_id: userId,
        name: t.name,
        color: t.color,
      }))
    )
    .select('id, name');

  if (tagError) throw tagError;

  const tagIdByKey = new Map<string, number>();
  for (const demo of DEMO_TAGS) {
    const row = tags?.find((t) => t.name === demo.name);
    if (row) tagIdByKey.set(demo.key, Number(row.id));
  }

  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .insert(
      DEMO_TASKS.map((t) => ({
        user_id: userId,
        title: t.title,
        description: t.description,
        done: false,
        sort_order: t.sortOrder,
        category_id:
          t.categoryKey != null ? (categoryIdByKey.get(t.categoryKey) ?? null) : null,
        scheduled:
          t.scheduledOffsetDays != null ? scheduledAtNoon(t.scheduledOffsetDays) : null,
      }))
    )
    .select('id, title');

  if (taskError) throw taskError;

  const taskIdByTitle = new Map<string, number>();
  for (const row of tasks ?? []) {
    taskIdByTitle.set(row.title, Number(row.id));
  }

  const links: { task_id: number; tag_id: number }[] = [];
  for (const demo of DEMO_TASKS) {
    const taskId = taskIdByTitle.get(demo.title);
    if (taskId == null) continue;
    for (const tagKey of demo.tagKeys) {
      const tagId = tagIdByKey.get(tagKey);
      if (tagId != null) links.push({ task_id: taskId, tag_id: tagId });
    }
  }

  if (links.length > 0) {
    const { error: linkError } = await supabase.from('task_tags').insert(links);
    if (linkError) throw linkError;
  }
}
