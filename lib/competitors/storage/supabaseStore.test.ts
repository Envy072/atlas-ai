import { describe, it, expect } from "vitest";
import { SupabaseCompetitorStore } from "@/lib/competitors/storage/supabaseStore";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

function buildProfile(): CompanyProfile {
  return {
    id: "company_1",
    name: "Acme",
    aliases: [],
    features: [],
    technology: [],
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
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

// Milestone 54 — this class is explicitly "ARCHITECTURE ONLY": every
// method's real, current, implemented behavior is to reject with a
// documented error. These tests lock in that real behavior (including the
// table name interpolated into getById's message), not a future
// implementation.
describe("SupabaseCompetitorStore", () => {
  it("uses the default table name 'competitor_profiles' when none is given", async () => {
    const store = new SupabaseCompetitorStore();
    await expect(store.getById("company_1")).rejects.toThrow(
      'SupabaseCompetitorStore is architecture only — no "competitor_profiles" query is implemented yet.'
    );
  });

  it("interpolates a custom table name into getById's error", async () => {
    const store = new SupabaseCompetitorStore("custom_table");
    await expect(store.getById("company_1")).rejects.toThrow(
      'SupabaseCompetitorStore is architecture only — no "custom_table" query is implemented yet.'
    );
  });

  it("rejects on findByName", async () => {
    const store = new SupabaseCompetitorStore();
    await expect(store.findByName("Acme")).rejects.toThrow(
      "SupabaseCompetitorStore.findByName is not implemented yet."
    );
  });

  it("rejects on list", async () => {
    const store = new SupabaseCompetitorStore();
    await expect(store.list()).rejects.toThrow("SupabaseCompetitorStore.list is not implemented yet.");
  });

  it("rejects on upsert", async () => {
    const store = new SupabaseCompetitorStore();
    await expect(store.upsert(buildProfile())).rejects.toThrow(
      "SupabaseCompetitorStore.upsert is not implemented yet."
    );
  });

  it("rejects on delete", async () => {
    const store = new SupabaseCompetitorStore();
    await expect(store.delete("company_1")).rejects.toThrow(
      "SupabaseCompetitorStore.delete is not implemented yet."
    );
  });
});
