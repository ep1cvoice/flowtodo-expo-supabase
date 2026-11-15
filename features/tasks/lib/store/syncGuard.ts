import { supabase } from '@/core/supabase/client';
import { strings } from '@/shared/lib/strings';

/**
 * Guards for a sync round.
 *
 * RLS answers a query made without a session (or with another account's session) with an
 * empty result instead of an error. Applied as a pull, that would wipe the local replica;
 * pushed rows would collide with RLS and be given new ids. So every round checks that the
 * Supabase session belongs to the account whose database it is syncing.
 */

/** No Supabase session for this account (signed out, offline sign-in, account switched). */
export class SyncSessionError extends Error {
  constructor() {
    super(strings.sync.noSession);
    this.name = 'SyncSessionError';
  }
}

/** The round was cancelled (timeout or logout). */
export class SyncAbortedError extends Error {
  constructor() {
    super(strings.sync.aborted);
    this.name = 'SyncAbortedError';
  }
}

export interface SyncOptions {
  /** Aborts the round: pending requests are cancelled and no further step runs. */
  signal?: AbortSignal;
}

/** A signal that never fires, for callers that do not cancel. */
export const NEVER_ABORTED: AbortSignal = new AbortController().signal;

export function signalOf(options?: SyncOptions): AbortSignal {
  return options?.signal ?? NEVER_ABORTED;
}

export function checkpoint(signal: AbortSignal) {
  if (signal.aborted) throw new SyncAbortedError();
}

/** Throws unless the current Supabase session belongs to `userId`. */
export async function assertSession(userId: string, signal: AbortSignal = NEVER_ABORTED) {
  checkpoint(signal);
  const { data, error } = await supabase.auth.getSession();
  // A failed refresh (e.g. no connection) is transient: the round is retried later.
  if (error) throw error;
  if (data.session?.user?.id !== userId) throw new SyncSessionError();
  checkpoint(signal);
}
