import type { CompletedCursor } from '@/features/tasks/lib/completedPagination';
import type { LabelLookup } from '@/features/tasks/lib/taskMappers';
import type { AddCategoryInput, AddTagInput } from '@/features/tasks/lib/types';
import type { Category, Tag, Task } from '@/types';

export interface TasksSnapshot {
  categories: Category[];
  tags: Tag[];
  activeTasks: Task[];
  completedTasks: Task[];
  completedCount: number;
  nextCursor: CompletedCursor | null;
  hasMore: boolean;
}

export interface CompletedPageResult {
  page: Task[];
  hasMore: boolean;
  nextCursor: CompletedCursor | null;
}

export interface SyncStatus {
  /** A sync round is running right now. */
  syncing: boolean;
  /** Local changes that have not reached the server yet. */
  pending: number;
  /** Message of the last failed push/pull; null after a successful round. */
  error: string | null;
  lastSyncedAt: string | null;
}

export const IDLE_SYNC_STATUS: SyncStatus = {
  syncing: false,
  pending: 0,
  error: null,
  lastSyncedAt: null,
};

export interface InsertTaskOptions {
  userId: string;
  dek: Uint8Array;
  title: string;
  description: string;
  categoryId: number | null;
  tagIds: number[];
  scheduled: string | null;
  sortOrder: number;
}

export interface UpdateTaskOptions {
  userId: string;
  dek: Uint8Array;
  id: number;
  title: string;
  description: string;
  categoryId: number | null;
  tagIds: number[];
}

/**
 * Everything the tasks feature needs from persistence. The web build uses the remote
 * implementation (every call hits Supabase); native uses a local SQLite replica that is
 * synchronised with Supabase in the background.
 */
export interface TaskStore {
  /** True when data lives locally and `requestSync` / `subscribe` do real work. */
  readonly localFirst: boolean;

  fetchTasksSnapshot(userId: string, dek: Uint8Array | null): Promise<TasksSnapshot>;
  fetchCompletedPage(
    userId: string,
    cursor: CompletedCursor | null,
    dek: Uint8Array | null,
    labels: LabelLookup
  ): Promise<CompletedPageResult>;
  fetchTaskById(
    userId: string,
    id: number,
    dek: Uint8Array | null,
    labels: LabelLookup
  ): Promise<Task | null>;
  seedDemoData(userId: string, dek: Uint8Array): Promise<boolean>;

  insertTask(options: InsertTaskOptions): Promise<number>;
  updateTask(options: UpdateTaskOptions): Promise<void>;
  insertCategory(userId: string, dek: Uint8Array, input: AddCategoryInput): Promise<Category>;
  insertTag(userId: string, dek: Uint8Array, input: AddTagInput): Promise<Tag>;
  deleteCategory(userId: string, id: number): Promise<void>;
  deleteTag(userId: string, id: number): Promise<void>;
  setTaskScheduled(userId: string, id: number, scheduled: string | null): Promise<void>;
  setTaskCompletedAt(userId: string, id: number, completedAt: string | null): Promise<void>;
  deleteTask(userId: string, id: number): Promise<void>;
  deleteTasksByDone(userId: string, done: boolean): Promise<void>;
  updateSortOrders(userId: string, items: { id: number; sortOrder: number }[]): Promise<void>;

  /** Starts a background push + pull (no-op for the remote store). Never throws. */
  requestSync(userId: string): void;
  /** Pushes all pending changes and resolves when done; throws when it cannot (e.g. offline). */
  flush(userId: string): Promise<void>;
  /** Stable snapshot (same object until something changes), for useSyncExternalStore. */
  getSyncStatus(): SyncStatus;
  subscribeSyncStatus(listener: () => void): () => void;
  /** Called after a sync changed local data. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}
