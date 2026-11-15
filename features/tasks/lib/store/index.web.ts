import { openUserDb } from '@/core/localdb/openUserDb';
import { withFallback } from '@/features/tasks/lib/store/fallbackStore';
import { localTaskStore } from '@/features/tasks/lib/store/localStore';
import { remoteTaskStore } from '@/features/tasks/lib/store/remoteStore';
import { canUseLocalDb } from '@/shared/lib/canUseLocalDb';

const fallbackStore = canUseLocalDb
  ? withFallback(localTaskStore, remoteTaskStore, openUserDb)
  : null;

export const taskStore = fallbackStore ?? remoteTaskStore;

/**
 * Whether the account's data lives in the local database (decided once per user by the task
 * store). Other features follow this answer so all data of an account lives in one place.
 */
export function usesLocalDb(userId: string): Promise<boolean> {
  return fallbackStore ? fallbackStore.usesPrimary(userId) : Promise.resolve(false);
}
