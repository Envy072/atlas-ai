import { describe, it, expect, vi } from "vitest";

const getUser = vi.fn(async () => ({ data: { user: null } }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { getUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: mockRow, error: null })),
        })),
        order: vi.fn(async () => ({ data: mockRow ? [mockRow] : [], error: null })),
      })),
      upsert: vi.fn(async () => ({ error: null })),
      delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    })),
  })),
}));

// Set by each test before constructing the store, since the mock above
// is defined once at module scope (vi.mock is hoisted).
let mockRow: Record<string, unknown> | null = null;

import { createSupabaseAnalysisSessionStore } from "@/lib/analysis-session/storage/supabaseStore";

// Real as of Milestone 106 — built on Milestone 105's persistence core,
// so this test exercises the column-mapping (toRow/fromRow) this file
// owns, not persistence/adapter mechanics already covered by
// createRepository.test.ts and supabaseAdapter.test.ts.
describe("createSupabaseAnalysisSessionStore", () => {
  it("maps a stored row back to a camelCase SessionRecord", async () => {
    mockRow = {
      id: "session_1",
      execution_id: "pipeline_1",
      title: "A subscription box",
      startup_idea: "A subscription box for coffee",
      owner_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const store = createSupabaseAnalysisSessionStore();
    const record = await store.getById("session_1");

    expect(record).toEqual({
      id: "session_1",
      executionId: "pipeline_1",
      title: "A subscription box",
      startupIdea: "A subscription box for coffee",
      ownerId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns null when no row matches", async () => {
    mockRow = null;
    const store = createSupabaseAnalysisSessionStore();
    expect(await store.getById("missing")).toBeNull();
  });

  it("persists a SessionRecord via upsert without throwing", async () => {
    mockRow = null;
    const store = createSupabaseAnalysisSessionStore();
    await expect(
      store.upsert({
        id: "session_2",
        executionId: "pipeline_2",
        title: "Idea",
        startupIdea: "Idea",
        ownerId: "user_1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })
    ).resolves.toBeUndefined();
  });
});
