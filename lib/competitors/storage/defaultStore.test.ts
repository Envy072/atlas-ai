import { describe, it, expect } from "vitest";
import { defaultCompetitorStore } from "@/lib/competitors/storage/defaultStore";
import { MemoryCompetitorStore } from "@/lib/competitors/storage/memoryStore";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

function buildProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
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
    ...overrides,
  };
}

// Milestone 54 — this module is one line (`createStore()` called once at
// import time), but that one line encodes a real architectural invariant
// this file's own comment names explicitly: every consumer that omits its
// own store must share the exact same instance, or "knowledge accumulates
// across runs" silently breaks. These tests verify that invariant directly
// (default backend + genuine shared state), not the trivial fact that the
// export exists.
describe("defaultCompetitorStore", () => {
  it("defaults to a MemoryCompetitorStore", () => {
    expect(defaultCompetitorStore).toBeInstanceOf(MemoryCompetitorStore);
  });

  it("is a single shared instance — data written via one import is visible via another", async () => {
    await defaultCompetitorStore.upsert(buildProfile({ id: "company_shared" }));

    // A second import of the same module path resolves to the same
    // module-cached instance (Node/Vitest's own ES module semantics) —
    // this assertion fails if defaultStore.ts is ever changed to a
    // factory/getter that constructs a fresh store per call, which is
    // exactly the regression this test exists to catch.
    const { defaultCompetitorStore: reimported } = await import(
      "@/lib/competitors/storage/defaultStore"
    );

    await expect(reimported.getById("company_shared")).resolves.toMatchObject({ id: "company_shared" });
  });
});
