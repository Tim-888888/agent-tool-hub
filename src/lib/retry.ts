/**
 * Retry wrapper with exponential backoff.
 * Per D-11: retry failed fetches up to 3 times.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('unreachable');
}
