import {
  clampFilterLimit,
  FILTER_LIMIT_DEFAULT,
} from '@/shared/constants/filterLimits';
import {
  PROFILE_FETCH_TIMEOUT_MS,
  PROFILE_RETRY_ATTEMPTS,
  PROFILE_RETRY_DELAY_MS,
} from '@/core/auth/constants';
import { withRetry } from '@/shared/lib/retry';
import { withTimeout } from '@/shared/lib/withTimeout';
import { supabase } from '@/core/supabase/client';
import type { ProfileUpdates, User } from '@/types';
import { logger } from '@/shared/lib/logger';

/** Raised when the profile query resolves with an error or no row, so it is retried like a thrown failure. */
class ProfileQueryError extends Error {}

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

const PROFILE_COLUMNS =
  'username, theme, notification_type, pomodoro_time, pomodoro_mode, view, max_filter_selections, salt, encrypted_dek, dek_iv, kdf_iterations';

type ProfileRow = {
  username: string | null;
  theme: string | null;
  notification_type: string | null;
  pomodoro_time: number | string | null;
  pomodoro_mode: string | null;
  view: string | null;
  max_filter_selections: number | null;
  salt: string | null;
  encrypted_dek: string | null;
  dek_iv: string | null;
  kdf_iterations: number | null;
};

// Concurrent callers (session bootstrap, auth events, DEK unwrap) share one query.
// Entries live only while the request is in flight, so later callers always get fresh data.
const inFlightProfileRows = new Map<string, Promise<ProfileRow>>();

/**
 * Fetches the whole profile row (settings + DEK material) with retry and timeout.
 * Throws after the retries are exhausted.
 */
export function fetchProfileRow(userId: string): Promise<ProfileRow> {
  const existing = inFlightProfileRows.get(userId);
  if (existing) return existing;

  const request = withRetry(
    async () => {
      const { data, error } = await withTimeout(
        supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).single(),
        PROFILE_FETCH_TIMEOUT_MS,
        'fetchProfile'
      );
      if (error || !data) throw new ProfileQueryError(error?.message);
      return data as ProfileRow;
    },
    { attempts: PROFILE_RETRY_ATTEMPTS, delayMs: PROFILE_RETRY_DELAY_MS }
  ).finally(() => {
    inFlightProfileRows.delete(userId);
  });

  inFlightProfileRows.set(userId, request);
  return request;
}

export async function fetchProfile(userId: string, email: string | undefined): Promise<User | null> {
  try {
    const data = await fetchProfileRow(userId);

    return {
      id: userId,
      email: email ?? '',
      username: data.username ?? '',
      settings: {
        theme: data.theme ?? undefined,
        notificationType: data.notification_type ?? undefined,
        pomodoroTime: data.pomodoro_time != null ? Number(data.pomodoro_time) : undefined,
        pomodoroMode: data.pomodoro_mode === 'countup' ? 'countup' : 'countdown',
        view: data.view ?? undefined,
        maxFilterSelections:
          data.max_filter_selections != null
            ? clampFilterLimit(Number(data.max_filter_selections))
            : FILTER_LIMIT_DEFAULT,
      },
    };
  } catch (err) {
    if (err instanceof ProfileQueryError) {
      logger.warn('fetchProfile failed after retries:', err.message || undefined);
    } else {
      logger.warn('fetchProfile threw after retries:', (err as Error)?.message ?? err);
    }
    return null;
  }
}

export function toProfileRow(updates: ProfileUpdates) {
  const row: {
    theme?: string;
    notification_type?: string;
    pomodoro_time?: number;
    pomodoro_mode?: string;
    view?: string;
    max_filter_selections?: number;
  } = {};

  if (updates.theme !== undefined) row.theme = updates.theme;
  if (updates.notificationType !== undefined) row.notification_type = updates.notificationType;
  if (updates.pomodoroTime !== undefined) row.pomodoro_time = updates.pomodoroTime;
  if (updates.pomodoroMode !== undefined) row.pomodoro_mode = updates.pomodoroMode;
  if (updates.view !== undefined) row.view = updates.view;
  if (updates.maxFilterSelections !== undefined) {
    row.max_filter_selections = clampFilterLimit(updates.maxFilterSelections);
  }

  return row;
}

/**
 * Persists profile settings and returns the (clamped) settings that were
 * actually applied so callers can mirror them in local state.
 */
export async function updateProfileSettings(
  userId: string,
  updates: ProfileUpdates
): Promise<{ error: string | null; applied: ProfileUpdates }> {
  const row = toProfileRow(updates);
  if (Object.keys(row).length === 0) {
    return { error: null, applied: {} };
  }

  const { error } = await supabase.from('profiles').update(row).eq('id', userId);
  if (error) {
    return { error: error.message, applied: {} };
  }

  const applied: ProfileUpdates = { ...updates };
  if (updates.maxFilterSelections !== undefined) {
    applied.maxFilterSelections = clampFilterLimit(updates.maxFilterSelections);
  }
  return { error: null, applied };
}
