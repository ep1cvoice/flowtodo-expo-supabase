import { openUserDb } from '@/core/localdb/openUserDb';
import { withFallback } from '@/features/tasks/lib/store/fallbackStore';
import { localTaskStore } from '@/features/tasks/lib/store/localStore';
import { remoteTaskStore } from '@/features/tasks/lib/store/remoteStore';
import { canUseLocalDb } from '@/shared/lib/canUseLocalDb';

export const taskStore = canUseLocalDb
  ? withFallback(localTaskStore, remoteTaskStore, openUserDb)
  : remoteTaskStore;
