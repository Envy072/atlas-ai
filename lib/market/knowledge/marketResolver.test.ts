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
// the new-vs-merged branch (exact industry match, not fuzzy), and the
// resolved profile being persisted via upsert.
describe("resolveMarketKnowledge", () => {
  it("returns an 'unclassified' profile as-is, without persisting it", async () => {
    const store = new MemoryMarketStore();
    const freshProfile = buildProfile({ id: "market_1", industry: "unclassified" });

    const result = await resolveMarketKnowledge(freshProfile, store);

    expect(result).toEqual(freshProfile);
    await expect(store.list()).resolves.toEqual([]);
  });

  it("persists a brand-new profile when no existing profile matches the industry", async () => {
    const store = new MemoryMarketStore();
    const freshProfile = buildProfile({ id: "market_1", industry: "saas" });

    const result = await resolveMarketKnowledge(freshProfile, store);

    expect(result).toEqual(freshProfile);
    await expect(store.getById("market_1")).resolves.toEqual(freshProfile);
  });

  it("merges into an existing profile when the industry already exists in the store", async () => {
    const store = new MemoryMarketStore();
    await store.upsert(
      buildProfile({
        id: "market_existing",
        industry: "saas",
        confidence: 40,
        customerSegments: [{ name: "SMB owners", painPoints: [] }],
      })
    );

    const freshProfile = buildProfile({
      id: "market_fresh",
      industry: "saas",
      confidence: 90,
      customerSegments: [{ name: "Enterprise buyers", painPoints: [] }],
    });

    const result = await resolveMarketKnowledge(freshProfile, store);

    expect(result.id).toBe("market_existing");
    expect(result.confidence).toBe(90);
    expect(result.customerSegments.map((s) => s.name)).toEqual(["SMB owners", "Enterprise buyers"]);
  });

  it("persists the merged result back into the store", async () => {
    const store = new MemoryMarketStore();
    await store.upsert(buildProfile({ id: "market_existing", industry: "saas" }));

    const freshProfile = buildProfile({ id: "market_fresh", industry: "saas", confidence: 90 });
    const result = await resolveMarketKnowledge(freshProfile, store);

    await expect(store.getById("market_existing")).resolves.toEqual(result);
  });

  it("matches industries case/whitespace-insensitively via the store's own findByIndustry", async () => {
    const store = new MemoryMarketStore();
    await store.upsert(buildProfile({ id: "market_existing", industry: "SaaS" }));

    const freshProfile = buildProfile({ id: "market_fresh", industry: "  saas  ", confidence: 70 });
    const result = await resolveMarketKnowledge(freshProfile, store);

    expect(result.id).toBe("market_existing");
  });

  it("defaults to the shared defaultMarketStore when no store is given", async () => {
    const freshProfile = buildProfile({ id: "market_default_store_test", industry: "unclassified" });

    const result = await resolveMarketKnowledge(freshProfile);

    expect(result).toEqual(freshProfile);
  });
});
