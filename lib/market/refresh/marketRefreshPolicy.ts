import { computeNextRefresh, determineRefreshPriority } from "@/lib/competitors";
import type { RefreshMetadata, RefreshReason } from "@/lib/competitors";
import type { MarketProfile } from "@/lib/market/schemas/market.schema";

// Reuses lib/competitors' computeNextRefresh/determineRefreshPriority
// directly (both generic — neither takes a CompanyProfile, only a
// confidence number or a RefreshPriority) rather than re-deriving the same
// interval-days policy a second time. This is exactly what "consume only
// public exports" makes possible: one refresh policy, shared by both
// knowledge platforms, instead of two copies that could drift apart.
export function buildMarketRefreshMetadata(
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

// A manual refresh always jumps the queue — mirrors lib/competitors'
// buildManualRefreshMetadata, which isn't itself exported from its public
// barrel, so this platform owns its own (tiny) copy of just this one
// non-generic helper.
export function buildManualMarketRefreshMetadata(now: Date): RefreshMetadata {
  return {
    lastUpdated: now.toISOString(),
    nextRefresh: now.toISOString(),
    refreshReason: "manual",
    refreshPriority: "urgent",
  };
}

// isStale itself can't be reused from lib/competitors (its exported
// version is typed specifically to CompanyProfile), so this is a thin,
// unavoidable, structurally-identical local copy for MarketProfile.
export function isMarketStale(profile: MarketProfile, now: Date): boolean {
  return Date.parse(profile.refresh.nextRefresh) <= now.getTime();
}
