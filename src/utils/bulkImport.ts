/**
 * Helpers for batched bulk import (reduces API calls vs per-row loops).
 */

export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (!size || size < 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export function getImportBatchSize(): number {
  const raw = import.meta.env.VITE_IMPORT_BATCH_SIZE;
  const n = parseInt(typeof raw === "string" ? raw : "50", 10);
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 500);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function postWithRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelayMs?: number;
    isRetryable?: (err: unknown) => boolean;
  },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const isRetryable =
    options?.isRetryable ??
    ((err: unknown) => {
      const anyErr = err as { response?: { status?: number }; code?: string };
      const status = anyErr?.response?.status;
      return (
        status === 429 ||
        status === 503 ||
        (!anyErr?.response &&
          (anyErr?.code === "ECONNABORTED" ||
            anyErr?.code === "ERR_NETWORK"))
      );
    });

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries || !isRetryable(err)) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `[bulkImport] retry ${attempt + 1}/${maxRetries} after ${delay}ms`,
        err,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}
