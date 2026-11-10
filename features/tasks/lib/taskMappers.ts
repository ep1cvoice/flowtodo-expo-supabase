import {
  decryptColumn,
  decryptOptionalColumn,
  DecryptionError,
} from '@/core/crypto/decryptColumn';
import { logger } from '@/shared/lib/logger';
import { strings } from '@/shared/lib/strings';
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

function isRowProblem(err: unknown, dek: Uint8Array | null): dek is Uint8Array {
  // A missing DEK is not a per-row problem and must keep failing loudly.
  return !!dek && err instanceof DecryptionError;
}

/** Like mapCategory, but an undecryptable row becomes a placeholder (id/color/icon are kept). */
export function mapCategoryOrPlaceholder(row: CategoryRow, dek: Uint8Array | null): Category {
  try {
    return mapCategory(row, dek);
  } catch (err) {
    if (!isRowProblem(err, dek)) throw err;
    logger.warn(strings.tasks.undecryptableLabelLog, (err as Error).message);
    return {
      id: Number(row.id),
      name: strings.tasks.undecryptableTitle,
      color: row.color,
      icon: row.icon,
    };
  }
}

/** Like mapTag, but an undecryptable row becomes a placeholder (id/color are kept). */
export function mapTagOrPlaceholder(row: TagRow, dek: Uint8Array | null): Tag {
  try {
    return mapTag(row, dek);
  } catch (err) {
    if (!isRowProblem(err, dek)) throw err;
    logger.warn(strings.tasks.undecryptableLabelLog, (err as Error).message);
    return { id: Number(row.id), name: strings.tasks.undecryptableTitle, color: row.color };
  }
}

/**
 * Like mapTask, but a row that cannot be decrypted becomes a placeholder task (so one
 * corrupted row does not break the whole list). A missing DEK still throws.
 */
export function mapTaskOrPlaceholder(row: TaskQueryRow, dek: Uint8Array | null): Task {
  try {
    return mapTask(row, dek);
  } catch (err) {
    if (!isRowProblem(err, dek)) throw err;
    logger.warn(strings.tasks.undecryptableLog, (err as Error).message);
    return placeholderTask(row, dek);
  }
}

function placeholderTask(row: TaskQueryRow, dek: Uint8Array): Task {
  // Keep whatever is still readable: unencrypted columns, and labels (placeholders if broken).
  return {
    id: Number(row.id),
    title: strings.tasks.undecryptableTitle,
    description: '',
    done: row.done,
    scheduled: row.scheduled,
    completedAt: row.completed_at,
    created: row.created_at,
    categoryId: row.category_id != null ? Number(row.category_id) : null,
    category: row.categories ? mapCategoryOrPlaceholder(row.categories, dek) : null,
    sortOrder: row.sort_order,
    tags: (row.task_tags ?? [])
      .map((link) => (link.tags ? mapTagOrPlaceholder(link.tags, dek) : null))
      .filter((t): t is Tag => t != null),
  };
}
