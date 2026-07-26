import { describe, it, expect, beforeEach } from "vitest";
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

// Milestone 53 — verifies this file's actual, current in-process Map-backed
// behavior: exact-id lookups, a case/whitespace-insensitive scan across
// both `name` and `aliases` for findByName, and standard upsert/delete
// semantics. Milestone 116 scoped findByName()/list() to the caller's own
// analysisId — every profile now belongs to exactly one analysis
// (Milestone 114's Critical Finding #1), so a name/alias match is never
// returned across analyses.
describe("MemoryCompetitorStore", () => {
  let store: MemoryCompetitorStore;

  beforeEach(() => {
    store = new MemoryCompetitorStore();
  });

  it("returns null from getById when no profile has been stored", async () => {
    await expect(store.getById("company_1")).resolves.toBeNull();
  });

  it("upserts and retrieves a profile by id", async () => {
    await store.upsert(buildProfile({ id: "company_1" }));
    await expect(store.getById("company_1")).resolves.toMatchObject({ id: "company_1" });
  });

  it("upsert overwrites an existing profile with the same id", async () => {
    await store.upsert(buildProfile({ id: "company_1", confidence: 40 }));
    await store.upsert(buildProfile({ id: "company_1", confidence: 90 }));

    const result = await store.getById("company_1");
    expect(result?.confidence).toBe(90);
  });

  it("finds a profile by exact name within the given analysisId, case/whitespace-insensitively", async () => {
    await store.upsert(buildProfile({ id: "company_1", name: "Acme", analysisId: "analysis-a" }));
    await expect(store.findByName("  ACME  ", "analysis-a")).resolves.toMatchObject({ id: "company_1" });
  });

  it("finds a profile by one of its aliases within the given analysisId", async () => {
    await store.upsert(
      buildProfile({ id: "company_1", name: "Acme", aliases: ["Acme Corp"], analysisId: "analysis-a" })
    );
    await expect(store.findByName("acme corp", "analysis-a")).resolves.toMatchObject({ id: "company_1" });
  });

  it("returns null from findByName when no name or alias matches", async () => {
    await store.upsert(buildProfile({ id: "company_1", name: "Acme", analysisId: "analysis-a" }));
    await expect(store.findByName("HubSpot", "analysis-a")).resolves.toBeNull();
  });

  it("never returns a profile matching by name if it belongs to a different analysisId", async () => {
    await store.upsert(buildProfile({ id: "company_1", name: "Acme", analysisId: "analysis-a" }));
    await expect(store.findByName("Acme", "analysis-b")).resolves.toBeNull();
  });

  it("lists only profiles belonging to the given analysisId", async () => {
    await store.upsert(buildProfile({ id: "company_1", analysisId: "analysis-a" }));
    await store.upsert(buildProfile({ id: "company_2", analysisId: "analysis-b" }));

    const scopedToA = await store.list("analysis-a");
    expect(scopedToA.map((profile) => profile.id)).toEqual(["company_1"]);
  });

  it("returns an empty list when nothing matches the given analysisId", async () => {
    await store.upsert(buildProfile({ id: "company_1", analysisId: "analysis-a" }));
    await expect(store.list("analysis-b")).resolves.toEqual([]);
  });

  it("deletes a profile by id", async () => {
    await store.upsert(buildProfile({ id: "company_1" }));
    await store.delete("company_1");

    await expect(store.getById("company_1")).resolves.toBeNull();
  });

  it("does not throw when deleting an id that was never stored", async () => {
    await expect(store.delete("does_not_exist")).resolves.toBeUndefined();
  });
});
