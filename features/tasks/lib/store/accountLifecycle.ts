import { deleteUserDb } from '@/core/localdb/openUserDb';
import { taskStore } from '@/features/tasks/lib/store';
import { canUseLocalDb } from '@/shared/lib/canUseLocalDb';
import { errorMessage } from '@/shared/lib/errorMessage';
import { logger } from '@/shared/lib/logger';
import { isWeb } from '@/shared/lib/platform';
import { withTimeout } from '@/shared/lib/withTimeout';

/** Hooks auth calls when an account's session starts or ends (keeps auth free of store details). */

/** Bounds the wait for a sync round that is being cancelled. */
const STOP_SYNC_TIMEOUT_MS = 5_000;

/** Stops background sync before the session ends, so no round runs without its session. */
export async function stopAccountSync(userId: string) {
  try {
    await withTimeout(taskStore.stopSync(userId), STOP_SYNC_TIMEOUT_MS, 'stopSync');
  } catch (err) {
    logger.warn('Could not stop sync:', errorMessage(err));
  }
}

/** The session of an account became available (e.g. created after an offline sign-in). */
export function requestAccountSync(userId: string) {
  taskStore.requestSync(userId);
}

/** Removes the account's local replica (account deletion). */
export async function deleteLocalAccountData(userId: string) {
  await stopAccountSync(userId);
  // Native always has a local database; web only when the browser supports it.
  if (isWeb && !canUseLocalDb) return;
  try {
    await deleteUserDb(userId);
  } catch (err) {
    logger.warn('Could not delete the local database:', errorMessage(err));
  }
}
