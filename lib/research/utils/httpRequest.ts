// A generic, provider-agnostic HTTP helper: real (no external dependency
// needed — fetch + AbortController are both platform built-ins), unlike
// providers/ranking's placeholders. Any current or future provider that
// needs to make a real HTTP call should go through this rather than
// hand-rolling its own timeout/retry logic.

export class RequestTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${safeUrlForLogging(url)} timed out after ${timeoutMs}ms.`);
    this.name = "RequestTimeoutError";
  }
}

// Never let a caller accidentally log a URL with an API key embedded in
// its query string — strips the query entirely for any message this
// module produces itself. (Providers must still avoid putting secrets in
// the URL in the first place; this is a second line of defense.)
function safeUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "[unparseable URL]";
  }
}

export interface FetchWithRetryOptions {
  /** Per-attempt timeout, in milliseconds. @default 8000 */
  timeoutMs?: number;
  /** Additional attempts after the first. @default 2 */
  maxRetries?: number;
  /** Base delay before the first retry; doubles each subsequent retry. @default 300 */
  baseBackoffMs?: number;
}

const DEFAULT_OPTIONS: Required<FetchWithRetryOptions> = {
  timeoutMs: 8000,
  maxRetries: 2,
  baseBackoffMs: 300,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A 4xx (other than 429) means the request itself is wrong — retrying it
// unchanged wouldn't help. A 5xx or 429 (rate limited) is worth retrying.
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

// Fetches with a hard per-attempt timeout (AbortController) and
// exponential backoff between retries. Resolves with the last response
// received even if it's a non-OK, non-retryable status (callers decide
// what counts as success for their API); rejects only if every attempt
// timed out or threw.
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { timeoutMs, maxRetries, baseBackoffMs } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      if (response.ok || !isRetryableStatus(response.status)) {
        return response;
      }

      lastError = new Error(`Received retryable HTTP status ${response.status}.`);
    } catch (error) {
      lastError =
        error instanceof DOMException && error.name === "AbortError"
          ? new RequestTimeoutError(url, timeoutMs)
          : error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < maxRetries) {
      await sleep(baseBackoffMs * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed after retries.");
}
