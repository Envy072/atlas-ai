import { describe, it, expect } from "vitest";
import { DEFAULT_PIPELINE_RETRY_POLICY, computeBackoffMs } from "@/lib/pipeline/retry/retryPolicy";

// Milestone 81 — verifies this file's actual, current behavior: the
// policy's exact field values, and the exponential backoff formula.
// attempt 3 exercises behavior implemented by the function even though
// it is not currently reached by production callers (pipelineEngine.ts
// only ever calls this with attempt 1 or 2, given
// DEFAULT_PIPELINE_RETRY_POLICY.maxAutoRetries === 2).
describe("DEFAULT_PIPELINE_RETRY_POLICY", () => {
  it("has the current, documented field values", () => {
    expect(DEFAULT_PIPELINE_RETRY_POLICY).toEqual({
      maxAutoRetries: 2,
      baseBackoffMs: 300,
    });
  });
});

describe("computeBackoffMs", () => {
  it("returns baseBackoffMs unchanged for attempt 1 (2^0 = 1)", () => {
    expect(computeBackoffMs(DEFAULT_PIPELINE_RETRY_POLICY, 1)).toBe(300);
  });

  it("doubles baseBackoffMs for attempt 2 (2^1 = 2)", () => {
    expect(computeBackoffMs(DEFAULT_PIPELINE_RETRY_POLICY, 2)).toBe(600);
  });

  it("quadruples baseBackoffMs for attempt 3 (2^2 = 4), beyond what current production callers invoke", () => {
    expect(computeBackoffMs(DEFAULT_PIPELINE_RETRY_POLICY, 3)).toBe(1200);
  });

  it("scales with a different policy's own baseBackoffMs", () => {
    expect(computeBackoffMs({ maxAutoRetries: 5, baseBackoffMs: 100 }, 2)).toBe(200);
  });
});
