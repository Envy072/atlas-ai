import type { ProviderHealth } from "@/lib/research/schemas/health.schema";
import type { ProviderMetricsSnapshot } from "@/lib/research/manager/types";

const MIN_REQUESTS_FOR_JUDGEMENT = 3;
const OFFLINE_FAILURE_RATE = 0.8;
const DEGRADED_FAILURE_RATE = 0.3;

// Computes a provider's current health from its tracked metrics — real,
// working logic (unlike ranking/factors.ts's placeholders), since Step 5
// asks ProviderManager to genuinely "choose accordingly." A provider with
// too little history to judge (fewer than MIN_REQUESTS_FOR_JUDGEMENT
// attempts) is treated as healthy — optimistic by design, since there's
// no evidence against it yet.
export function computeHealth(snapshot: ProviderMetricsSnapshot): ProviderHealth {
  if (snapshot.totalRequests < MIN_REQUESTS_FOR_JUDGEMENT) return "healthy";

  const failureRate = (snapshot.failureCount + snapshot.timeoutCount) / snapshot.totalRequests;

  if (failureRate >= OFFLINE_FAILURE_RATE) return "offline";
  if (failureRate >= DEGRADED_FAILURE_RATE) return "degraded";
  return "healthy";
}
