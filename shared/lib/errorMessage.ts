/**
 * Readable message for anything that can be thrown. Supabase/PostgREST errors are plain
 * objects (not `Error` instances), so `String(err)` would give "[object Object]".
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const { message, details, hint } = err as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const text = [message, details, hint].filter(
      (v): v is string => typeof v === 'string' && v !== ''
    );
    if (text.length > 0) return text.join(' — ');
    try {
      return JSON.stringify(err);
    } catch {
      /* fall through */
    }
  }
  return String(err);
}
