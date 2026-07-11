import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import {
  buildBusinessRefreshMetadata,
  buildManualBusinessRefreshMetadata,
  isBusinessStale,
} from "@/lib/business/refresh/businessRefreshPolicy";

const PRIORITY_ORDER: Record<BusinessProfile["refresh"]["refreshPriority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// Pure functions only — mirrors the other three platforms' own refresh
// engines exactly.

export function requestManualRefresh(profile: BusinessProfile, now: Date): BusinessProfile {
  return { ...profile, refresh: buildManualBusinessRefreshMetadata(now) };
}

export function requestScheduledRefresh(profile: BusinessProfile, now: Date): BusinessProfile {
  return { ...profile, refresh: buildBusinessRefreshMetadata("scheduled", profile.confidence, now) };
}

export function requestStaleRefresh(profile: BusinessProfile, now: Date): BusinessProfile {
  return { ...profile, refresh: buildBusinessRefreshMetadata("stale", profile.confidence, now) };
}

export function collectStaleBusinesses(profiles: BusinessProfile[], now: Date): BusinessProfile[] {
  return profiles
    .filter((profile) => isBusinessStale(profile, now))
    .sort(
      (a, b) => PRIORITY_ORDER[a.refresh.refreshPriority] - PRIORITY_ORDER[b.refresh.refreshPriority]
    );
}
