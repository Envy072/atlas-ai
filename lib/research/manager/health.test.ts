import { describe, it, expect } from "vitest";
import { computeHealth } from "@/lib/research/manager/health";
import type { ProviderMetricsSnapshot } from "@/lib/research/manager/types";

// computeHealth's first-ever automated test (MILESTONE_32_DESIGN.md
// Deliverable 10) — the concrete verification behind this milestone's
// own "provider health monitoring" acceptance criterion. Pure logic, no
// mocking needed: a snapshot in, a health verdict out.

function buildSnapshot(overrides: Partial<ProviderMetricsSnapshot> = {}): ProviderMetricsSnapshot {
  return {
    providerId: "brave",
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
    timeoutCount: 0,
    totalSourceCount: 0,
    lastLatencyMs: null,
    averageLatencyMs: null,
    lastSuccessfulRequestAt: null,
    ...overrides,
  };
}

describe("computeHealth", () => {
  it("stays healthy below the minimum-requests threshold, even at a 100% failure rate", () => {
    // Fewer than 3 recorded attempts — optimistic by design (health.ts's
    // own MIN_REQUESTS_FOR_JUDGEMENT): there isn't enough evidence yet to
    // judge a provider unhealthy, even though 2/2 would be a 100% failure
    // rate above every other threshold.
    const snapshot = buildSnapshot({ totalRequests: 2, failureCount: 2 });

    expect(computeHealth(snapshot)).toBe("healthy");
  });

  it("is offline at exactly the 80% failure-rate threshold", () => {
    const snapshot = buildSnapshot({ totalRequests: 10, failureCount: 8 });

    expect(computeHealth(snapshot)).toBe("offline");
  });

  it("combines failureCount and timeoutCount toward the same failure rate", () => {
    const snapshot = buildSnapshot({ totalRequests: 10, failureCount: 4, timeoutCount: 4 });

    expect(computeHealth(snapshot)).toBe("offline");
  });

  it("is degraded at exactly the 30% failure-rate threshold", () => {
    const snapshot = buildSnapshot({ totalRequests: 10, failureCount: 3 });

    expect(computeHealth(snapshot)).toBe("degraded");
  });

  it("is degraded just below the offline threshold", () => {
    const snapshot = buildSnapshot({ totalRequests: 10, failureCount: 7 });

    expect(computeHealth(snapshot)).toBe("degraded");
  });

  it("is healthy just below the degraded threshold, with enough history to judge", () => {
    const snapshot = buildSnapshot({ totalRequests: 10, failureCount: 2 });

    expect(computeHealth(snapshot)).toBe("healthy");
  });

  it("is healthy with zero recorded failures across a real request history", () => {
    const snapshot = buildSnapshot({ totalRequests: 10, successCount: 10 });

    expect(computeHealth(snapshot)).toBe("healthy");
  });
});
