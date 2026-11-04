export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, delayMs = 500 }: { attempts?: number; delayMs?: number } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}
