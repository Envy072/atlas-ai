import { RATE_LIMITS, type RateLimitCallerTier } from "@/lib/services/rateLimit/config";
import { defaultRateLimitStore } from "@/lib/services/rateLimit/storage/defaultStore";
import type { RateLimitStore, RateLimitResult } from "@/lib/services/rateLimit/types";

// The one function every route calls (Milestone 47) — a thin, 1-2 line
// addition per route handler rather than a second, edge-runtime-bound
// authorization mechanism living in middleware.ts (which can't call
// getUserTier() there — that needs next/headers, unavailable in that
// runtime, the same constraint middleware.ts's own comments already
// document for auth). `identity` and `tier` are already-resolved plain
// strings, not a Request object — this function has zero framework
// coupling, matching every other lib/services/ file's own "framework-
// agnostic" rule.
export async function checkRateLimit(
  limitKey: string,
  identity: string,
  tier: RateLimitCallerTier,
  store: RateLimitStore = defaultRateLimitStore
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[limitKey]?.[tier];
  if (!rule) {
    // A route calling this with a (limitKey, tier) pair that has no
    // configured rule is a programming error, not a runtime condition a
    // real caller can trigger — every route already knows its own tier
    // possibilities (e.g. billing:portal is only ever checked after its
    // own route has already confirmed a signed-in user, so tier is
    // never "anonymous" there in practice).
    throw new Error(`No rate limit rule configured for "${limitKey}" at tier "${tier}".`);
  }

  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const bucketKey = `${limitKey}:${identity}`;

  const count = await store.increment(bucketKey, windowStart);

  return {
    allowed: count <= rule.maxRequests,
    limit: rule.maxRequests,
    remaining: Math.max(0, rule.maxRequests - count),
  };
}
