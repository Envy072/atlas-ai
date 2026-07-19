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
// behavior, including findByIndustry — the secondary index specific to
// this platform's store, case/whitespace-insensitive via
// normalizeIndustryName (already tested, M61).
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

  it("finds a profile by exact industry, case/whitespace-insensitively", async () => {
    await store.upsert(buildProfile({ id: "market_1", industry: "SaaS" }));
    await expect(store.findByIndustry("  saas  ")).resolves.toMatchObject({ id: "market_1" });
  });

  it("returns null from findByIndustry when no industry matches", async () => {
    await store.upsert(buildProfile({ id: "market_1", industry: "saas" }));
    await expect(store.findByIndustry("fintech")).resolves.toBeNull();
  });

  it("lists every stored profile", async () => {
    await store.upsert(buildProfile({ id: "market_1" }));
    await store.upsert(buildProfile({ id: "market_2" }));

    const all = await store.list();
    expect(all.map((profile) => profile.id).sort()).toEqual(["market_1", "market_2"]);
  });

  it("returns an empty list when nothing has been stored", async () => {
    await expect(store.list()).resolves.toEqual([]);
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
