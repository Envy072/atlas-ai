import { describe, it, expect } from "vitest";
import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import type { StageRecord } from "@/lib/pipeline/schemas/stage.schema";
import { buildTimeline } from "@/lib/analysis-session/timeline/buildTimeline";

// Mirrors lib/pipeline/engine/pipelineEngine.recovery.test.ts's own
// local buildExecution() helper (not promoted to tests/fixtures/ — only
// two files would use it, short of CLAUDE.md's own "promote at three
// repetitions" rule).
function buildExecution(overrides: Partial<PipelineExecution> = {}): PipelineExecution {
  return {
    id: "pipeline_1",
    startupIdea: "A subscription software platform for team scheduling",
    state: "running",
    currentStageIndex: 0,
    context: { startupIdea: "A subscription software platform for team scheduling" },
    stageHistory: [],
    progress: { completedStages: 0, percent: 0 },
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildStageRecord(overrides: Partial<StageRecord> = {}): StageRecord {
  return {
    stage: "research",
    attempt: 1,
    trigger: "initial",
    status: "succeeded",
    startedAt: "2026-01-01T00:00:01.000Z",
    finishedAt: "2026-01-01T00:00:02.000Z",
    durationMs: 1000,
    ...overrides,
  };
}

describe("buildTimeline", () => {
  it("shows only 'session started' for a fresh execution where no stage has begun yet", () => {
    const entries = buildTimeline(buildExecution({ stageHistory: [] }));

    expect(entries.map((e) => e.kind)).toEqual(["session_started"]);
  });

  it("shows a completed first stage followed by the next stage's own start, in order", () => {
    const execution = buildExecution({
      currentStageIndex: 1,
      stageHistory: [
        buildStageRecord({ stage: "research", status: "succeeded" }),
        buildStageRecord({ stage: "competitors", status: "failed", finishedAt: undefined }),
      ],
    });

    const entries = buildTimeline(execution);

    expect(entries.map((e) => e.kind)).toEqual([
      "session_started",
      "stage_started",
      "stage_completed",
      "stage_started",
    ]);
    expect(entries[1].stage).toBe("research");
    expect(entries[3].stage).toBe("competitors");
  });

  it("collapses a failed attempt followed by a successful retry into a single stage_started/stage_completed pair, not one entry per attempt", () => {
    const execution = buildExecution({
      currentStageIndex: 1,
      stageHistory: [
        buildStageRecord({ stage: "research", attempt: 1, status: "failed", finishedAt: "2026-01-01T00:00:01.500Z" }),
        buildStageRecord({ stage: "research", attempt: 2, trigger: "auto_retry", status: "succeeded" }),
      ],
    });

    const entries = buildTimeline(execution);

    const researchEntries = entries.filter((e) => e.stage === "research");
    expect(researchEntries.map((e) => e.kind)).toEqual(["stage_started", "stage_completed"]);
  });

  it("surfaces 'needs attention' only once a stage's automatic retries are exhausted (state: stage_failed), and stops there", () => {
    const execution = buildExecution({
      state: "stage_failed",
      currentStageIndex: 0,
      stageHistory: [
        buildStageRecord({ stage: "research", status: "failed", finishedAt: "2026-01-01T00:00:01.500Z" }),
      ],
    });

    const entries = buildTimeline(execution);

    expect(entries.map((e) => e.kind)).toEqual(["session_started", "stage_started", "stage_needs_attention"]);
  });

  it("does not show 'needs attention' while a stage is still auto-retrying (state: retry_pending)", () => {
    const execution = buildExecution({
      state: "retry_pending",
      currentStageIndex: 0,
      stageHistory: [
        buildStageRecord({ stage: "research", status: "failed", finishedAt: "2026-01-01T00:00:01.500Z" }),
      ],
    });

    const entries = buildTimeline(execution);

    expect(entries.map((e) => e.kind)).toEqual(["session_started", "stage_started"]);
  });

  it("appends a session_completed entry once the execution reaches the completed state", () => {
    const execution = buildExecution({
      state: "completed",
      currentStageIndex: 6,
      stageHistory: [
        buildStageRecord({ stage: "research" }),
        buildStageRecord({ stage: "competitors" }),
        buildStageRecord({ stage: "market" }),
        buildStageRecord({ stage: "financial" }),
        buildStageRecord({ stage: "business" }),
        buildStageRecord({ stage: "decision" }),
      ],
      updatedAt: "2026-01-01T00:01:00.000Z",
    });

    const entries = buildTimeline(execution);

    expect(entries[entries.length - 1]).toMatchObject({
      kind: "session_completed",
      timestamp: "2026-01-01T00:01:00.000Z",
    });
  });
});
