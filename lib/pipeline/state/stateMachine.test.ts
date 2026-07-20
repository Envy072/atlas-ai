import { describe, it, expect } from "vitest";
import { isTerminalState, canTransition, assertTransition } from "@/lib/pipeline/state/stateMachine";
import type { PipelineState } from "@/lib/pipeline/schemas/enums";

const ALL_STATES: PipelineState[] = [
  "pending",
  "running",
  "retry_pending",
  "stage_failed",
  "cancelling",
  "completed",
  "cancelled",
  "failed",
];

// Milestone 74 — verifies this file's actual, current behavior: the fixed
// valid-transition table, which states are terminal, and that an illegal
// transition throws rather than silently producing an invalid state.
describe("isTerminalState", () => {
  it("is true for completed, cancelled, and failed", () => {
    expect(isTerminalState("completed")).toBe(true);
    expect(isTerminalState("cancelled")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
  });

  it("is false for every non-terminal state", () => {
    expect(isTerminalState("pending")).toBe(false);
    expect(isTerminalState("running")).toBe(false);
    expect(isTerminalState("retry_pending")).toBe(false);
    expect(isTerminalState("stage_failed")).toBe(false);
    expect(isTerminalState("cancelling")).toBe(false);
  });
});

describe("canTransition", () => {
  it("allows pending -> running and pending -> failed", () => {
    expect(canTransition("pending", "running")).toBe(true);
    expect(canTransition("pending", "failed")).toBe(true);
  });

  it("allows running -> completed, retry_pending, stage_failed, cancelling, failed, and running itself", () => {
    expect(canTransition("running", "completed")).toBe(true);
    expect(canTransition("running", "retry_pending")).toBe(true);
    expect(canTransition("running", "stage_failed")).toBe(true);
    expect(canTransition("running", "cancelling")).toBe(true);
    expect(canTransition("running", "failed")).toBe(true);
    expect(canTransition("running", "running")).toBe(true);
  });

  it("allows retry_pending -> running, cancelling, and cancelled", () => {
    expect(canTransition("retry_pending", "running")).toBe(true);
    expect(canTransition("retry_pending", "cancelling")).toBe(true);
    expect(canTransition("retry_pending", "cancelled")).toBe(true);
  });

  it("allows stage_failed -> running and cancelled", () => {
    expect(canTransition("stage_failed", "running")).toBe(true);
    expect(canTransition("stage_failed", "cancelled")).toBe(true);
  });

  it("allows cancelling -> cancelled only", () => {
    expect(canTransition("cancelling", "cancelled")).toBe(true);
    expect(canTransition("cancelling", "running")).toBe(false);
  });

  it("disallows every transition out of a terminal state", () => {
    for (const from of ["completed", "cancelled", "failed"] as const) {
      for (const to of ALL_STATES) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });

  it("disallows pending -> completed directly", () => {
    expect(canTransition("pending", "completed")).toBe(false);
  });

  it("disallows retry_pending -> stage_failed directly", () => {
    expect(canTransition("retry_pending", "stage_failed")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("does not throw for a legal transition", () => {
    expect(() => assertTransition("pending", "running")).not.toThrow();
  });

  it("throws a descriptive error for an illegal transition", () => {
    expect(() => assertTransition("completed", "running")).toThrow(
      'Invalid pipeline state transition: "completed" -> "running".'
    );
  });
});
