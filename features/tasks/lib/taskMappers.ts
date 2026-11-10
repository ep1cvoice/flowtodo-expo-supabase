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

/** A task row as selected by TASK_SELECT: labels are referenced by id only. */
export type TaskQueryRow = TaskRow & {
  task_tags: { tag_id: number }[] | null;
};

/** Already decrypted labels, used to resolve the ids referenced by task rows. */
export interface LabelLookup {
  categories: Map<number, Category>;
  tags: Map<number, Tag>;
}

export function buildLabelLookup(categories: Category[], tags: Tag[]): LabelLookup {
  return {
    categories: new Map(categories.map((c) => [c.id, c])),
    tags: new Map(tags.map((t) => [t.id, t])),
  };
}

function resolveLabels(row: TaskQueryRow, labels: LabelLookup) {
  const categoryId = row.category_id != null ? Number(row.category_id) : null;
  const tags = (row.task_tags ?? [])
    .map((link) => labels.tags.get(Number(link.tag_id)))
    .filter((t): t is Tag => t != null);
  return {
    categoryId,
    category: categoryId != null ? (labels.categories.get(categoryId) ?? null) : null,
    tags,
  };
}

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

export function mapTask(row: TaskQueryRow, dek: Uint8Array | null, labels: LabelLookup): Task {
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
    ...resolveLabels(row, labels),
    sortOrder: row.sort_order,
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
export function mapTaskOrPlaceholder(
  row: TaskQueryRow,
  dek: Uint8Array | null,
  labels: LabelLookup
): Task {
  try {
    return mapTask(row, dek, labels);
  } catch (err) {
    if (!isRowProblem(err, dek)) throw err;
    logger.warn(strings.tasks.undecryptableLog, (err as Error).message);
    return placeholderTask(row, labels);
  }
}

function placeholderTask(row: TaskQueryRow, labels: LabelLookup): Task {
  // Keep whatever is still readable: unencrypted columns and the (already mapped) labels.
  return {
    id: Number(row.id),
    title: strings.tasks.undecryptableTitle,
    description: '',
    done: row.done,
    scheduled: row.scheduled,
    completedAt: row.completed_at,
    created: row.created_at,
    ...resolveLabels(row, labels),
    sortOrder: row.sort_order,
  };
}
