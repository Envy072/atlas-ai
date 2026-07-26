import { describe, it, expect } from "vitest";
import { resolveMarketKnowledge } from "@/lib/market/knowledge/marketResolver";
import { MemoryMarketStore } from "@/lib/market/storage/memoryStore";
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

// Milestone 68 — verifies this file's actual, current composition logic:
// a real MemoryMarketStore is used (no mocking needed, since it's already
// a genuine, tested implementation), covering the "unclassified" bypass,
// the new-vs-merged branch, and the resolved profile being persisted via
// upsert.
//
// Milestone 116 — resolution is scoped by `analysisId`, not by industry
// alone (Milestone 114's Critical Finding #1: two unrelated analyses
// classified into the same industry bucket used to merge each other's
// evidence). Every test below passes an explicit analysisId; the
// dedicated "cross-analysis isolation" block proves two different
// analysisIds sharing the same industry never merge.
describe("resolveMarketKnowledge", () => {
  it("returns an 'unclassified' profile as-is, without persisting it", async () => {
    const store = new MemoryMarketStore();
    const freshProfile = buildProfile({ id: "market_1", industry: "unclassified" });

    const result = await resolveMarketKnowledge(freshProfile, "analysis-1", store);

    expect(result).toEqual({ ...freshProfile, analysisId: "analysis-1" });
    await expect(store.list("analysis-1")).resolves.toEqual([]);
  });

  it("persists a brand-new profile, stamped with analysisId, when no profile exists yet for this analysis", async () => {
    const store = new MemoryMarketStore();
    const freshProfile = buildProfile({ id: "market_1", industry: "saas" });

    const result = await resolveMarketKnowledge(freshProfile, "analysis-1", store);

    expect(result).toEqual({ ...freshProfile, analysisId: "analysis-1" });
    await expect(store.getById("market_1")).resolves.toEqual({ ...freshProfile, analysisId: "analysis-1" });
  });

  it("merges into this SAME analysis's own prior profile when one already exists — the retried-stage case", async () => {
    const store = new MemoryMarketStore();
    await store.upsert(
      buildProfile({
        id: "market_existing",
        industry: "saas",
        confidence: 40,
        customerSegments: [{ name: "SMB owners", painPoints: [] }],
        analysisId: "analysis-1",
      })
    );

    const freshProfile = buildProfile({
      id: "market_fresh",
      industry: "saas",
      confidence: 90,
      customerSegments: [{ name: "Enterprise buyers", painPoints: [] }],
    });

    const result = await resolveMarketKnowledge(freshProfile, "analysis-1", store);

    expect(result.id).toBe("market_existing");
    expect(result.analysisId).toBe("analysis-1");
    expect(result.confidence).toBe(90);
    expect(result.customerSegments.map((s) => s.name)).toEqual(["SMB owners", "Enterprise buyers"]);
  });

  it("persists the merged result back into the store", async () => {
    const store = new MemoryMarketStore();
    await store.upsert(buildProfile({ id: "market_existing", industry: "saas", analysisId: "analysis-1" }));

    const freshProfile = buildProfile({ id: "market_fresh", industry: "saas", confidence: 90 });
    const result = await resolveMarketKnowledge(freshProfile, "analysis-1", store);

    await expect(store.getById("market_existing")).resolves.toEqual(result);
  });

  it("defaults to the shared defaultMarketStore when no store is given", async () => {
    const freshProfile = buildProfile({ id: "market_default_store_test", industry: "unclassified" });

    const result = await resolveMarketKnowledge(freshProfile, "analysis-default-store-test");

    expect(result).toEqual({ ...freshProfile, analysisId: "analysis-default-store-test" });
  });

  // Milestone 116 — the actual regression this milestone exists to add.
  describe("cross-analysis isolation", () => {
    it("never merges two different analyses' profiles, even when both share the exact same industry", async () => {
      const store = new MemoryMarketStore();
      await store.upsert(
        buildProfile({
          id: "market_analysis_a",
          industry: "saas",
          confidence: 40,
          sources: [],
          analysisId: "analysis-a",
        })
      );

      const freshProfileForB = buildProfile({
        id: "market_analysis_b_fresh",
        industry: "saas",
        confidence: 90,
      });

      const result = await resolveMarketKnowledge(freshProfileForB, "analysis-b", store);

      // Resolving for analysis-b must never find, merge into, or
      // overwrite analysis-a's own profile — it gets its own, brand-new
      // record, even though the industry ("saas") is identical.
      expect(result.id).toBe("market_analysis_b_fresh");
      expect(result.analysisId).toBe("analysis-b");

      const analysisAProfile = await store.getByAnalysisId("analysis-a");
      expect(analysisAProfile?.id).toBe("market_analysis_a");
      expect(analysisAProfile?.confidence).toBe(40);
    });

    it("scopes getByAnalysisId itself so a shared industry never leaks across analyses", async () => {
      const store = new MemoryMarketStore();
      await store.upsert(buildProfile({ id: "market_1", industry: "saas", analysisId: "analysis-a" }));
      await store.upsert(buildProfile({ id: "market_2", industry: "saas", analysisId: "analysis-b" }));

      await expect(store.getByAnalysisId("analysis-a")).resolves.toMatchObject({ id: "market_1" });
      await expect(store.getByAnalysisId("analysis-b")).resolves.toMatchObject({ id: "market_2" });
    });
  });
});
