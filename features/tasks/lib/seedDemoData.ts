import {
  DEMO_CATEGORIES,
  DEMO_TAGS,
  DEMO_TASKS,
  scheduledAtNoon,
} from '@/features/tasks/demoSeed';
import {
  insertEncryptedCategory,
  insertEncryptedTag,
  insertEncryptedTask,
} from '@/features/tasks/lib/mutations';

/**
 * Inserts demo categories, tags, and active tasks for a brand-new empty account.
 * Everything is written encrypted with the user's DEK (plaintext columns no longer exist).
 * Completed stays empty. Idempotent only via caller (seed when workspace is empty).
 */
export async function seedDemoData(userId: string, dek: Uint8Array): Promise<void> {
  const categoryEntries = await Promise.all(
    DEMO_CATEGORIES.map(async (c) => {
      const category = await insertEncryptedCategory(userId, dek, {
        name: c.name,
        color: c.color,
        icon: c.icon,
      });
      return [c.key, category.id] as const;
    })
  );
  const categoryIdByKey = new Map<string, number>(categoryEntries);

  const tagEntries = await Promise.all(
    DEMO_TAGS.map(async (t) => {
      const tag = await insertEncryptedTag(userId, dek, { name: t.name, color: t.color });
      return [t.key, tag.id] as const;
    })
  );
  const tagIdByKey = new Map<string, number>(tagEntries);

  // Sequential on purpose: keeps insertion order stable for the task list.
  for (const demo of DEMO_TASKS) {
    await insertEncryptedTask({
      userId,
      dek,
      title: demo.title,
      description: demo.description,
      categoryId:
        demo.categoryKey != null ? (categoryIdByKey.get(demo.categoryKey) ?? null) : null,
      tagIds: demo.tagKeys
        .map((key) => tagIdByKey.get(key))
        .filter((id): id is number => id != null),
      scheduled:
        demo.scheduledOffsetDays != null ? scheduledAtNoon(demo.scheduledOffsetDays) : null,
      sortOrder: demo.sortOrder,
    });
  }
}
