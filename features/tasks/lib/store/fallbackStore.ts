import type { TaskStore } from '@/features/tasks/lib/store/types';
import { logger } from '@/shared/lib/logger';
import { errorMessage } from '@/shared/lib/errorMessage';

const DATA_METHODS = [
  'fetchTasksSnapshot',
  'fetchCompletedPage',
  'fetchTaskById',
  'seedDemoData',
  'insertTask',
  'updateTask',
  'insertCategory',
  'insertTag',
  'deleteCategory',
  'deleteTag',
  'setTaskScheduled',
  'setTaskCompletedAt',
  'deleteTask',
  'deleteTasksByDone',
  'updateSortOrders',
] as const;

type DataMethod = (typeof DATA_METHODS)[number];

const userIdOf = (first: unknown): string =>
  typeof first === 'string' ? first : (first as { userId: string }).userId;

/**
 * Uses `primary` (the local database) when it can be opened and `fallback` (direct Supabase)
 * when it cannot, e.g. on web when a second tab holds the exclusive OPFS lock or the browser
 * lacks the required APIs. The choice is made once per user, on first use, so reads and
 * writes of an account never end up in two different places.
 */
export function withFallback(
  primary: TaskStore,
  fallback: TaskStore,
  probe: (userId: string) => Promise<unknown>
): TaskStore {
  const decisions = new Map<string, Promise<TaskStore>>();
  let primaryBroken = false;

  const pick = (userId: string): Promise<TaskStore> => {
    let decision = decisions.get(userId);
    if (!decision) {
      decision = probe(userId).then(
        () => {
          return primary;
        },
        (err) => {
          logger.warn('Local database unavailable, using online mode:', errorMessage(err));
          primaryBroken = true;
          return fallback;
        }
      );
      decisions.set(userId, decision);
    }
    return decision;
  };

  const store = {
    get localFirst() {
      return !primaryBroken;
    },
    requestSync: (userId: string) => {
      void pick(userId).then((target) => {
        if (target === primary) primary.requestSync(userId);
      });
    },
    flush: async (userId: string) => {
      if ((await pick(userId)) === primary) await primary.flush(userId);
    },
    subscribe: primary.subscribe,
    getSyncStatus: primary.getSyncStatus,
    subscribeSyncStatus: primary.subscribeSyncStatus,
  } as Record<string, unknown>;

  for (const method of DATA_METHODS) {
    store[method] = async (...args: unknown[]) => {
      const target = await pick(userIdOf(args[0]));
      return (target[method as DataMethod] as (...a: unknown[]) => unknown)(...args);
    };
  }

  return store as unknown as TaskStore;
}
