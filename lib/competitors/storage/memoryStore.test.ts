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
// semantics. No durability claims are tested — that's explicitly not this
// store's job.
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

  it("finds a profile by exact name, case/whitespace-insensitively", async () => {
    await store.upsert(buildProfile({ id: "company_1", name: "Acme" }));
    await expect(store.findByName("  ACME  ")).resolves.toMatchObject({ id: "company_1" });
  });

  it("finds a profile by one of its aliases", async () => {
    await store.upsert(buildProfile({ id: "company_1", name: "Acme", aliases: ["Acme Corp"] }));
    await expect(store.findByName("acme corp")).resolves.toMatchObject({ id: "company_1" });
  });

  it("returns null from findByName when no name or alias matches", async () => {
    await store.upsert(buildProfile({ id: "company_1", name: "Acme" }));
    await expect(store.findByName("HubSpot")).resolves.toBeNull();
  });

  it("lists every stored profile", async () => {
    await store.upsert(buildProfile({ id: "company_1" }));
    await store.upsert(buildProfile({ id: "company_2" }));

    const all = await store.list();
    expect(all.map((profile) => profile.id).sort()).toEqual(["company_1", "company_2"]);
  });

  it("returns an empty list when nothing has been stored", async () => {
    await expect(store.list()).resolves.toEqual([]);
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
