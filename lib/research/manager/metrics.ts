import type { ProviderId } from "@/lib/research/schemas/enums";
import type { ProviderResultStatus } from "@/lib/research/schemas/enums";
import type { ProviderMetricsSnapshot } from "@/lib/research/manager/types";

// Real, working metrics tracking — an in-process Map, the same pattern
// MemoryResearchCache already uses. Resets on server restart; a
// production deployment with multiple instances would eventually want
// this backed by something shared, the same way cache/ already
// anticipates a Redis/database backend — see PROVIDER_MANAGER.md.
const store = new Map<ProviderId, ProviderMetricsSnapshot>();

function emptySnapshot(providerId: ProviderId): ProviderMetricsSnapshot {
  return {
    providerId,
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
    timeoutCount: 0,
    totalSourceCount: 0,
    lastLatencyMs: null,
    averageLatencyMs: null,
    lastSuccessfulRequestAt: null,
  };
}

export interface RecordAttemptInput {
  providerId: ProviderId;
  status: ProviderResultStatus;
  latencyMs: number;
  sourceCount: number;
}

export function recordAttempt(input: RecordAttemptInput): void {
  const existing = store.get(input.providerId) ?? emptySnapshot(input.providerId);
  const totalRequests = existing.totalRequests + 1;
  const priorTotalLatency = (existing.averageLatencyMs ?? 0) * existing.totalRequests;

  store.set(input.providerId, {
    providerId: input.providerId,
    totalRequests,
    successCount: existing.successCount + (input.status === "ok" ? 1 : 0),
    failureCount: existing.failureCount + (input.status === "error" ? 1 : 0),
    timeoutCount: existing.timeoutCount + (input.status === "timeout" ? 1 : 0),
    totalSourceCount: existing.totalSourceCount + input.sourceCount,
    lastLatencyMs: input.latencyMs,
    averageLatencyMs: Math.round((priorTotalLatency + input.latencyMs) / totalRequests),
    lastSuccessfulRequestAt:
      input.status === "ok" ? new Date().toISOString() : existing.lastSuccessfulRequestAt,
  });
}

export function getMetricsSnapshot(providerId: ProviderId): ProviderMetricsSnapshot {
  return store.get(providerId) ?? emptySnapshot(providerId);
}

export function getAllMetricsSnapshots(): ProviderMetricsSnapshot[] {
  return Array.from(store.values());
}

// Exposed for tests/tooling — not called anywhere in the live flow.
export function resetMetrics(providerId?: ProviderId): void {
  if (providerId) {
    store.delete(providerId);
  } else {
    store.clear();
  }
}
