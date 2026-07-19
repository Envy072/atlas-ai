import { describe, it, expect } from "vitest";
import { mergeMarketProfile } from "@/lib/market/knowledge/profileMerger";
import type { MarketProfile } from "@/lib/market/schemas/market.schema";
import type { Source } from "@/lib/research";

function buildExistingProfile(overrides: Partial<MarketProfile> = {}): MarketProfile {
  return {
    id: "market_1",
    industry: "saas",
    sizing: { tam: {}, sam: {}, som: {} },
    customerSegments: [{ name: "SMB owners", painPoints: [] }],
    geographicMarkets: [],
    regulations: [],
    risks: [],
    trends: [],
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
    title: "Industry report",
    url: "https://example.com/report",
    domain: "example.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

// Milestone 61 — verifies this file's actual, current merge behavior:
// name-based dedup for structured list fields (via normalizeIndustryName),
// URL-based source/evidence dedup, and the deliberate exclusion of
// sizing/growthRate/marketMaturity from the merge contract (per
// MergeMarketProfileInput's own shape — those fields simply aren't
// accepted as merge input at all).
describe("mergeMarketProfile", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");

  it("dedupes customerSegments by normalized name", () => {
    const existing = buildExistingProfile({ customerSegments: [{ name: "SMB owners", painPoints: [] }] });
    const merged = mergeMarketProfile(
      existing,
      { customerSegments: [{ name: "  smb owners  ", painPoints: [] }], confidence: 50 },
      now
    );

    expect(merged.customerSegments).toHaveLength(1);
  });

  it("preserves both items when customerSegments genuinely differ", () => {
    const existing = buildExistingProfile({ customerSegments: [{ name: "SMB owners", painPoints: [] }] });
    const merged = mergeMarketProfile(
      existing,
      { customerSegments: [{ name: "Enterprise buyers", painPoints: [] }], confidence: 50 },
      now
    );

    expect(merged.customerSegments.map((s) => s.name)).toEqual(["SMB owners", "Enterprise buyers"]);
  });

  it("dedupes geographicMarkets by normalized region:country key", () => {
    const existing = buildExistingProfile({ geographicMarkets: [{ region: "North America", country: "US" }] });
    const merged = mergeMarketProfile(
      existing,
      { geographicMarkets: [{ region: "north america", country: "US" }], confidence: 50 },
      now
    );

    expect(merged.geographicMarkets).toHaveLength(1);
  });

  it("does not conflate geographic markets with the same region but a different country", () => {
    const existing = buildExistingProfile({ geographicMarkets: [{ region: "North America", country: "US" }] });
    const merged = mergeMarketProfile(
      existing,
      { geographicMarkets: [{ region: "North America", country: "Canada" }], confidence: 50 },
      now
    );

    expect(merged.geographicMarkets).toHaveLength(2);
  });

  it("dedupes regulations, risks, and trends by normalized name", () => {
    const existing = buildExistingProfile({
      regulations: [{ name: "Data Privacy Law" }],
      risks: [{ name: "Market Saturation" }],
      trends: [{ name: "AI Adoption", direction: "rising" }],
    });

    const merged = mergeMarketProfile(
      existing,
      {
        regulations: [{ name: "data privacy law" }],
        risks: [{ name: "market saturation" }],
        trends: [{ name: "ai adoption", direction: "rising" }],
        confidence: 50,
      },
      now
    );

    expect(merged.regulations).toHaveLength(1);
    expect(merged.risks).toHaveLength(1);
    expect(merged.trends).toHaveLength(1);
  });

  it("overrides subIndustry when incoming provides it, falls back to existing otherwise", () => {
    const existing = buildExistingProfile({ subIndustry: "payments" });

    const overridden = mergeMarketProfile(existing, { subIndustry: "lending", confidence: 50 }, now);
    expect(overridden.subIndustry).toBe("lending");

    const fallback = mergeMarketProfile(existing, { confidence: 50 }, now);
    expect(fallback.subIndustry).toBe("payments");
  });

  it("dedupes sources by URL (case/trailing-slash insensitive)", () => {
    const existing = buildExistingProfile({ sources: [buildSource({ url: "https://example.com/report" })] });
    const merged = mergeMarketProfile(
      existing,
      { sources: [buildSource({ id: "source_2", url: "https://EXAMPLE.com/report/" })], confidence: 50 },
      now
    );

    expect(merged.sources).toHaveLength(1);
  });

  it("never overwrites sizing via a merge", () => {
    const existing = buildExistingProfile({ sizing: { tam: { valueUsd: 1_000_000 }, sam: {}, som: {} } });
    const merged = mergeMarketProfile(existing, { confidence: 50 }, now);

    expect(merged.sizing).toEqual({ tam: { valueUsd: 1_000_000 }, sam: {}, som: {} });
  });

  it("always takes the incoming confidence value", () => {
    const existing = buildExistingProfile({ confidence: 40 });
    const merged = mergeMarketProfile(existing, { confidence: 90 }, now);

    expect(merged.confidence).toBe(90);
  });

  it("recomputes refresh metadata with reason 'scheduled' from the incoming confidence", () => {
    const existing = buildExistingProfile();
    const merged = mergeMarketProfile(existing, { confidence: 10 }, now);

    expect(merged.refresh.refreshReason).toBe("scheduled");
    expect(merged.refresh.lastUpdated).toBe(now.toISOString());
  });
});
