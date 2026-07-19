import { describe, it, expect } from "vitest";
import { mergeBusinessProfile } from "@/lib/business/knowledge/profileMerger";
import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import type { Source } from "@/lib/research";

function buildExistingProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    id: "business_1",
    customerSegments: [],
    distributionChannels: ["Direct sales"],
    growthDrivers: [],
    expansionOpportunities: [],
    competitiveAdvantages: [],
    economicMoat: {},
    keyDependencies: [],
    operationalRisks: [],
    businessStrengths: ["Strong brand"],
    businessWeaknesses: [],
    businessOpportunities: [],
    businessThreats: [],
    overallHealth: {},
    sources: [],
    evidence: [],
    confidence: 40,
    refresh: {
      lastUpdated: "2026-01-01T00:00:00.000Z",
      nextRefresh: "2026-01-31T00:00:00.000Z",
      refreshReason: "initial_discovery",
      refreshPriority: "high",
    },
    ...overrides,
  };
}

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "Acme homepage",
    url: "https://acme.com",
    domain: "acme.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

// Milestone 55 — verifies this file's actual, current merge behavior:
// list-field union with dedup, scalar override-vs-fallback, URL-based
// source/evidence dedup, and the explicit invariant its own comment
// names: economicMoat/overallHealth/executionComplexity are never
// touched by a merge, only ever recomputed by a future real-assessment
// module.
describe("mergeBusinessProfile", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");

  it("unions string-list fields, deduplicating exact-string duplicates", () => {
    const existing = buildExistingProfile({ distributionChannels: ["Direct sales"] });
    const merged = mergeBusinessProfile(
      existing,
      { distributionChannels: ["Direct sales", "Partnerships"], confidence: 50 },
      now
    );

    expect(merged.distributionChannels).toEqual(["Direct sales", "Partnerships"]);
  });

  it("preserves both items when list-field values genuinely differ", () => {
    const existing = buildExistingProfile({ businessStrengths: ["Strong brand"] });
    const merged = mergeBusinessProfile(existing, { businessStrengths: ["Great support"], confidence: 50 }, now);

    expect(merged.businessStrengths).toEqual(["Strong brand", "Great support"]);
  });

  it("overrides a scalar field when incoming provides it", () => {
    const existing = buildExistingProfile({ businessModel: "usage_based" });
    const merged = mergeBusinessProfile(existing, { businessModel: "subscription", confidence: 50 }, now);

    expect(merged.businessModel).toBe("subscription");
  });

  it("falls back to the existing scalar value when incoming omits it", () => {
    const existing = buildExistingProfile({ businessModel: "subscription" });
    const merged = mergeBusinessProfile(existing, { confidence: 50 }, now);

    expect(merged.businessModel).toBe("subscription");
  });

  it("dedupes sources by URL (case/trailing-slash insensitive)", () => {
    const existing = buildExistingProfile({ sources: [buildSource({ url: "https://acme.com" })] });
    const merged = mergeBusinessProfile(
      existing,
      { sources: [buildSource({ id: "source_2", url: "https://ACME.com/" })], confidence: 50 },
      now
    );

    expect(merged.sources).toHaveLength(1);
  });

  it("dedupes keyDependencies by normalized name", () => {
    const existing = buildExistingProfile({ keyDependencies: [{ name: "AWS" }] });
    const merged = mergeBusinessProfile(existing, { keyDependencies: [{ name: "  aws  " }], confidence: 50 }, now);

    expect(merged.keyDependencies).toHaveLength(1);
  });

  it("never overwrites economicMoat, overallHealth, or executionComplexity via a merge", () => {
    const existing = buildExistingProfile({
      economicMoat: { type: "network_effects", strengthScore: 70 },
      overallHealth: { rating: "strong" },
      executionComplexity: "low",
    });
    const merged = mergeBusinessProfile(existing, { confidence: 50 }, now);

    expect(merged.economicMoat).toEqual({ type: "network_effects", strengthScore: 70 });
    expect(merged.overallHealth).toEqual({ rating: "strong" });
    expect(merged.executionComplexity).toBe("low");
  });

  it("always takes the incoming confidence value", () => {
    const existing = buildExistingProfile({ confidence: 40 });
    const merged = mergeBusinessProfile(existing, { confidence: 90 }, now);

    expect(merged.confidence).toBe(90);
  });

  it("recomputes refresh metadata with reason 'scheduled' from the incoming confidence", () => {
    const existing = buildExistingProfile();
    const merged = mergeBusinessProfile(existing, { confidence: 10 }, now);

    expect(merged.refresh.refreshReason).toBe("scheduled");
    expect(merged.refresh.lastUpdated).toBe(now.toISOString());
  });
});
