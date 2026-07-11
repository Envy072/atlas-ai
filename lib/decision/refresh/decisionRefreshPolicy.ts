import { computeNextRefresh, determineRefreshPriority } from "@/lib/competitors";
import type { RefreshMetadata, RefreshReason } from "@/lib/competitors";
import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";

// Reuses lib/competitors' computeNextRefresh/determineRefreshPriority
// directly — the same interval-days policy every knowledge platform in
// this codebase shares (lib/market, lib/financial, and lib/business all
// did the same), rather than a fifth copy that could drift apart.
export function buildDecisionRefreshMetadata(
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

// A manual refresh always jumps the queue — mirrors the other four
// platforms' own local copies of this same non-generic helper.
export function buildManualDecisionRefreshMetadata(now: Date): RefreshMetadata {
  return {
    lastUpdated: now.toISOString(),
    nextRefresh: now.toISOString(),
    refreshReason: "manual",
    refreshPriority: "urgent",
  };
}

// isStale can't be reused from lib/competitors (its exported version is
// typed specifically to CompanyProfile) — a thin, unavoidable local copy
// for DecisionProfile, exactly like the other platforms' own isXStale.
export function isDecisionStale(profile: DecisionProfile, now: Date): boolean {
  return Date.parse(profile.refresh.nextRefresh) <= now.getTime();
}
