import { decryptColumn, decryptOptionalColumn } from '@/core/crypto/decryptColumn';
import type { Category, Tag, Task } from '@/types';
import type { Database } from '@/types/database';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type TagRow = Database['public']['Tables']['tags']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];

export type TaskQueryRow = TaskRow & {
  categories: CategoryRow | null;
  task_tags: { tags: TagRow | null }[] | null;
};

// All mappers below throw DecryptionError (see core/crypto/decryptColumn) when a value
// cannot be decrypted: missing DEK, missing ciphertext/IV, or a failed decryption.

export function mapCategory(row: CategoryRow, dek: Uint8Array | null): Category {
  return {
    id: Number(row.id),
    name: decryptColumn(dek, row.name_enc, row.name_iv, {
      table: 'categories',
      id: row.id,
      column: 'name',
    }),
    color: row.color,
    icon: row.icon,
  };
}

export function mapTag(row: TagRow, dek: Uint8Array | null): Tag {
  return {
    id: Number(row.id),
    name: decryptColumn(dek, row.name_enc, row.name_iv, {
      table: 'tags',
      id: row.id,
      column: 'name',
    }),
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
    title: decryptColumn(dek, row.title_enc, row.title_iv, {
      table: 'tasks',
      id: row.id,
      column: 'title',
    }),
    // An empty description is stored as NULL (encryptedColumns with emptyAsNull).
    description: decryptOptionalColumn(dek, row.description_enc, row.description_iv, {
      table: 'tasks',
      id: row.id,
      column: 'description',
    }),
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
