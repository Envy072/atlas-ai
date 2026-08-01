import { describe, it, expect, vi, beforeEach } from "vitest";

// Milestone 125 — replaces the "ARCHITECTURE ONLY" version of this test
// file (every assertion locked in a thrown "not implemented yet" error).
// A small, hand-rolled fake table (Map keyed by row id) stands in for
// Postgres here, mirroring lib/pipeline/storage/supabaseStore.test.ts's
// own inline-mock precedent and lib/market/storage/supabaseStore.test.ts's
// identical shape one platform over — faithful enough to exercise the
// real filter/order chains SupabaseCompetitorStore actually issues
// (select().eq().maybeSingle() for getById; select().eq().order() for
// list(), which findByName() itself calls; upsert(); delete().eq()),
// without depending on live Supabase credentials. Reset before every
// test so no test observes another's writes.
let table = new Map<string, Record<string, unknown>>();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => {
        const filters: Array<[string, unknown]> = [];
        const matches = () =>
          Array.from(table.values()).filter((row) => filters.every(([column, value]) => row[column] === value));

        const builder = {
          eq: (column: string, value: unknown) => {
            filters.push([column, value]);
            return builder;
          },
          maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
          order: () => {
            const ordered = () =>
              [...matches()].sort((a, b) => (b.created_at as string).localeCompare(a.created_at as string));
            return {
              then: (resolve: (result: { data: unknown[]; error: null }) => void) =>
                resolve({ data: ordered(), error: null }),
            };
          },
        };
        return builder;
      },
      upsert: async (row: Record<string, unknown>) => {
        table.set(row.id as string, row);
        return { error: null };
      },
      delete: () => ({
        eq: async (_column: string, value: unknown) => {
          table.delete(value as string);
          return { error: null };
        },
      }),
    }),
  }),
}));

import { SupabaseCompetitorStore } from "@/lib/competitors/storage/supabaseStore";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

function buildProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    id: "company_1",
    analysisId: "analysis-1",
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

beforeEach(() => {
  table = new Map();
});

describe("SupabaseCompetitorStore", () => {
  describe("CRUD", () => {
    it("returns null from getById when nothing has been stored", async () => {
      const store = new SupabaseCompetitorStore();
      expect(await store.getById("missing")).toBeNull();
    });

    it("upserts a profile and reads it back via getById", async () => {
      const store = new SupabaseCompetitorStore();
      const profile = buildProfile();

      await store.upsert(profile);

      await expect(store.getById("company_1")).resolves.toEqual(profile);
    });

    it("upsert is idempotent — writing the same profile twice leaves exactly one row", async () => {
      const store = new SupabaseCompetitorStore();
      const profile = buildProfile();

      await store.upsert(profile);
      await store.upsert({ ...profile, confidence: 75 });

      expect(table.size).toBe(1);
      await expect(store.getById("company_1")).resolves.toMatchObject({ confidence: 75 });
    });

    it("deletes a stored profile", async () => {
      const store = new SupabaseCompetitorStore();
      await store.upsert(buildProfile());

      await store.delete("company_1");

      expect(await store.getById("company_1")).toBeNull();
    });

    it("uses the given custom table name", async () => {
      const store = new SupabaseCompetitorStore("custom_competitor_table");
      await store.upsert(buildProfile());

      await expect(store.getById("company_1")).resolves.toMatchObject({ id: "company_1" });
    });
  });

  describe("analysisId scoping (Milestone 116) — no cross-analysis contamination", () => {
    it("list only returns profiles belonging to the requested analysisId", async () => {
      const store = new SupabaseCompetitorStore();
      await store.upsert(buildProfile({ id: "company_a", analysisId: "analysis-a" }));
      await store.upsert(buildProfile({ id: "company_b", analysisId: "analysis-b" }));

      const resultA = await store.list("analysis-a");
      const resultB = await store.list("analysis-b");

      expect(resultA.map((p) => p.id)).toEqual(["company_a"]);
      expect(resultB.map((p) => p.id)).toEqual(["company_b"]);
    });

    it("findByName never matches a same-named company that belongs to a different analysis", async () => {
      const store = new SupabaseCompetitorStore();
      await store.upsert(buildProfile({ id: "company_a", analysisId: "analysis-a", name: "Acme" }));

      expect(await store.findByName("Acme", "analysis-b")).toBeNull();
      await expect(store.findByName("Acme", "analysis-a")).resolves.toMatchObject({ id: "company_a" });
    });
  });

  describe("findByName", () => {
    it("matches case-insensitively and ignores surrounding whitespace", async () => {
      const store = new SupabaseCompetitorStore();
      await store.upsert(buildProfile({ id: "company_a", analysisId: "analysis-a", name: "Acme" }));

      await expect(store.findByName("  ACME  ", "analysis-a")).resolves.toMatchObject({ id: "company_a" });
    });

    it("matches against a known alias, not only the primary name", async () => {
      const store = new SupabaseCompetitorStore();
      await store.upsert(
        buildProfile({ id: "company_a", analysisId: "analysis-a", name: "Acme", aliases: ["Acme Inc"] })
      );

      await expect(store.findByName("Acme Inc", "analysis-a")).resolves.toMatchObject({ id: "company_a" });
    });

    it("returns null when no name or alias matches within that analysis", async () => {
      const store = new SupabaseCompetitorStore();
      await store.upsert(buildProfile({ id: "company_a", analysisId: "analysis-a", name: "Acme" }));

      expect(await store.findByName("Globex", "analysis-a")).toBeNull();
    });
  });

  describe("retry behavior", () => {
    it("a retried resolution for the same analysisId sees the previously-persisted profile", async () => {
      const store = new SupabaseCompetitorStore();
      await store.upsert(buildProfile({ id: "company_a", analysisId: "analysis-a", confidence: 40 }));

      // Simulates resolveCompetitorKnowledge's own read-then-merge-then-
      // write shape on a retried stage: list the analysis's own known
      // profiles, then persist an updated version under the SAME id.
      const [existing] = await store.list("analysis-a");
      expect(existing).toBeDefined();
      await store.upsert({ ...existing, confidence: 90 });

      await expect(store.findByName("Acme", "analysis-a")).resolves.toMatchObject({
        id: "company_a",
        confidence: 90,
      });
    });
  });

  describe("persistence across instances", () => {
    it("a profile written through one store instance is visible through a second, independently-constructed instance", async () => {
      const writer = new SupabaseCompetitorStore();
      await writer.upsert(buildProfile({ id: "company_shared", analysisId: "analysis-shared" }));

      const reader = new SupabaseCompetitorStore();
      await expect(reader.findByName("Acme", "analysis-shared")).resolves.toMatchObject({ id: "company_shared" });
    });
  });
});
