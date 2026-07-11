import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import {
  buildDecisionRefreshMetadata,
  buildManualDecisionRefreshMetadata,
  isDecisionStale,
} from "@/lib/decision/refresh/decisionRefreshPolicy";

const PRIORITY_ORDER: Record<DecisionProfile["refresh"]["refreshPriority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// Pure functions only — mirrors the other four platforms' own refresh
// engines exactly.

export function requestManualRefresh(profile: DecisionProfile, now: Date): DecisionProfile {
  return { ...profile, refresh: buildManualDecisionRefreshMetadata(now) };
}

export function requestScheduledRefresh(profile: DecisionProfile, now: Date): DecisionProfile {
  return {
    ...profile,
    refresh: buildDecisionRefreshMetadata("scheduled", profile.confidenceSummary.evidenceConfidence, now),
  };
}

export function requestStaleRefresh(profile: DecisionProfile, now: Date): DecisionProfile {
  return {
    ...profile,
    refresh: buildDecisionRefreshMetadata("stale", profile.confidenceSummary.evidenceConfidence, now),
  };
}

export function collectStaleDecisions(profiles: DecisionProfile[], now: Date): DecisionProfile[] {
  return profiles
    .filter((profile) => isDecisionStale(profile, now))
    .sort(
      (a, b) => PRIORITY_ORDER[a.refresh.refreshPriority] - PRIORITY_ORDER[b.refresh.refreshPriority]
    );
}
