import { describe, it, expect, beforeEach } from "vitest";
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

// Milestone 64 — verifies this file's actual, current in-process Map-backed
// behavior. Milestone 116 replaced the old, global findByIndustry secondary
// index with getByAnalysisId()/an analysisId-scoped list() — every profile
// now belongs to exactly one analysis (Milestone 114's Critical Finding
// #1), so lookups are by that id, never by industry alone.
describe("MemoryMarketStore", () => {
  let store: MemoryMarketStore;

  beforeEach(() => {
    store = new MemoryMarketStore();
  });

  it("returns null from getById when no profile has been stored", async () => {
    await expect(store.getById("market_1")).resolves.toBeNull();
  });

  it("upserts and retrieves a profile by id", async () => {
    await store.upsert(buildProfile({ id: "market_1" }));
    await expect(store.getById("market_1")).resolves.toMatchObject({ id: "market_1" });
  });

  it("upsert overwrites an existing profile with the same id", async () => {
    await store.upsert(buildProfile({ id: "market_1", confidence: 40 }));
    await store.upsert(buildProfile({ id: "market_1", confidence: 90 }));

    const result = await store.getById("market_1");
    expect(result?.confidence).toBe(90);
  });

  it("finds a profile by its own analysisId", async () => {
    await store.upsert(buildProfile({ id: "market_1", analysisId: "analysis-a" }));
    await expect(store.getByAnalysisId("analysis-a")).resolves.toMatchObject({ id: "market_1" });
  });

  it("returns null from getByAnalysisId when no profile matches that analysisId", async () => {
    await store.upsert(buildProfile({ id: "market_1", analysisId: "analysis-a" }));
    await expect(store.getByAnalysisId("analysis-b")).resolves.toBeNull();
  });

  it("never returns a profile belonging to a different analysisId, even when the industry matches", async () => {
    await store.upsert(buildProfile({ id: "market_1", industry: "saas", analysisId: "analysis-a" }));
    await store.upsert(buildProfile({ id: "market_2", industry: "saas", analysisId: "analysis-b" }));

    await expect(store.getByAnalysisId("analysis-a")).resolves.toMatchObject({ id: "market_1" });
    await expect(store.getByAnalysisId("analysis-b")).resolves.toMatchObject({ id: "market_2" });
  });

  it("lists only profiles belonging to the given analysisId", async () => {
    await store.upsert(buildProfile({ id: "market_1", analysisId: "analysis-a" }));
    await store.upsert(buildProfile({ id: "market_2", analysisId: "analysis-b" }));

    const scopedToA = await store.list("analysis-a");
    expect(scopedToA.map((profile) => profile.id)).toEqual(["market_1"]);
  });

  it("returns an empty list when nothing matches the given analysisId", async () => {
    await store.upsert(buildProfile({ id: "market_1", analysisId: "analysis-a" }));
    await expect(store.list("analysis-b")).resolves.toEqual([]);
  });

  it("deletes a profile by id", async () => {
    await store.upsert(buildProfile({ id: "market_1" }));
    await store.delete("market_1");

    await expect(store.getById("market_1")).resolves.toBeNull();
  });

  it("does not throw when deleting an id that was never stored", async () => {
    await expect(store.delete("does_not_exist")).resolves.toBeUndefined();
  });
});
