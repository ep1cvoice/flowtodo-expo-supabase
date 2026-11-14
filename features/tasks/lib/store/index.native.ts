import { localTaskStore } from '@/features/tasks/lib/store/localStore';

/** Native is local-first: SQLite replica + background sync. */
export const taskStore = localTaskStore;
