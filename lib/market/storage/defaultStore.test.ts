import { describe, it, expect } from "vitest";
import { defaultMarketStore } from "@/lib/market/storage/defaultStore";
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

// Milestone 67 — this module is one line (createStore() called once at
// import time), but that one line encodes a real architectural invariant
// this file's own comment names explicitly: every consumer that omits its
// own store must share the exact same instance, or "knowledge accumulates
// across runs" silently breaks. These tests verify that invariant directly
// (default backend + genuine shared state), matching lib/competitors' and
// lib/business's own defaultStore.test.ts pattern.
describe("defaultMarketStore", () => {
  it("defaults to a MemoryMarketStore", () => {
    expect(defaultMarketStore).toBeInstanceOf(MemoryMarketStore);
  });

  it("is a single shared instance — data written via one import is visible via another", async () => {
    await defaultMarketStore.upsert(buildProfile({ id: "market_shared" }));

    const { defaultMarketStore: reimported } = await import("@/lib/market/storage/defaultStore");

    await expect(reimported.getById("market_shared")).resolves.toMatchObject({ id: "market_shared" });
  });
});
