import { describe, it, expect } from "vitest";
import { scoreBusiness } from "@/lib/business/scoring/scoringEngine";
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

// Milestone 55 — scoringDimensions.ts is (per its own precedent in every
// other platform) "ARCHITECTURE ONLY": every dimension scorer currently
// returns a fixed neutral placeholder. These tests verify today's actual
// composed output, not a hypothetical future scoring model.
describe("scoreBusiness", () => {
  it("returns a consistent overallScore composed from six equally-weighted placeholder dimensions", () => {
    const score = scoreBusiness(buildProfile());

    expect(score.dimensions).toHaveLength(6);
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);

    const expectedOverall = Math.round(
      score.dimensions.reduce((sum, entry) => sum + entry.score * (1 / 6), 0)
    );
    expect(score.overallScore).toBe(expectedOverall);
  });

  it("produces the same overallScore regardless of the profile's own field values", () => {
    const sparse = scoreBusiness(buildProfile());
    const rich = scoreBusiness(
      buildProfile({
        businessStrengths: ["Strong brand"],
        confidence: 95,
      })
    );

    expect(rich.overallScore).toBe(sparse.overallScore);
  });

  it("sets businessProfileId from the profile's id", () => {
    const score = scoreBusiness(buildProfile({ id: "business_42" }));
    expect(score.businessProfileId).toBe("business_42");
  });

  it("uses the provided `now` for scoredAt, defaulting to the current time when omitted", () => {
    const now = new Date("2026-03-01T00:00:00.000Z");
    const scoredWithNow = scoreBusiness(buildProfile(), now);
    expect(scoredWithNow.scoredAt).toBe(now.toISOString());

    const before = Date.now();
    const scoredDefault = scoreBusiness(buildProfile());
    const after = Date.now();
    const scoredAtMs = Date.parse(scoredDefault.scoredAt);

    expect(scoredAtMs).toBeGreaterThanOrEqual(before);
    expect(scoredAtMs).toBeLessThanOrEqual(after);
  });
});
