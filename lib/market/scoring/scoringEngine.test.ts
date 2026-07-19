import { describe, it, expect } from "vitest";
import { scoreMarket } from "@/lib/market/scoring/scoringEngine";
import type { MarketProfile } from "@/lib/market/schemas/market.schema";

function buildProfile(overrides: Partial<MarketProfile> = {}): MarketProfile {
  return {
    id: "market_1",
    industry: "saas",
    sizing: { tam: {}, sam: {}, som: {} },
    customerSegments: [],
    geographicMarkets: [],
    regulations: [],
    risks: [],
    trends: [],
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

// Milestone 61 — scoringDimensions.ts is (per the established precedent in
// every other platform) "ARCHITECTURE ONLY": every dimension scorer
// currently returns a fixed neutral placeholder. These tests verify
// today's actual composed output, not a hypothetical future scoring model.
describe("scoreMarket", () => {
  it("returns a consistent overallScore composed from six equally-weighted placeholder dimensions", () => {
    const score = scoreMarket(buildProfile());

    expect(score.dimensions).toHaveLength(6);
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);

    const expectedOverall = Math.round(
      score.dimensions.reduce((sum, entry) => sum + entry.score * (1 / 6), 0)
    );
    expect(score.overallScore).toBe(expectedOverall);
  });

  it("produces the same overallScore regardless of the profile's own field values", () => {
    const sparse = scoreMarket(buildProfile());
    const rich = scoreMarket(buildProfile({ confidence: 95, industry: "healthtech" }));

    expect(rich.overallScore).toBe(sparse.overallScore);
  });

  it("sets marketId from the profile's id", () => {
    const score = scoreMarket(buildProfile({ id: "market_42" }));
    expect(score.marketId).toBe("market_42");
  });

  it("uses the provided `now` for scoredAt, defaulting to the current time when omitted", () => {
    const now = new Date("2026-03-01T00:00:00.000Z");
    const scoredWithNow = scoreMarket(buildProfile(), now);
    expect(scoredWithNow.scoredAt).toBe(now.toISOString());

    const before = Date.now();
    const scoredDefault = scoreMarket(buildProfile());
    const after = Date.now();
    const scoredAtMs = Date.parse(scoredDefault.scoredAt);

    expect(scoredAtMs).toBeGreaterThanOrEqual(before);
    expect(scoredAtMs).toBeLessThanOrEqual(after);
  });
});
