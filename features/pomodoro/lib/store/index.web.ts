import { localPomodoroStore } from '@/features/pomodoro/lib/store/localStore';
import { remotePomodoroStore } from '@/features/pomodoro/lib/store/remoteStore';
import type { PomodoroStore } from '@/features/pomodoro/lib/store/types';
import { usesLocalDb } from '@/features/tasks/lib/store/index.web';

/**
 * Follows the task store's choice (the same per-user decision, not a second probe of the
 * database, which could succeed later than the first one did): the local database when the
 * tasks use it, direct Supabase otherwise. So tasks and sessions never end up apart.
 */
const pick = async (userId: string): Promise<PomodoroStore> =>
  (await usesLocalDb(userId)) ? localPomodoroStore : remotePomodoroStore;

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

export const pomodoroStore: PomodoroStore = withPick();
