import { computeNextRefresh, determineRefreshPriority } from "@/lib/competitors";
import type { RefreshMetadata, RefreshReason } from "@/lib/competitors";
import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";

// Reuses lib/competitors' computeNextRefresh/determineRefreshPriority
// directly — the same interval-days policy every knowledge platform in
// this codebase shares (lib/market did the same), rather than a third
// copy that could drift apart from the other two.
export function buildFinancialRefreshMetadata(
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

// A manual refresh always jumps the queue — mirrors lib/competitors' and
// lib/market's own local copies of this same non-generic helper.
export function buildManualFinancialRefreshMetadata(now: Date): RefreshMetadata {
  return {
    lastUpdated: now.toISOString(),
    nextRefresh: now.toISOString(),
    refreshReason: "manual",
    refreshPriority: "urgent",
  };
}

// isStale can't be reused from lib/competitors (its exported version is
// typed specifically to CompanyProfile) — a thin, unavoidable local copy
// for FinancialProfile, exactly like lib/market's isMarketStale.
export function isFinancialStale(profile: FinancialProfile, now: Date): boolean {
  return Date.parse(profile.refresh.nextRefresh) <= now.getTime();
}
