import { useCallback } from 'react';
import { useToast } from '@/shared/providers/ToastContext';
import { toastForError } from '@/shared/lib/networkError';

export type ToastedResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

// Returns `run(action, fallback)`: awaits `action`, and on failure shows an error toast
// (network errors get the shared network message, anything else the given fallback).
// Never rejects; the result says whether the action succeeded (and carries the error if not).
export function useToastedAction() {
  const { showToast } = useToast();

  return useCallback(
    async <T>(action: () => Promise<T>, fallback: string): Promise<ToastedResult<T>> => {
      try {
        return { ok: true, value: await action() };
      } catch (err) {
        showToast(toastForError(err, fallback), 'error');
        return { ok: false, error: err };
      }
    },
    [showToast],
  );
}
