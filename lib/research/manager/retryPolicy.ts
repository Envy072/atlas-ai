import type { RetryPolicy } from "@/lib/research/manager/types";

// The outer ceiling ProviderManager enforces above whatever a provider
// does internally (Tavily/Brave each use an 8s internal timeout via
// fetchWithRetry) — a defensive backstop in case a provider hangs beyond
// its own timeout, not the provider's own retry mechanism.
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  timeoutMs: 10_000,
  maxRetries: 1,
  baseBackoffMs: 400,
};
