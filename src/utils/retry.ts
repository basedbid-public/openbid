export interface RetryAsyncOptions {
  /** Delay before each retry; attempts = delaysMs.length + 1. */
  delaysMs?: number[];
  /** Name used in retry log lines, e.g. "Fee Builder setup". */
  label?: string;
}

/**
 * Run `fn`, retrying on rejection with the given backoff delays. Throws the
 * last error once all attempts are exhausted.
 */
export const retryAsync = async <T>(
  fn: () => Promise<T>,
  options?: RetryAsyncOptions,
): Promise<T> => {
  const { delaysMs = [2000, 5000], label = 'Operation' } = options ?? {};
  let lastError: unknown;

  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === delaysMs.length) {
        break;
      }
      console.log(
        `${label} failed (attempt ${attempt + 1} of ${delaysMs.length + 1}), retrying in ${delaysMs[attempt]! / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]!));
    }
  }

  throw lastError;
};
