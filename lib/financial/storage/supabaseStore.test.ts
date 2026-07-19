import { describe, it, expect } from "vitest";
import { SupabaseFinancialStore } from "@/lib/financial/storage/supabaseStore";
import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";

function buildProfile(): FinancialProfile {
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
  };
}

// Milestone 59 — this class is explicitly "ARCHITECTURE ONLY": every
// method's real, current, implemented behavior is to reject with a
// documented error. Mirrors lib/business's own supabaseStore.test.ts.
describe("SupabaseFinancialStore", () => {
  it("uses the default table name 'financial_profiles' when none is given", async () => {
    const store = new SupabaseFinancialStore();
    await expect(store.getById("financial_1")).rejects.toThrow(
      'SupabaseFinancialStore is architecture only — no "financial_profiles" query is implemented yet.'
    );
  });

  it("interpolates a custom table name into getById's error", async () => {
    const store = new SupabaseFinancialStore("custom_table");
    await expect(store.getById("financial_1")).rejects.toThrow(
      'SupabaseFinancialStore is architecture only — no "custom_table" query is implemented yet.'
    );
  });

  it("rejects on findByFundingStage", async () => {
    const store = new SupabaseFinancialStore();
    await expect(store.findByFundingStage("seed")).rejects.toThrow(
      "SupabaseFinancialStore.findByFundingStage is not implemented yet."
    );
  });

  it("rejects on list", async () => {
    const store = new SupabaseFinancialStore();
    await expect(store.list()).rejects.toThrow("SupabaseFinancialStore.list is not implemented yet.");
  });

  it("rejects on upsert", async () => {
    const store = new SupabaseFinancialStore();
    await expect(store.upsert(buildProfile())).rejects.toThrow(
      "SupabaseFinancialStore.upsert is not implemented yet."
    );
  });

  it("rejects on delete", async () => {
    const store = new SupabaseFinancialStore();
    await expect(store.delete("financial_1")).rejects.toThrow(
      "SupabaseFinancialStore.delete is not implemented yet."
    );
  });
});
