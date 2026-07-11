import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { RefreshMetadata } from "@/lib/competitors/schemas/refresh.schema";
import type { RefreshPriority, RefreshReason } from "@/lib/competitors/schemas/enums";

const MS_PER_DAY = 86_400_000;

// How many days until the next refresh, per priority — real, adjustable
// policy (a product decision, like Research Milestone 5's FALLBACK_CHAINS
// or FACTOR_WEIGHTS), independent of whether the confidence signal feeding
// determineRefreshPriority is itself a placeholder.
const REFRESH_INTERVAL_DAYS: Record<RefreshPriority, number> = {
  urgent: 1,
  high: 7,
  normal: 30,
  low: 90,
};

export function computeNextRefresh(fromDate: Date, priority: RefreshPriority): string {
  return new Date(fromDate.getTime() + REFRESH_INTERVAL_DAYS[priority] * MS_PER_DAY).toISOString();
}

// Lower confidence (thin, newly-discovered profiles) means the platform
// knows less and should re-check sooner; high confidence, well-evidenced
// profiles can safely wait longer. A real, simple heuristic — not a
// placeholder — since it needs no external data source to be honest,
// exactly like lib/research's normalizeUrl/getTopicOverlapRatio.
export function determineRefreshPriority(confidence: number): RefreshPriority {
  if (confidence < 25) return "urgent";
  if (confidence < 50) return "high";
  if (confidence < 75) return "normal";
  return "low";
}

export function buildRefreshMetadata(
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

// A manual refresh always jumps the queue — "urgent" regardless of
// current confidence — since a human explicitly asked for fresh data now.
export function buildManualRefreshMetadata(now: Date): RefreshMetadata {
  return {
    lastUpdated: now.toISOString(),
    nextRefresh: now.toISOString(),
    refreshReason: "manual",
    refreshPriority: "urgent",
  };
}

export function isStale(profile: CompanyProfile, now: Date): boolean {
  return Date.parse(profile.refresh.nextRefresh) <= now.getTime();
}
