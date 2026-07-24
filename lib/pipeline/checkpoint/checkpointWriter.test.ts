import { describe, it, expect } from "vitest";
import { writeCheckpoint, readCheckpoint, CheckpointConflictError } from "@/lib/pipeline/checkpoint/checkpointWriter";
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

// Milestone 76, revised at Milestone 107 for optimistic concurrency:
// writeCheckpoint now performs a version-conditional write
// (store.upsertWithVersionCheck), not a blind store.upsert() — every
// assertion below accounts for the version this introduces, while
// preserving each test's original intent (validates and persists the
// FULL current execution, a snapshot never a diff, and throws on a
// schema-invalid record rather than silently persisting it).
describe("writeCheckpoint", () => {
  it("validates and persists the execution, returning it with the version incremented", async () => {
    const store = new MemoryPipelineStore();
    const execution = buildExecution();

    const result = await writeCheckpoint(store, execution);

    expect(result).toEqual({ ...execution, version: 1 });
    await expect(store.getById("pipeline_1")).resolves.toEqual({ ...execution, version: 1 });
  });

  it("overwrites a previously-written checkpoint with the same id (a snapshot, never a diff)", async () => {
    const store = new MemoryPipelineStore();
    const first = await writeCheckpoint(store, buildExecution({ state: "pending" }));

    const updated = buildExecution({ state: "running", currentStageIndex: 1, version: first.version });
    const second = await writeCheckpoint(store, updated);

    expect(second.version).toBe(2);
    await expect(store.getById("pipeline_1")).resolves.toEqual({ ...updated, version: 2 });
  });

  it("throws CheckpointConflictError when the expected version no longer matches what's persisted", async () => {
    const store = new MemoryPipelineStore();
    await writeCheckpoint(store, buildExecution());

    // Simulates a concurrent writer having already advanced the version
    // (Milestone 107's own race scenario) — this write still believes
    // the version is 0.
    const staleWrite = writeCheckpoint(store, buildExecution({ state: "running" }));

    await expect(staleWrite).rejects.toThrow(CheckpointConflictError);
  });

  it("CheckpointConflictError carries the actual, current persisted execution", async () => {
    const store = new MemoryPipelineStore();
    const persisted = await writeCheckpoint(store, buildExecution());

    try {
      await writeCheckpoint(store, buildExecution({ state: "running" }));
      expect.unreachable("expected a CheckpointConflictError");
    } catch (error) {
      expect(error).toBeInstanceOf(CheckpointConflictError);
      expect((error as CheckpointConflictError).current).toEqual(persisted);
    }
  });

  it("throws when the execution object is not schema-valid", async () => {
    const store = new MemoryPipelineStore();
    const invalidExecution = { ...buildExecution(), state: "not_a_real_state" } as unknown as PipelineExecution;

    await expect(writeCheckpoint(store, invalidExecution)).rejects.toThrow();
  });

  it("does not persist an invalid execution", async () => {
    const store = new MemoryPipelineStore();
    const invalidExecution = { ...buildExecution(), state: "not_a_real_state" } as unknown as PipelineExecution;

    await expect(writeCheckpoint(store, invalidExecution)).rejects.toThrow();
    await expect(store.getById("pipeline_1")).resolves.toBeNull();
  });
});

describe("readCheckpoint", () => {
  it("returns the stored execution for a known id", async () => {
    const store = new MemoryPipelineStore();
    const execution = buildExecution();
    await store.upsert(execution);

    await expect(readCheckpoint(store, "pipeline_1")).resolves.toEqual(execution);
  });

  it("returns null for an unknown id", async () => {
    const store = new MemoryPipelineStore();
    await expect(readCheckpoint(store, "does_not_exist")).resolves.toBeNull();
  });
});
