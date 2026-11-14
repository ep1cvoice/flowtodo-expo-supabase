import { remoteTaskStore } from '@/features/tasks/lib/store/remoteStore';

/** Always the online-only store. Used by Jest, which has no SQLite. */
export const taskStore = remoteTaskStore;
