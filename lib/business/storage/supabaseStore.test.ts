import { describe, it, expect } from "vitest";
import { SupabaseBusinessStore } from "@/lib/business/storage/supabaseStore";
import type { BusinessProfile } from "@/lib/business/schemas/business.schema";

function buildProfile(): BusinessProfile {
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
  };
}

// Milestone 56 — this class is explicitly "ARCHITECTURE ONLY": every
// method's real, current, implemented behavior is to reject with a
// documented error. Mirrors lib/competitors' own supabaseStore.test.ts.
describe("SupabaseBusinessStore", () => {
  it("uses the default table name 'business_profiles' when none is given", async () => {
    const store = new SupabaseBusinessStore();
    await expect(store.getById("business_1")).rejects.toThrow(
      'SupabaseBusinessStore is architecture only — no "business_profiles" query is implemented yet.'
    );
  });

  it("interpolates a custom table name into getById's error", async () => {
    const store = new SupabaseBusinessStore("custom_table");
    await expect(store.getById("business_1")).rejects.toThrow(
      'SupabaseBusinessStore is architecture only — no "custom_table" query is implemented yet.'
    );
  });

  it("rejects on findByHealthRating", async () => {
    const store = new SupabaseBusinessStore();
    await expect(store.findByHealthRating("strong")).rejects.toThrow(
      "SupabaseBusinessStore.findByHealthRating is not implemented yet."
    );
  });

  it("rejects on list", async () => {
    const store = new SupabaseBusinessStore();
    await expect(store.list()).rejects.toThrow("SupabaseBusinessStore.list is not implemented yet.");
  });

  it("rejects on upsert", async () => {
    const store = new SupabaseBusinessStore();
    await expect(store.upsert(buildProfile())).rejects.toThrow(
      "SupabaseBusinessStore.upsert is not implemented yet."
    );
  });

  it("rejects on delete", async () => {
    const store = new SupabaseBusinessStore();
    await expect(store.delete("business_1")).rejects.toThrow(
      "SupabaseBusinessStore.delete is not implemented yet."
    );
  });
});
