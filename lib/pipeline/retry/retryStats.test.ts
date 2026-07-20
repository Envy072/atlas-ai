import { describe, it, expect } from "vitest";
import { countAutoRetries, countManualRetries, nextAttemptNumber } from "@/lib/pipeline/retry/retryStats";
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

// Milestone 79 — verifies this file's actual, current behavior: retry
// counts are always derived from stageHistory, filtered by both stage
// name and trigger, never tracked as separate counters.
describe("countAutoRetries", () => {
  it("counts only records for the given stage with trigger 'auto_retry'", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research", trigger: "initial" }),
      buildRecord({ stage: "research", trigger: "auto_retry", attempt: 2 }),
      buildRecord({ stage: "research", trigger: "auto_retry", attempt: 3 }),
      buildRecord({ stage: "competitors", trigger: "auto_retry" }),
    ];

    expect(countAutoRetries(history, "research")).toBe(2);
  });

  it("returns 0 when no record for the stage has trigger 'auto_retry'", () => {
    const history: StageRecord[] = [buildRecord({ stage: "research", trigger: "initial" })];

    expect(countAutoRetries(history, "research")).toBe(0);
  });
});

describe("countManualRetries", () => {
  it("counts only records for the given stage with trigger 'manual_retry'", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research", trigger: "initial" }),
      buildRecord({ stage: "research", trigger: "manual_retry", attempt: 2 }),
      buildRecord({ stage: "competitors", trigger: "manual_retry" }),
    ];

    expect(countManualRetries(history, "research")).toBe(1);
  });

  it("returns 0 when no record for the stage has trigger 'manual_retry'", () => {
    const history: StageRecord[] = [buildRecord({ stage: "research", trigger: "auto_retry" })];

    expect(countManualRetries(history, "research")).toBe(0);
  });

  it("does not conflate manual retries with auto retries for the same stage", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research", trigger: "auto_retry" }),
      buildRecord({ stage: "research", trigger: "manual_retry", attempt: 2 }),
    ];

    expect(countManualRetries(history, "research")).toBe(1);
    expect(countAutoRetries(history, "research")).toBe(1);
  });
});

describe("nextAttemptNumber", () => {
  it("returns 1 when the stage has no history yet", () => {
    expect(nextAttemptNumber([], "research")).toBe(1);
  });

  it("counts every record for the stage regardless of trigger or status", () => {
    const history: StageRecord[] = [
      buildRecord({ stage: "research", trigger: "initial", status: "failed" }),
      buildRecord({ stage: "research", trigger: "auto_retry", attempt: 2, status: "failed" }),
      buildRecord({ stage: "research", trigger: "manual_retry", attempt: 3, status: "succeeded" }),
    ];

    expect(nextAttemptNumber(history, "research")).toBe(4);
  });

  it("does not count records for a different stage", () => {
    const history: StageRecord[] = [buildRecord({ stage: "competitors" })];

    expect(nextAttemptNumber(history, "research")).toBe(1);
  });
});
