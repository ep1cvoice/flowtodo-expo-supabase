import { decryptField } from '@/lib/crypto';
import type { Category, Tag, Task } from '@/types';
import type { Database } from '@/types/database';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type TagRow = Database['public']['Tables']['tags']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];

export type TaskQueryRow = TaskRow & {
  categories: CategoryRow | null;
  task_tags: { tags: TagRow | null }[] | null;
};

/** Odszyfrowuje pole jeśli dostępne są enc+iv i mamy DEK; inaczej fallback na plaintext kolumnę. */
function resolveField(
  dek: Uint8Array | null,
  encrypted: string | null,
  iv: string | null,
  plaintextFallback: string
): string {
  if (dek && encrypted && iv) {
    try {
      return decryptField(dek, encrypted, iv);
    } catch (err) {
      console.warn('Failed to decrypt field, falling back to plaintext:', err);
      return plaintextFallback;
    }
  }
  return plaintextFallback;
}

export function mapCategory(row: CategoryRow, dek: Uint8Array | null): Category {
  return {
    id: Number(row.id),
    name: resolveField(dek, row.name_enc, row.name_iv, row.name),
    color: row.color,
    icon: row.icon,
  };
}

export function mapTag(row: TagRow, dek: Uint8Array | null): Tag {
  return {
    id: Number(row.id),
    name: resolveField(dek, row.name_enc, row.name_iv, row.name),
    color: row.color,
  };
}

export function mapTask(row: TaskQueryRow, dek: Uint8Array | null): Task {
  const category = row.categories ? mapCategory(row.categories, dek) : null;
  const tags = (row.task_tags ?? [])
    .map((link) => (link.tags ? mapTag(link.tags, dek) : null))
    .filter((t): t is Tag => t != null);

  return {
    id: Number(row.id),
    title: resolveField(dek, row.title_enc, row.title_iv, row.title),
    description: resolveField(dek, row.description_enc, row.description_iv, row.description ?? ''),
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
