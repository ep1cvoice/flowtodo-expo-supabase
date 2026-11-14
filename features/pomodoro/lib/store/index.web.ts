import { openUserDb } from '@/core/localdb/openUserDb';
import { localPomodoroStore } from '@/features/pomodoro/lib/store/localStore';
import { remotePomodoroStore } from '@/features/pomodoro/lib/store/remoteStore';
import type { PomodoroStore } from '@/features/pomodoro/lib/store/types';
import { canUseLocalDb } from '@/shared/lib/canUseLocalDb';
import { errorMessage } from '@/shared/lib/errorMessage';
import { logger } from '@/shared/lib/logger';

/**
 * Follows the task store's choice: the local database when it opens (the probe is the same
 * cached `openUserDb` call), direct Supabase otherwise. Decided once per user.
 */
const decisions = new Map<string, Promise<PomodoroStore>>();

function pick(userId: string): Promise<PomodoroStore> {
  let decision = decisions.get(userId);
  if (!decision) {
    decision = openUserDb(userId).then(
      () => localPomodoroStore,
      (err) => {
        logger.warn('Local database unavailable, using online mode:', errorMessage(err));
        return remotePomodoroStore;
      }
    );
    decisions.set(userId, decision);
  }
  return decision;
}

const userIdOf = (first: unknown): string =>
  typeof first === 'string' ? first : (first as { userId: string }).userId;

function withPick(): PomodoroStore {
  const store: Record<string, unknown> = {};
  for (const method of Object.keys(remotePomodoroStore) as (keyof PomodoroStore)[]) {
    store[method] = async (...args: unknown[]) => {
      const target = await pick(userIdOf(args[0]));
      return (target[method] as (...a: unknown[]) => unknown)(...args);
    };
  }
  return store as unknown as PomodoroStore;
}

export const pomodoroStore: PomodoroStore = canUseLocalDb ? withPick() : remotePomodoroStore;
