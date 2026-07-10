import type { ProviderId } from "@/lib/research/schemas/enums";

// In-process metrics for one provider, accumulated across every attempt
// ProviderManager has made against it since the server started. Not a
// Zod-validated data shape — it never crosses a request/response
// boundary, only ResearchResult.providerSummary (a snapshot derived from
// this) does.
export interface ProviderMetricsSnapshot {
  providerId: ProviderId;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  totalSourceCount: number;
  lastLatencyMs: number | null;
  averageLatencyMs: number | null;
  lastSuccessfulRequestAt: string | null;
}

// How ProviderManager should time out and retry a single provider call.
export interface RetryPolicy {
  /** Outer timeout ceiling for one logical provider call, in ms. */
  timeoutMs: number;
  /** Additional attempts after the first, only for retryable outcomes. */
  maxRetries: number;
  /** Base delay before the first retry; doubles each subsequent retry. */
  baseBackoffMs: number;
}
