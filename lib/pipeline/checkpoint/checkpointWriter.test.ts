import { describe, it, expect } from "vitest";
import { writeCheckpoint, readCheckpoint } from "@/lib/pipeline/checkpoint/checkpointWriter";
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

// Milestone 76 — verifies this file's actual, current behavior using a
// real MemoryPipelineStore (no mocking needed, since it's already a
// genuine implementation): writeCheckpoint validates and persists the
// FULL current execution record (never a diff), and throws on a
// schema-invalid record rather than silently persisting it — the
// documented boundary that keeps a genuine internal invariant violation
// from ever being misclassified as a retryable stage failure.
describe("writeCheckpoint", () => {
  it("validates and persists the execution, returning the validated record", async () => {
    const store = new MemoryPipelineStore();
    const execution = buildExecution();

    const result = await writeCheckpoint(store, execution);

    expect(result).toEqual(execution);
    await expect(store.getById("pipeline_1")).resolves.toEqual(execution);
  });

  it("overwrites a previously-written checkpoint with the same id (a snapshot, never a diff)", async () => {
    const store = new MemoryPipelineStore();
    await writeCheckpoint(store, buildExecution({ state: "pending" }));

    const updated = buildExecution({ state: "running", currentStageIndex: 1 });
    await writeCheckpoint(store, updated);

    await expect(store.getById("pipeline_1")).resolves.toEqual(updated);
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
