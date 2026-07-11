// How the engine should time out and retry a single stage — mirrors
// lib/research/manager/types.ts's RetryPolicy shape conceptually (a
// proven pattern from Milestone 5's ProviderManager), reapplied one
// layer up at the stage level. Not a Zod-validated shape — it configures
// behavior, it never crosses a request/response boundary itself.
export interface PipelineRetryPolicy {
  /** Additional attempts after the first, only for a failed stage. */
  maxAutoRetries: number;
  /** Base delay before the first retry; doubles each subsequent retry. */
  baseBackoffMs: number;
}
