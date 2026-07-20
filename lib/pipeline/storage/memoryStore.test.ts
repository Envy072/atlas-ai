import { describe, it, expect, beforeEach } from "vitest";
import { MemoryPipelineStore } from "@/lib/pipeline/storage/memoryStore";
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// Milestone 78 — verifies this file's actual, current in-process Map-backed
// behavior. This class is already relied upon (as a real implementation,
// not a mock) by checkpointWriter.test.ts — these tests give it its own
// direct coverage.
describe("MemoryPipelineStore", () => {
  let store: MemoryPipelineStore;

  beforeEach(() => {
    store = new MemoryPipelineStore();
  });

  it("returns null from getById when no execution has been stored", async () => {
    await expect(store.getById("pipeline_1")).resolves.toBeNull();
  });

  it("upserts and retrieves an execution by id", async () => {
    const execution = buildExecution({ id: "pipeline_1" });
    await store.upsert(execution);

    await expect(store.getById("pipeline_1")).resolves.toEqual(execution);
  });

  it("upsert overwrites an existing execution with the same id", async () => {
    await store.upsert(buildExecution({ id: "pipeline_1", state: "pending" }));
    await store.upsert(buildExecution({ id: "pipeline_1", state: "running", currentStageIndex: 1 }));

    const result = await store.getById("pipeline_1");
    expect(result?.state).toBe("running");
    expect(result?.currentStageIndex).toBe(1);
  });

  it("lists every stored execution", async () => {
    await store.upsert(buildExecution({ id: "pipeline_1" }));
    await store.upsert(buildExecution({ id: "pipeline_2" }));

    const all = await store.list();
    expect(all.map((execution) => execution.id).sort()).toEqual(["pipeline_1", "pipeline_2"]);
  });

  it("returns an empty list when nothing has been stored", async () => {
    await expect(store.list()).resolves.toEqual([]);
  });

  it("deletes an execution by id", async () => {
    await store.upsert(buildExecution({ id: "pipeline_1" }));
    await store.delete("pipeline_1");

    await expect(store.getById("pipeline_1")).resolves.toBeNull();
  });

  it("does not throw when deleting an id that was never stored", async () => {
    await expect(store.delete("does_not_exist")).resolves.toBeUndefined();
  });
});
