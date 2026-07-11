import { computeNextRefresh, determineRefreshPriority } from "@/lib/competitors";
import type { RefreshMetadata, RefreshReason } from "@/lib/competitors";
import type { BusinessProfile } from "@/lib/business/schemas/business.schema";

// Reuses lib/competitors' computeNextRefresh/determineRefreshPriority
// directly — the same interval-days policy every knowledge platform in
// this codebase shares (lib/market and lib/financial did the same),
// rather than a fourth copy that could drift apart from the other three.
export function buildBusinessRefreshMetadata(
  reason: RefreshReason,
  confidence: number,
  now: Date
): RefreshMetadata {
  const priority = determineRefreshPriority(confidence);

  return {
    lastUpdated: now.toISOString(),
    nextRefresh: computeNextRefresh(now, priority),
    refreshReason: reason,
    refreshPriority: priority,
  };
}

// A manual refresh always jumps the queue — mirrors the other three
// platforms' own local copies of this same non-generic helper.
export function buildManualBusinessRefreshMetadata(now: Date): RefreshMetadata {
  return {
    lastUpdated: now.toISOString(),
    nextRefresh: now.toISOString(),
    refreshReason: "manual",
    refreshPriority: "urgent",
  };
}

// isStale can't be reused from lib/competitors (its exported version is
// typed specifically to CompanyProfile) — a thin, unavoidable local copy
// for BusinessProfile, exactly like the other platforms' own isXStale.
export function isBusinessStale(profile: BusinessProfile, now: Date): boolean {
  return Date.parse(profile.refresh.nextRefresh) <= now.getTime();
}
