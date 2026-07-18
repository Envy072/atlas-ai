import { getUserTier } from "@/lib/services/stripe";
import type { RateLimitCallerTier } from "@/lib/services/rateLimit";

// The one place a caller's IP is read from a request (Milestone 47) —
// reused by every route that needs an identity for an anonymous rate
// limit bucket, instead of each route re-reading headers itself.
// Vercel (this app's deployment target) sets x-forwarded-for on every
// incoming request; the first entry is the original client. Falls back
// to a fixed sentinel outside that environment (e.g. local dev without
// a proxy in front) rather than throwing — a missing IP should degrade
// to "one shared anonymous bucket," never break the request.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const firstIp = forwardedFor?.split(",")[0]?.trim();
  return firstIp || "unknown";
}

export interface CallerContext {
  tier: RateLimitCallerTier;
  identity: string;
}

// The one place "who is calling, and what rate-limit tier/identity do
// they get" is resolved (Milestone 47) — every rate-limited route calls
// this instead of re-deriving the same tier/identity logic itself. Kept
// under lib/api/ (not lib/services/rateLimit/) specifically because it
// touches a raw Request — lib/services/ stays framework-agnostic
// (Section 8), so checkRateLimit() itself only ever receives the
// already-resolved plain strings this function produces.
export async function resolveCallerContext(req: Request, user: { id: string } | null): Promise<CallerContext> {
  const tier: RateLimitCallerTier = user ? await getUserTier(user.id) : "anonymous";
  const identity = user ? `user:${user.id}` : `ip:${getClientIp(req)}`;
  return { tier, identity };
}
