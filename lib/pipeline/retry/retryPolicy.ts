import type { PipelineRetryPolicy } from "@/lib/pipeline/types/retry";

// Deliberately conservative: each stage call is already backed by
// Milestone 5's own ProviderManager retry/timeout layer several levels
// down. A stage-level retry here is for the case where an entire
// platform call fails outright (its own internal validation throws, a
// downstream schema mismatch, etc.) — not for retrying an individual
// HTTP request, which is already handled two layers below and must not
// be duplicated here (MILESTONE_11_DESIGN.md Section 8).
export const DEFAULT_PIPELINE_RETRY_POLICY: PipelineRetryPolicy = {
  maxAutoRetries: 2,
  baseBackoffMs: 300,
};

// Exponential backoff — the same shape lib/research/manager/providerManager.ts
// uses one layer down, reapplied at the stage level (a reused pattern,
// not reused code, since PipelineRetryPolicy is this platform's own type).
export function computeBackoffMs(policy: PipelineRetryPolicy, attempt: number): number {
  return policy.baseBackoffMs * 2 ** (attempt - 1);
}
