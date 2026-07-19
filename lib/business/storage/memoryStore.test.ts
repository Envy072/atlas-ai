import { describe, it, expect, beforeEach } from "vitest";
import { MemoryBusinessStore } from "@/lib/business/storage/memoryStore";
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

// Milestone 56 — verifies this file's actual, current in-process Map-backed
// behavior, including findByHealthRating — the secondary index specific to
// this platform's store (a BusinessProfile has no unique name/industry key
// of its own, unlike CompanyProfile's findByName).
describe("MemoryBusinessStore", () => {
  let store: MemoryBusinessStore;

  beforeEach(() => {
    store = new MemoryBusinessStore();
  });

  it("returns null from getById when no profile has been stored", async () => {
    await expect(store.getById("business_1")).resolves.toBeNull();
  });

  it("upserts and retrieves a profile by id", async () => {
    await store.upsert(buildProfile({ id: "business_1" }));
    await expect(store.getById("business_1")).resolves.toMatchObject({ id: "business_1" });
  });

  it("upsert overwrites an existing profile with the same id", async () => {
    await store.upsert(buildProfile({ id: "business_1", confidence: 40 }));
    await store.upsert(buildProfile({ id: "business_1", confidence: 90 }));

    const result = await store.getById("business_1");
    expect(result?.confidence).toBe(90);
  });

  it("finds every profile at a given health rating", async () => {
    await store.upsert(buildProfile({ id: "business_1", overallHealth: { rating: "strong" } }));
    await store.upsert(buildProfile({ id: "business_2", overallHealth: { rating: "fragile" } }));
    await store.upsert(buildProfile({ id: "business_3", overallHealth: { rating: "strong" } }));

    const result = await store.findByHealthRating("strong");
    expect(result.map((profile) => profile.id).sort()).toEqual(["business_1", "business_3"]);
  });

  it("returns an empty array from findByHealthRating when no profile matches", async () => {
    await store.upsert(buildProfile({ id: "business_1", overallHealth: { rating: "strong" } }));
    await expect(store.findByHealthRating("critical")).resolves.toEqual([]);
  });

  it("lists every stored profile", async () => {
    await store.upsert(buildProfile({ id: "business_1" }));
    await store.upsert(buildProfile({ id: "business_2" }));

    const all = await store.list();
    expect(all.map((profile) => profile.id).sort()).toEqual(["business_1", "business_2"]);
  });

  it("returns an empty list when nothing has been stored", async () => {
    await expect(store.list()).resolves.toEqual([]);
  });

  it("deletes a profile by id", async () => {
    await store.upsert(buildProfile({ id: "business_1" }));
    await store.delete("business_1");

    await expect(store.getById("business_1")).resolves.toBeNull();
  });

  it("does not throw when deleting an id that was never stored", async () => {
    await expect(store.delete("does_not_exist")).resolves.toBeUndefined();
  });
});
