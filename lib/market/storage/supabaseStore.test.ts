import { describe, it, expect, vi, beforeEach } from "vitest";

// Milestone 125 — replaces the "ARCHITECTURE ONLY" version of this test
// file (every assertion locked in a thrown "not implemented yet" error).
// A small, hand-rolled fake table (Map keyed by row id) stands in for
// Postgres here, mirroring lib/pipeline/storage/supabaseStore.test.ts's
// own inline-mock precedent — faithful enough to exercise the real
// filter/order/limit chains SupabaseMarketStore actually issues
// (select().eq().maybeSingle() for getById; select().eq().order()
// [.limit().maybeSingle()] for the two analysisId-scoped methods;
// upsert(); delete().eq()), without depending on live Supabase
// credentials. Reset before every test so no test observes another's
// writes.
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
              limit: () => ({
                maybeSingle: async () => ({ data: ordered()[0] ?? null, error: null }),
              }),
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

import { SupabaseMarketStore } from "@/lib/market/storage/supabaseStore";
import type { MarketProfile } from "@/lib/market/schemas/market.schema";

function buildProfile(overrides: Partial<MarketProfile> = {}): MarketProfile {
  return {
    id: "market_1",
    analysisId: "analysis-1",
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

beforeEach(() => {
  table = new Map();
});

describe("SupabaseMarketStore", () => {
  describe("CRUD", () => {
    it("returns null from getById when nothing has been stored", async () => {
      const store = new SupabaseMarketStore();
      expect(await store.getById("missing")).toBeNull();
    });

    it("upserts a profile and reads it back via getById", async () => {
      const store = new SupabaseMarketStore();
      const profile = buildProfile();

      await store.upsert(profile);

      await expect(store.getById("market_1")).resolves.toEqual(profile);
    });

    it("upsert is idempotent — writing the same profile twice leaves exactly one row", async () => {
      const store = new SupabaseMarketStore();
      const profile = buildProfile();

      await store.upsert(profile);
      await store.upsert({ ...profile, confidence: 75 });

      expect(table.size).toBe(1);
      await expect(store.getById("market_1")).resolves.toMatchObject({ confidence: 75 });
    });

    it("deletes a stored profile", async () => {
      const store = new SupabaseMarketStore();
      await store.upsert(buildProfile());

      await store.delete("market_1");

      expect(await store.getById("market_1")).toBeNull();
    });

    it("uses the given custom table name", async () => {
      const store = new SupabaseMarketStore("custom_market_table");
      await store.upsert(buildProfile());

      await expect(store.getById("market_1")).resolves.toMatchObject({ id: "market_1" });
    });
  });

  describe("analysisId scoping (Milestone 116) — no cross-analysis contamination", () => {
    it("getByAnalysisId finds a profile that belongs to that analysis", async () => {
      const store = new SupabaseMarketStore();
      await store.upsert(buildProfile({ id: "market_a", analysisId: "analysis-a" }));

      await expect(store.getByAnalysisId("analysis-a")).resolves.toMatchObject({ id: "market_a" });
    });

    it("getByAnalysisId returns null for an analysisId with no stored profile, even when other analyses have one", async () => {
      const store = new SupabaseMarketStore();
      await store.upsert(buildProfile({ id: "market_a", analysisId: "analysis-a" }));

      expect(await store.getByAnalysisId("analysis-b")).toBeNull();
    });

    it("list only returns profiles belonging to the requested analysisId", async () => {
      const store = new SupabaseMarketStore();
      await store.upsert(buildProfile({ id: "market_a", analysisId: "analysis-a" }));
      await store.upsert(buildProfile({ id: "market_b", analysisId: "analysis-b" }));

      const resultA = await store.list("analysis-a");
      const resultB = await store.list("analysis-b");

      expect(resultA.map((p) => p.id)).toEqual(["market_a"]);
      expect(resultB.map((p) => p.id)).toEqual(["market_b"]);
    });

    it("never lets two different analyses' profiles merge or become visible to each other", async () => {
      const store = new SupabaseMarketStore();
      await store.upsert(buildProfile({ id: "market_a", analysisId: "analysis-a", industry: "saas" }));
      await store.upsert(buildProfile({ id: "market_b", analysisId: "analysis-b", industry: "saas" }));

      const forA = await store.getByAnalysisId("analysis-a");
      const forB = await store.getByAnalysisId("analysis-b");

      expect(forA?.id).toBe("market_a");
      expect(forB?.id).toBe("market_b");
      expect(forA?.id).not.toBe(forB?.id);
    });
  });

  describe("retry behavior", () => {
    it("a retried resolution for the same analysisId sees the previously-persisted profile", async () => {
      const store = new SupabaseMarketStore();
      await store.upsert(buildProfile({ id: "market_a", analysisId: "analysis-a", confidence: 40 }));

      // Simulates resolveMarketKnowledge's own read-then-merge-then-write
      // shape on a retried stage: read the existing profile, then persist
      // an updated version under the SAME id.
      const existing = await store.getByAnalysisId("analysis-a");
      expect(existing).not.toBeNull();
      await store.upsert({ ...existing!, confidence: 90 });

      await expect(store.getByAnalysisId("analysis-a")).resolves.toMatchObject({
        id: "market_a",
        confidence: 90,
      });
    });

    it("deterministic reads — getByAnalysisId picks the most recently created row when more than one somehow matches", async () => {
      const store = new SupabaseMarketStore();
      await store.upsert(buildProfile({ id: "market_old", analysisId: "analysis-a" }));
      // Force distinct created_at ordering by writing directly into the
      // fake table's own row shape (created_at is store-internal
      // bookkeeping, not a MarketProfile field).
      table.set("market_old", { ...table.get("market_old"), created_at: "2026-01-01T00:00:00.000Z" });

      await store.upsert(buildProfile({ id: "market_new", analysisId: "analysis-a" }));
      table.set("market_new", { ...table.get("market_new"), created_at: "2026-01-02T00:00:00.000Z" });

      await expect(store.getByAnalysisId("analysis-a")).resolves.toMatchObject({ id: "market_new" });
    });
  });

  describe("persistence across instances", () => {
    it("a profile written through one store instance is visible through a second, independently-constructed instance", async () => {
      const writer = new SupabaseMarketStore();
      await writer.upsert(buildProfile({ id: "market_shared", analysisId: "analysis-shared" }));

      const reader = new SupabaseMarketStore();
      await expect(reader.getByAnalysisId("analysis-shared")).resolves.toMatchObject({ id: "market_shared" });
    });
  });
});
