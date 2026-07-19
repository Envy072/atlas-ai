import { describe, it, expect } from "vitest";
import {
  buildBusinessRefreshMetadata,
  buildManualBusinessRefreshMetadata,
  isBusinessStale,
} from "@/lib/business/refresh/businessRefreshPolicy";
import { computeNextRefresh, determineRefreshPriority } from "@/lib/competitors";
import type { BusinessProfile } from "@/lib/business/schemas/business.schema";

// Milestone 55 — verifies this file's actual, current behavior, including
// its deliberate cross-platform delegation to lib/competitors' own
// computeNextRefresh/determineRefreshPriority rather than a fourth
// independent copy of that policy.
describe("buildBusinessRefreshMetadata", () => {
  it("composes lastUpdated/nextRefresh/reason/priority from the given confidence", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildBusinessRefreshMetadata("scheduled", 10, now);

    expect(metadata.lastUpdated).toBe(now.toISOString());
    expect(metadata.refreshReason).toBe("scheduled");
    expect(metadata.refreshPriority).toBe(determineRefreshPriority(10));
    expect(metadata.nextRefresh).toBe(computeNextRefresh(now, determineRefreshPriority(10)));
  });

  it("derives a different priority for a higher confidence, matching lib/competitors' own policy", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildBusinessRefreshMetadata("initial_discovery", 80, now);

    expect(metadata.refreshPriority).toBe(determineRefreshPriority(80));
    expect(metadata.refreshReason).toBe("initial_discovery");
  });
});

describe("buildManualBusinessRefreshMetadata", () => {
  it("always returns urgent priority, reason 'manual', and nextRefresh equal to now", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const metadata = buildManualBusinessRefreshMetadata(now);

    expect(metadata.refreshPriority).toBe("urgent");
    expect(metadata.refreshReason).toBe("manual");
    expect(metadata.lastUpdated).toBe(now.toISOString());
    expect(metadata.nextRefresh).toBe(now.toISOString());
  });
});

function buildProfileWithNextRefresh(nextRefresh: string): BusinessProfile {
  return {
    id: "business_1",
    customerSegments: [],
    distributionChannels: [],
    growthDrivers: [],
    expansionOpportunities: [],
    competitiveAdvantages: [],
    economicMoat: {},
    keyDependencies: [],
    operationalRisks: [],
    businessStrengths: [],
    businessWeaknesses: [],
    businessOpportunities: [],
    businessThreats: [],
    overallHealth: {},
    sources: [],
    evidence: [],
    confidence: 50,
    refresh: {
      lastUpdated: "2026-01-01T00:00:00.000Z",
      nextRefresh,
      refreshReason: "scheduled",
      refreshPriority: "normal",
    },
  };
}

describe("isBusinessStale", () => {
  it("is stale when nextRefresh is in the past", () => {
    const profile = buildProfileWithNextRefresh("2026-01-01T00:00:00.000Z");
    expect(isBusinessStale(profile, new Date("2026-01-02T00:00:00.000Z"))).toBe(true);
  });

  it("is stale exactly at the nextRefresh boundary (<=)", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const profile = buildProfileWithNextRefresh(now.toISOString());
    expect(isBusinessStale(profile, now)).toBe(true);
  });

  it("is not stale when nextRefresh is in the future", () => {
    const profile = buildProfileWithNextRefresh("2026-01-02T00:00:00.000Z");
    expect(isBusinessStale(profile, new Date("2026-01-01T00:00:00.000Z"))).toBe(false);
  });
});
