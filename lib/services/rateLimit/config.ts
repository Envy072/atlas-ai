import type { SubscriptionTier } from "@/lib/schemas/subscription";

// "anonymous" alongside the two real subscription tiers — a caller with
// no session is never a SubscriptionTier, but still needs its own row
// in every limit below (Milestone 47's own requirement: rate limiting
// must work for authenticated and unauthenticated requests alike).
export type RateLimitCallerTier = "anonymous" | SubscriptionTier;

export interface RateLimitRule {
  windowSeconds: number;
  maxRequests: number;
}

// One row per (bucket, tier) pair — a future subscription tier (e.g. a
// "builder" tier, CLAUDE.md's own roadmap) is one new column value
// here, never new logic anywhere else. Bucket names match the real
// route groupings below, each with its own limit shape:
//
// - "analysis:create" (POST /api/analysis-sessions) triggers a real
//   20-60s pipeline run that spends real OpenAI/search-provider money
//   per call — the strictest bucket, and the one this milestone's
//   review named as the actual abuse vector.
// - "analysis:read" (GET /api/analysis-sessions/[id]) is polled by
//   useAnalysisSession's own POLL_INTERVAL_MS = 1750ms while a session
//   is active. Verified directly, not estimated: a single active
//   browser tab generates at most 60_000 / 1750 ≈ 34.3 requests per
//   minute (one setTimeout chain, never overlapping — see
//   hooks/useAnalysisSession.ts). 100/minute is roughly 3x that single-
//   tab rate, comfortably covering a few concurrent tabs/sessions while
//   still bounding a scripted loop.
// - "analysis:mutate" (cancel/retry) — infrequent, user-initiated.
// - "analysis:flag" (POST /api/analysis-flags) — infrequent,
//   authenticated-only, user-initiated.
// - "billing:portal" (GET /api/billing/portal) — infrequent,
//   authenticated-only; has no "anonymous" row since the route itself
//   already rejects a signed-out caller before any limit is checked.
export const RATE_LIMITS: Record<string, Partial<Record<RateLimitCallerTier, RateLimitRule>>> = {
  "analysis:create": {
    anonymous: { windowSeconds: 3600, maxRequests: 3 },
    free: { windowSeconds: 3600, maxRequests: 10 },
    founder: { windowSeconds: 3600, maxRequests: 30 },
  },
  "analysis:read": {
    anonymous: { windowSeconds: 60, maxRequests: 100 },
    free: { windowSeconds: 60, maxRequests: 100 },
    founder: { windowSeconds: 60, maxRequests: 100 },
  },
  "analysis:mutate": {
    anonymous: { windowSeconds: 60, maxRequests: 10 },
    free: { windowSeconds: 60, maxRequests: 20 },
    founder: { windowSeconds: 60, maxRequests: 30 },
  },
  "analysis:flag": {
    free: { windowSeconds: 3600, maxRequests: 10 },
    founder: { windowSeconds: 3600, maxRequests: 10 },
  },
  "billing:portal": {
    free: { windowSeconds: 60, maxRequests: 10 },
    founder: { windowSeconds: 60, maxRequests: 10 },
  },
};
