import {
  clampFilterLimit,
  FILTER_LIMIT_DEFAULT,
} from '@/constants/filterLimits';
import {
  PROFILE_FETCH_TIMEOUT_MS,
  PROFILE_RETRY_ATTEMPTS,
  PROFILE_RETRY_DELAY_MS,
} from '@/lib/auth/constants';
import { withTimeout } from '@/lib/withTimeout';
import { supabase } from '@/supabase/client';
import type { ProfileUpdates, User } from '@/types';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function minimalUserFromSession(userId: string, email: string | undefined): User {
  return {
    id: userId,
    email: email ?? '',
    username: '',
    settings: {
      maxFilterSelections: FILTER_LIMIT_DEFAULT,
    },
  };
}

export async function fetchProfile(
  userId: string,
  email: string | undefined,
  attempt = 1
): Promise<User | null> {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select(
          'username, theme, notification_type, pomodoro_time, view, max_filter_selections'
        )
        .eq('id', userId)
        .single(),
      PROFILE_FETCH_TIMEOUT_MS,
      'fetchProfile'
    );

    if (error || !data) {
      if (attempt < PROFILE_RETRY_ATTEMPTS) {
        await wait(PROFILE_RETRY_DELAY_MS * attempt);
        return fetchProfile(userId, email, attempt + 1);
      }
      console.warn('fetchProfile failed after retries:', error?.message);
      return null;
    }

    return {
      id: userId,
      email: email ?? '',
      username: data.username ?? '',
      settings: {
        theme: data.theme ?? undefined,
        notificationType: data.notification_type ?? undefined,
        pomodoroTime: data.pomodoro_time != null ? Number(data.pomodoro_time) : undefined,
        view: data.view ?? undefined,
        maxFilterSelections:
          data.max_filter_selections != null
            ? clampFilterLimit(Number(data.max_filter_selections))
            : FILTER_LIMIT_DEFAULT,
      },
    };
  } catch (err) {
    if (attempt < PROFILE_RETRY_ATTEMPTS) {
      await wait(PROFILE_RETRY_DELAY_MS * attempt);
      return fetchProfile(userId, email, attempt + 1);
    }
    console.warn('fetchProfile threw after retries:', (err as Error)?.message ?? err);
    return null;
  }
}

export function toProfileRow(updates: ProfileUpdates) {
  const row: {
    theme?: string;
    notification_type?: string;
    pomodoro_time?: number;
    view?: string;
    max_filter_selections?: number;
  } = {};

  if (updates.theme !== undefined) row.theme = updates.theme;
  if (updates.notificationType !== undefined) row.notification_type = updates.notificationType;
  if (updates.pomodoroTime !== undefined) row.pomodoro_time = updates.pomodoroTime;
  if (updates.view !== undefined) row.view = updates.view;
  if (updates.maxFilterSelections !== undefined) {
    row.max_filter_selections = clampFilterLimit(updates.maxFilterSelections);
  }

  return row;
}
