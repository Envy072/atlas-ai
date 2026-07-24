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
    version: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// Milestone 78, extended at Milestone 107 with upsertWithVersionCheck
// coverage — this class is already relied upon (as a real implementation,
// not a mock) by checkpointWriter.test.ts and pipelineEngine.test.ts's
// own race-condition suite, so its version semantics need direct,
// dedicated coverage too, not just indirect exercise through those files.
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

  describe("upsertWithVersionCheck", () => {
    it("succeeds unconditionally for a brand-new id, persisting version + 1", async () => {
      const result = await store.upsertWithVersionCheck(buildExecution({ version: 0 }), 0);

      expect(result).toEqual({ success: true, version: 1 });
      await expect(store.getById("pipeline_1")).resolves.toMatchObject({ version: 1 });
    });

    it("succeeds when expectedVersion matches the stored version, incrementing it", async () => {
      await store.upsertWithVersionCheck(buildExecution({ version: 0 }), 0);

      const result = await store.upsertWithVersionCheck(buildExecution({ state: "running", version: 1 }), 1);

      expect(result).toEqual({ success: true, version: 2 });
      await expect(store.getById("pipeline_1")).resolves.toMatchObject({ state: "running", version: 2 });
    });

    it("fails when expectedVersion is stale, returning the actual current record", async () => {
      const first = await store.upsertWithVersionCheck(buildExecution({ version: 0 }), 0);
      expect(first).toEqual({ success: true, version: 1 });

      // A second writer still believes the version is 0 (the exact race
      // Milestone 104C's Finding 1 identified).
      const stale = await store.upsertWithVersionCheck(buildExecution({ state: "cancelling", version: 0 }), 0);

      expect(stale.success).toBe(false);
      if (!stale.success) {
        expect(stale.current).toMatchObject({ state: "pending", version: 1 });
      }
    });

    it("does not mutate the stored record when the version check fails", async () => {
      await store.upsertWithVersionCheck(buildExecution({ version: 0 }), 0);
      await store.upsertWithVersionCheck(buildExecution({ state: "failed", version: 0 }), 0);

      await expect(store.getById("pipeline_1")).resolves.toMatchObject({ state: "pending", version: 1 });
    });
  });
});
