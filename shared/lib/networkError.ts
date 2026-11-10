import { strings } from '@/shared/lib/strings';

export const NETWORK_TOAST = strings.common.noConnection;

/** Messages fetch implementations use for a failed request (Chrome, RN, Firefox, Safari). */
const FETCH_FAILURE_MESSAGES = [
  'failed to fetch',
  'network request failed',
  'networkerror',
  'load failed',
];

/** e.g. "Network request timed out", "request timed out after 8000ms". */
const NETWORK_TIMEOUT_PATTERN = /\b(network|request|connection)\b.*\btim(ed|e)[ -]?out\b/;

export function isNetworkError(err: unknown): boolean {
  if (err == null) return false;

  if (typeof err === 'object') {
    const e = err as {
      message?: string;
      name?: string;
      status?: number;
      code?: string;
      cause?: unknown;
    };

    if (e.status === 0) return true;
    if (e.name === 'TimeoutError') return true;
    if (e.code === 'NETWORK_ERROR' || e.code === 'ENOTFOUND' || e.code === 'ECONNABORTED') {
      return true;
    }

    const message = (e.message ?? '').toLowerCase();
    // A TypeError is only a network failure when it carries a fetch-failure
    // message; other TypeErrors are programming errors and must not be hidden.
    if (e.name === 'TypeError') {
      if (FETCH_FAILURE_MESSAGES.some((m) => message.includes(m))) return true;
    } else if (
      FETCH_FAILURE_MESSAGES.some((m) => message.includes(m)) ||
      message.includes('internet connection') ||
      message.includes('offline') ||
      NETWORK_TIMEOUT_PATTERN.test(message)
    ) {
      return true;
    }

    if (e.cause && isNetworkError(e.cause)) return true;
  }

  if (typeof err === 'string') {
    const message = err.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('offline')
    );
  }

  return false;
}

export function toastForError(err: unknown, fallback: string): string {
  return isNetworkError(err) ? NETWORK_TOAST : fallback;
}
