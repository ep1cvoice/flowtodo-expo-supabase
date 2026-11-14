export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    attempts = 3,
    delayMs = 500,
    retryIf = () => true,
  }: { attempts?: number; delayMs?: number; retryIf?: (err: unknown) => boolean } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!retryIf(err)) break;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}
