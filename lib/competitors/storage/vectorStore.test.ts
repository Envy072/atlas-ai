import { describe, it, expect } from "vitest";
import { VectorDbCompetitorStore } from "@/lib/competitors/storage/vectorStore";
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

// Milestone 54 — same treatment as supabaseStore.test.ts: this class is
// explicitly "ARCHITECTURE ONLY, FUTURE PROVIDER" — every method's real,
// current, implemented behavior is to reject, including its one
// vector-specific method, findSimilarByDescription.
describe("VectorDbCompetitorStore", () => {
  it("uses the default collection name when none is given", async () => {
    const store = new VectorDbCompetitorStore();
    await expect(store.getById("company_1")).rejects.toThrow(
      'VectorDbCompetitorStore is architecture only — no vector collection "competitor_profiles_embeddings" is connected yet.'
    );
  });

  it("interpolates a custom collection name into getById's error", async () => {
    const store = new VectorDbCompetitorStore("custom_collection");
    await expect(store.getById("company_1")).rejects.toThrow(
      'VectorDbCompetitorStore is architecture only — no vector collection "custom_collection" is connected yet.'
    );
  });

  it("rejects on findByName", async () => {
    const store = new VectorDbCompetitorStore();
    await expect(store.findByName("Acme")).rejects.toThrow(
      "VectorDbCompetitorStore.findByName is not implemented yet."
    );
  });

  it("rejects on list", async () => {
    const store = new VectorDbCompetitorStore();
    await expect(store.list()).rejects.toThrow("VectorDbCompetitorStore.list is not implemented yet.");
  });

  it("rejects on upsert", async () => {
    const store = new VectorDbCompetitorStore();
    await expect(store.upsert(buildProfile())).rejects.toThrow(
      "VectorDbCompetitorStore.upsert is not implemented yet."
    );
  });

  it("rejects on delete", async () => {
    const store = new VectorDbCompetitorStore();
    await expect(store.delete("company_1")).rejects.toThrow(
      "VectorDbCompetitorStore.delete is not implemented yet."
    );
  });

  it("rejects on findSimilarByDescription", async () => {
    const store = new VectorDbCompetitorStore();
    await expect(store.findSimilarByDescription("a CRM for small teams")).rejects.toThrow(
      "VectorDbCompetitorStore.findSimilarByDescription is not implemented yet."
    );
  });
});
