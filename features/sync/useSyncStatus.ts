import { useSyncExternalStore } from 'react';
import { taskStore } from '@/features/tasks/lib/store';
import type { SyncStatus } from '@/features/tasks/lib/store/types';

/** Live sync status of the task store (always idle for the online-only web store). */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(taskStore.subscribeSyncStatus, taskStore.getSyncStatus);
}
