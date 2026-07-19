import { describe, it, expect } from "vitest";
import {
  requestManualRefresh,
  requestScheduledRefresh,
  requestStaleRefresh,
  collectStaleBusinesses,
} from "@/lib/business/refresh/businessRefreshEngine";
import { isBusinessStale } from "@/lib/business/refresh/businessRefreshPolicy";
import type { BusinessProfile } from "@/lib/business/schemas/business.schema";

function buildProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
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
      nextRefresh: "2026-01-31T00:00:00.000Z",
      refreshReason: "initial_discovery",
      refreshPriority: "normal",
    },
    ...overrides,
  };
}

// Milestone 56 — verifies this file's actual, current behavior: each
// "request*" function replaces only a profile's `refresh` field, and
// collectStaleBusinesses filters + sorts by refreshPriority urgency —
// mirrors lib/competitors' own refreshEngine.test.ts exactly.
describe("requestManualRefresh", () => {
  it("always sets priority urgent, reason manual, and nextRefresh equal to now", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 90 });
    const result = requestManualRefresh(profile, now);

    expect(result.refresh.refreshReason).toBe("manual");
    expect(result.refresh.refreshPriority).toBe("urgent");
    expect(result.refresh.nextRefresh).toBe(now.toISOString());
  });

  it("leaves every other field on the profile unchanged", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 90 });
    const result = requestManualRefresh(profile, now);

    expect(result.confidence).toBe(90);
  });
});

describe("requestScheduledRefresh", () => {
  it("recomputes priority from the profile's own current confidence", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 10 });
    const result = requestScheduledRefresh(profile, now);

    expect(result.refresh.refreshReason).toBe("scheduled");
    expect(result.refresh.refreshPriority).toBe("urgent");
  });

  it("derives a different priority for a higher confidence", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 80 });
    const result = requestScheduledRefresh(profile, now);

    expect(result.refresh.refreshPriority).toBe("low");
  });
});

describe("requestStaleRefresh", () => {
  it("sets reason 'stale', with priority derived from confidence", () => {
    const now = new Date("2026-02-01T00:00:00.000Z");
    const profile = buildProfile({ confidence: 30 });
    const result = requestStaleRefresh(profile, now);

    expect(result.refresh.refreshReason).toBe("stale");
    expect(result.refresh.refreshPriority).toBe("high");
  });
});

describe("collectStaleBusinesses", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");

  it("excludes profiles whose nextRefresh is still in the future", () => {
    const fresh = buildProfile({
      id: "fresh",
      refresh: { ...buildProfile().refresh, nextRefresh: "2026-03-01T00:00:00.000Z" },
    });
    expect(isBusinessStale(fresh, now)).toBe(false);

    expect(collectStaleBusinesses([fresh], now)).toEqual([]);
  });

  it("includes only stale profiles, ordered most-urgent first", () => {
    const stalePastDue = (id: string, priority: BusinessProfile["refresh"]["refreshPriority"]): BusinessProfile =>
      buildProfile({
        id,
        refresh: {
          lastUpdated: "2026-01-01T00:00:00.000Z",
          nextRefresh: "2026-01-01T00:00:00.000Z",
          refreshReason: "scheduled",
          refreshPriority: priority,
        },
      });

    const normal = stalePastDue("normal_business", "normal");
    const urgent = stalePastDue("urgent_business", "urgent");
    const low = stalePastDue("low_business", "low");
    const high = stalePastDue("high_business", "high");

    const result = collectStaleBusinesses([normal, urgent, low, high], now);

    expect(result.map((profile) => profile.id)).toEqual([
      "urgent_business",
      "high_business",
      "normal_business",
      "low_business",
    ]);
  });
});
