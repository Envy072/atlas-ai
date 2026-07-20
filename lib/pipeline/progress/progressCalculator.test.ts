import { describe, it, expect } from "vitest";
import { computeProgress, TOTAL_STAGES } from "@/lib/pipeline/progress/progressCalculator";
import type { StageRecord } from "@/lib/pipeline/schemas/stage.schema";

function buildRecord(overrides: Partial<StageRecord> = {}): StageRecord {
  return {
    stage: "research",
    attempt: 1,
    trigger: "initial",
    status: "succeeded",
    startedAt: "2026-01-01T00:00:00.000Z",
    finishedAt: "2026-01-01T00:00:01.000Z",
    durationMs: 1000,
    ...overrides,
  };
}

// Milestone 75 — verifies this file's actual, current behavior: real
// composition over data already known, never a fabricated estimate. The
// TOTAL_STAGES constant and its own equal-weighting-per-stage approach
// (1/6 each) are both current, real implementation facts, not
// placeholders.
describe("computeProgress", () => {
  it("returns 0% and no estimate when stageHistory is empty", () => {
    const snapshot = computeProgress([]);

    expect(snapshot).toEqual({ completedStages: 0, percent: 0 });
  });

  it("counts only succeeded stages toward completedStages, not running or failed ones", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research", status: "succeeded" }),
      buildRecord({ stage: "competitors", status: "running", finishedAt: undefined, durationMs: undefined }),
      buildRecord({ stage: "market", status: "failed", finishedAt: "2026-01-01T00:00:02.000Z", durationMs: undefined }),
    ];

    const snapshot = computeProgress(history);

    expect(snapshot.completedStages).toBe(1);
  });

  it("rounds percent to the nearest whole-stage increment", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research" }),
      buildRecord({ stage: "competitors" }),
    ];

    const snapshot = computeProgress(history);

    expect(snapshot.percent).toBe(Math.round((2 / TOTAL_STAGES) * 100));
  });

  it("returns no estimatedRemainingMs when no stage has completed yet", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research", status: "running", finishedAt: undefined, durationMs: undefined }),
    ];

    const snapshot = computeProgress(history);

    expect(snapshot.completedStages).toBe(0);
    expect(snapshot.estimatedRemainingMs).toBeUndefined();
  });

  it("estimates remaining time from the average duration of succeeded stages", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research", durationMs: 1000 }),
      buildRecord({ stage: "competitors", durationMs: 3000 }),
    ];

    const snapshot = computeProgress(history);
    const averageDurationMs = (1000 + 3000) / 2;
    const remainingStages = TOTAL_STAGES - 2;

    expect(snapshot.estimatedRemainingMs).toBe(Math.round(averageDurationMs * remainingStages));
  });

  it("deduplicates a stage that succeeded across multiple attempts when counting completedStages", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research", attempt: 1, status: "failed", finishedAt: "2026-01-01T00:00:01.000Z", durationMs: undefined }),
      buildRecord({ stage: "research", attempt: 2, status: "succeeded", trigger: "auto_retry" }),
    ];

    const snapshot = computeProgress(history);

    expect(snapshot.completedStages).toBe(1);
  });

  it("returns 100% and no estimatedRemainingMs when every stage has succeeded", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research" }),
      buildRecord({ stage: "competitors" }),
      buildRecord({ stage: "market" }),
      buildRecord({ stage: "financial" }),
      buildRecord({ stage: "business" }),
      buildRecord({ stage: "decision" }),
    ];

    const snapshot = computeProgress(history);

    expect(snapshot.completedStages).toBe(TOTAL_STAGES);
    expect(snapshot.percent).toBe(100);
    expect(snapshot.estimatedRemainingMs).toBeUndefined();
  });
});
