import { describe, it, expect, beforeEach } from "vitest";
import { MemoryFinancialStore } from "@/lib/financial/storage/memoryStore";
import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";

function buildProfile(overrides: Partial<FinancialProfile> = {}): FinancialProfile {
  return {
    id: "financial_1",
    grossMargin: {},
    operatingMargin: {},
    burnRate: {},
    runway: {},
    breakEven: {},
    cac: {},
    ltv: {},
    ltvToCac: {},
    mrr: {},
    arr: {},
    paybackPeriod: {},
    revenueStreams: [],
    expenses: [],
    financialRisks: [],
    financialAssumptions: [],
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

// Milestone 59 — verifies this file's actual, current in-process Map-backed
// behavior, including findByFundingStage — the secondary index specific to
// this platform's store (a FinancialProfile has no unique name/industry
// key of its own).
describe("MemoryFinancialStore", () => {
  let store: MemoryFinancialStore;

  beforeEach(() => {
    store = new MemoryFinancialStore();
  });

  it("returns null from getById when no profile has been stored", async () => {
    await expect(store.getById("financial_1")).resolves.toBeNull();
  });

  it("upserts and retrieves a profile by id", async () => {
    await store.upsert(buildProfile({ id: "financial_1" }));
    await expect(store.getById("financial_1")).resolves.toMatchObject({ id: "financial_1" });
  });

  it("upsert overwrites an existing profile with the same id", async () => {
    await store.upsert(buildProfile({ id: "financial_1", confidence: 40 }));
    await store.upsert(buildProfile({ id: "financial_1", confidence: 90 }));

    const result = await store.getById("financial_1");
    expect(result?.confidence).toBe(90);
  });

  it("finds every profile at a given funding stage", async () => {
    await store.upsert(buildProfile({ id: "financial_1", fundingStage: "seed" }));
    await store.upsert(buildProfile({ id: "financial_2", fundingStage: "series_a" }));
    await store.upsert(buildProfile({ id: "financial_3", fundingStage: "seed" }));

    const result = await store.findByFundingStage("seed");
    expect(result.map((profile) => profile.id).sort()).toEqual(["financial_1", "financial_3"]);
  });

  it("returns an empty array from findByFundingStage when no profile matches", async () => {
    await store.upsert(buildProfile({ id: "financial_1", fundingStage: "seed" }));
    await expect(store.findByFundingStage("series_b")).resolves.toEqual([]);
  });

  it("lists every stored profile", async () => {
    await store.upsert(buildProfile({ id: "financial_1" }));
    await store.upsert(buildProfile({ id: "financial_2" }));

    const all = await store.list();
    expect(all.map((profile) => profile.id).sort()).toEqual(["financial_1", "financial_2"]);
  });

  it("returns an empty list when nothing has been stored", async () => {
    await expect(store.list()).resolves.toEqual([]);
  });

  it("deletes a profile by id", async () => {
    await store.upsert(buildProfile({ id: "financial_1" }));
    await store.delete("financial_1");

    await expect(store.getById("financial_1")).resolves.toBeNull();
  });

  it("does not throw when deleting an id that was never stored", async () => {
    await expect(store.delete("does_not_exist")).resolves.toBeUndefined();
  });
});
