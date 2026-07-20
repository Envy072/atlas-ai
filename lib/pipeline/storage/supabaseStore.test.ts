import { describe, it, expect } from "vitest";
import { SupabasePipelineStore } from "@/lib/pipeline/storage/supabaseStore";
import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";

function buildExecution(): PipelineExecution {
  return {
    id: "pipeline_1",
    startupIdea: "A subscription software platform for team scheduling",
    state: "pending",
    currentStageIndex: 0,
    context: { startupIdea: "A subscription software platform for team scheduling" },
    stageHistory: [],
    progress: { completedStages: 0, percent: 0 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

// Milestone 80 — this class is explicitly "ARCHITECTURE ONLY": every
// method's real, current, implemented behavior is to reject with a
// documented error. Mirrors the identical pattern already tested in
// lib/competitors, lib/business, lib/financial, and lib/market.
describe("SupabasePipelineStore", () => {
  it("uses the default table name 'pipeline_executions' when none is given", async () => {
    const store = new SupabasePipelineStore();
    await expect(store.getById("pipeline_1")).rejects.toThrow(
      'SupabasePipelineStore is architecture only — no "pipeline_executions" query is implemented yet.'
    );
  });

  it("interpolates a custom table name into getById's error", async () => {
    const store = new SupabasePipelineStore("custom_table");
    await expect(store.getById("pipeline_1")).rejects.toThrow(
      'SupabasePipelineStore is architecture only — no "custom_table" query is implemented yet.'
    );
  });

  it("rejects on list", async () => {
    const store = new SupabasePipelineStore();
    await expect(store.list()).rejects.toThrow("SupabasePipelineStore.list is not implemented yet.");
  });

  it("rejects on upsert", async () => {
    const store = new SupabasePipelineStore();
    await expect(store.upsert(buildExecution())).rejects.toThrow(
      "SupabasePipelineStore.upsert is not implemented yet."
    );
  });

  it("rejects on delete", async () => {
    const store = new SupabasePipelineStore();
    await expect(store.delete("pipeline_1")).rejects.toThrow(
      "SupabasePipelineStore.delete is not implemented yet."
    );
  });
});
