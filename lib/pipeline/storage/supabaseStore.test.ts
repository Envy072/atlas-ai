import { describe, it, expect, vi } from "vitest";

// Configurable per test before constructing the store, mirroring
// lib/analysis-session/storage/supabaseStore.test.ts's own pattern —
// vi.mock is hoisted, so the mock factory below reads these through a
// closure rather than receiving them as arguments.
let mockSelectRow: Record<string, unknown> | null = null;
let mockInsertError: { code?: string; message: string } | null = null;
let mockUpdateData: Record<string, unknown>[] | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: mockSelectRow, error: null })),
        })),
        order: vi.fn(async () => ({ data: mockSelectRow ? [mockSelectRow] : [], error: null })),
      })),
      insert: vi.fn(async () => ({ error: mockInsertError })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(async () => ({ data: mockUpdateData, error: null })),
          })),
        })),
      })),
    })),
  })),
}));

import { createSupabasePipelineStore } from "@/lib/pipeline/storage/supabaseStore";
import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";

function buildExecution(overrides: Partial<PipelineExecution> = {}): PipelineExecution {
  return {
    id: "pipeline_1",
    startupIdea: "A subscription software platform for team scheduling",
    state: "pending",
    currentStageIndex: 0,
    context: { startupIdea: "A subscription software platform for team scheduling" },
    stageHistory: [],
    progress: { completedStages: 0, percent: 0 },
    version: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const MOCK_ROW = {
  id: "pipeline_1",
  startup_idea: "A subscription software platform for team scheduling",
  state: "pending",
  current_stage_index: 0,
  context: { startupIdea: "A subscription software platform for team scheduling" },
  stage_history: [],
  progress: { completedStages: 0, percent: 0 },
  error_summary: null,
  version: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

// Real as of Milestone 107 — built on Milestone 105's persistence core
// for the plain four methods, plus its own version-conditional write.
describe("createSupabasePipelineStore", () => {
  it("maps a stored row back to a camelCase PipelineExecution", async () => {
    mockSelectRow = MOCK_ROW;
    const store = createSupabasePipelineStore();

    const result = await store.getById("pipeline_1");

    expect(result).toEqual({
      id: "pipeline_1",
      startupIdea: "A subscription software platform for team scheduling",
      state: "pending",
      currentStageIndex: 0,
      context: { startupIdea: "A subscription software platform for team scheduling" },
      stageHistory: [],
      progress: { completedStages: 0, percent: 0 },
      errorSummary: undefined,
      version: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("returns null when no row matches", async () => {
    mockSelectRow = null;
    const store = createSupabasePipelineStore();
    expect(await store.getById("missing")).toBeNull();
  });

  describe("upsertWithVersionCheck", () => {
    it("succeeds on first insert (expectedVersion 0), returning version 1", async () => {
      mockInsertError = null;
      const store = createSupabasePipelineStore();

      const result = await store.upsertWithVersionCheck(buildExecution({ version: 0 }), 0);

      expect(result).toEqual({ success: true, version: 1 });
    });

    it("reports a conflict when the first insert hits a unique-violation (someone else created this id first)", async () => {
      mockInsertError = { code: "23505", message: "duplicate key value" };
      mockSelectRow = MOCK_ROW;
      const store = createSupabasePipelineStore();

      const result = await store.upsertWithVersionCheck(buildExecution({ version: 0 }), 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.current).toMatchObject({ id: "pipeline_1", version: 1 });
      }
    });

    it("succeeds on an update whose WHERE clause matched exactly one row", async () => {
      mockUpdateData = [{ ...MOCK_ROW, version: 2 }];
      const store = createSupabasePipelineStore();

      const result = await store.upsertWithVersionCheck(buildExecution({ state: "running", version: 1 }), 1);

      expect(result).toEqual({ success: true, version: 2 });
    });

    it("reports a conflict when the update's WHERE clause matched zero rows (a lost version race)", async () => {
      mockUpdateData = [];
      mockSelectRow = { ...MOCK_ROW, state: "cancelling", version: 3 };
      const store = createSupabasePipelineStore();

      const result = await store.upsertWithVersionCheck(buildExecution({ state: "running", version: 1 }), 1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.current).toMatchObject({ state: "cancelling", version: 3 });
      }
    });
  });
});
