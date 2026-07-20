import { describe, it, expect } from "vitest";
import { SupabaseMarketStore } from "@/lib/market/storage/supabaseStore";
import type { MarketProfile } from "@/lib/market/schemas/market.schema";

function buildProfile(): MarketProfile {
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
  };
}

// Milestone 65 — this class is explicitly "ARCHITECTURE ONLY": every
// method's real, current, implemented behavior is to reject with a
// documented error. Mirrors lib/competitors'/lib/business's/lib/financial's
// own supabaseStore.test.ts pattern.
describe("SupabaseMarketStore", () => {
  it("uses the default table name 'market_profiles' when none is given", async () => {
    const store = new SupabaseMarketStore();
    await expect(store.getById("market_1")).rejects.toThrow(
      'SupabaseMarketStore is architecture only — no "market_profiles" query is implemented yet.'
    );
  });

  it("interpolates a custom table name into getById's error", async () => {
    const store = new SupabaseMarketStore("custom_table");
    await expect(store.getById("market_1")).rejects.toThrow(
      'SupabaseMarketStore is architecture only — no "custom_table" query is implemented yet.'
    );
  });

  it("rejects on findByIndustry", async () => {
    const store = new SupabaseMarketStore();
    await expect(store.findByIndustry("saas")).rejects.toThrow(
      "SupabaseMarketStore.findByIndustry is not implemented yet."
    );
  });

  it("rejects on list", async () => {
    const store = new SupabaseMarketStore();
    await expect(store.list()).rejects.toThrow("SupabaseMarketStore.list is not implemented yet.");
  });

  it("rejects on upsert", async () => {
    const store = new SupabaseMarketStore();
    await expect(store.upsert(buildProfile())).rejects.toThrow(
      "SupabaseMarketStore.upsert is not implemented yet."
    );
  });

  it("rejects on delete", async () => {
    const store = new SupabaseMarketStore();
    await expect(store.delete("market_1")).rejects.toThrow(
      "SupabaseMarketStore.delete is not implemented yet."
    );
  });
});
