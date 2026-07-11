import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import { buildManualRefreshMetadata, buildRefreshMetadata, isStale } from "@/lib/competitors/refresh/refreshPolicy";

const PRIORITY_ORDER: Record<CompanyProfile["refresh"]["refreshPriority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// Pure functions only — this engine decides *when* a profile should be
// re-researched and *what its refresh metadata becomes*, but never writes
// to a store itself (the caller — eventually a route or a scheduled job —
// owns persistence via a CompetitorKnowledgeStore).

// A human explicitly requested fresh data for this company right now.
export function requestManualRefresh(profile: CompanyProfile, now: Date): CompanyProfile {
  return { ...profile, refresh: buildManualRefreshMetadata(now) };
}

// A recurring, time-based refresh (a cron/scheduled job would call this
// once a profile's nextRefresh has passed) — recomputes priority from the
// profile's current confidence rather than assuming "scheduled" always
// means the same urgency as last time.
export function requestScheduledRefresh(profile: CompanyProfile, now: Date): CompanyProfile {
  return { ...profile, refresh: buildRefreshMetadata("scheduled", profile.confidence, now) };
}

// A profile discovered stale by collectStaleCompanies below, about to be
// re-researched because it's simply overdue rather than because anyone
// asked or a schedule fired.
export function requestStaleRefresh(profile: CompanyProfile, now: Date): CompanyProfile {
  return { ...profile, refresh: buildRefreshMetadata("stale", profile.confidence, now) };
}

// Every profile whose nextRefresh has passed, ordered most-urgent first —
// the queue a future scheduled job would drain.
export function collectStaleCompanies(profiles: CompanyProfile[], now: Date): CompanyProfile[] {
  return profiles
    .filter((profile) => isStale(profile, now))
    .sort(
      (a, b) => PRIORITY_ORDER[a.refresh.refreshPriority] - PRIORITY_ORDER[b.refresh.refreshPriority]
    );
}
