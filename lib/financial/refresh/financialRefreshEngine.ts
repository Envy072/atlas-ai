import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import {
  buildFinancialRefreshMetadata,
  buildManualFinancialRefreshMetadata,
  isFinancialStale,
} from "@/lib/financial/refresh/financialRefreshPolicy";

const PRIORITY_ORDER: Record<FinancialProfile["refresh"]["refreshPriority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// Pure functions only — mirrors lib/competitors' and lib/market's own
// refresh engines exactly.

export function requestManualRefresh(profile: FinancialProfile, now: Date): FinancialProfile {
  return { ...profile, refresh: buildManualFinancialRefreshMetadata(now) };
}

export function requestScheduledRefresh(profile: FinancialProfile, now: Date): FinancialProfile {
  return { ...profile, refresh: buildFinancialRefreshMetadata("scheduled", profile.confidence, now) };
}

export function requestStaleRefresh(profile: FinancialProfile, now: Date): FinancialProfile {
  return { ...profile, refresh: buildFinancialRefreshMetadata("stale", profile.confidence, now) };
}

export function collectStaleFinancials(profiles: FinancialProfile[], now: Date): FinancialProfile[] {
  return profiles
    .filter((profile) => isFinancialStale(profile, now))
    .sort(
      (a, b) => PRIORITY_ORDER[a.refresh.refreshPriority] - PRIORITY_ORDER[b.refresh.refreshPriority]
    );
}
