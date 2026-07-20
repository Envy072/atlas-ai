import { describe, it, expect } from "vitest";
import { buildInitialExecution } from "@/lib/pipeline/engine/executionFactory";

// Milestone 84 — verifies this file's actual, current behavior:
// buildInitialExecution coordinates already-tested collaborators
// (nextExecutionId, computeProgress) into a fresh PipelineExecution
// starting in "pending" with an empty Context and empty history.
describe("buildInitialExecution", () => {
  it("starts in state 'pending' at stage index 0 with empty history", () => {
    const execution = buildInitialExecution("A subscription software platform for team scheduling");

    expect(execution.state).toBe("pending");
    expect(execution.currentStageIndex).toBe(0);
    expect(execution.stageHistory).toEqual([]);
  });

  it("sets context to only the startupIdea, nothing else", () => {
    const idea = "A subscription software platform for team scheduling";
    const execution = buildInitialExecution(idea);

    expect(execution.context).toEqual({ startupIdea: idea });
  });

  it("threads the startupIdea through to the top-level field", () => {
    const idea = "A subscription software platform for team scheduling";
    const execution = buildInitialExecution(idea);

    expect(execution.startupIdea).toBe(idea);
  });

  it("sets progress from the real computeProgress([]) output", () => {
    const execution = buildInitialExecution("An idea");

    expect(execution.progress).toEqual({ completedStages: 0, percent: 0 });
  });

  it("generates an id via the real nextExecutionId format", () => {
    const execution = buildInitialExecution("An idea");

    expect(execution.id).toMatch(/^pipeline_\d+_\d+$/);
  });

  it("generates a unique id on every call", () => {
    const a = buildInitialExecution("An idea");
    const b = buildInitialExecution("An idea");

    expect(a.id).not.toBe(b.id);
  });

  it("uses the provided `now` for both createdAt and updatedAt", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const execution = buildInitialExecution("An idea", now);

    expect(execution.createdAt).toBe(now.toISOString());
    expect(execution.updatedAt).toBe(now.toISOString());
  });

  it("defaults `now` to the current time when omitted", () => {
    const before = Date.now();
    const execution = buildInitialExecution("An idea");
    const after = Date.now();

    const createdAtMs = Date.parse(execution.createdAt);
    expect(createdAtMs).toBeGreaterThanOrEqual(before);
    expect(createdAtMs).toBeLessThanOrEqual(after);
    expect(execution.updatedAt).toBe(execution.createdAt);
  });
});
