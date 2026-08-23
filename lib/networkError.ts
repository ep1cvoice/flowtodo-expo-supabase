export const NETWORK_TOAST =
  "No connection. Try again when you're back online.";

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
    if (e.name === 'TypeError' || e.name === 'TimeoutError') return true;
    if (e.code === 'NETWORK_ERROR' || e.code === 'ENOTFOUND' || e.code === 'ECONNABORTED') {
      return true;
    }

    const message = (e.message ?? '').toLowerCase();
    if (
      message.includes('network request failed') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('internet connection') ||
      message.includes('offline') ||
      message.includes('timeout')
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
