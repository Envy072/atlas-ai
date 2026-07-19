import { describe, it, expect } from "vitest";
import { scoreFinancials } from "@/lib/financial/scoring/scoringEngine";
import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";

function buildEstimate() {
  return {};
}

function buildProfile(overrides: Partial<FinancialProfile> = {}): FinancialProfile {
  return {
    id: "financial_1",
    grossMargin: buildEstimate(),
    operatingMargin: buildEstimate(),
    burnRate: buildEstimate(),
    runway: buildEstimate(),
    breakEven: buildEstimate(),
    cac: buildEstimate(),
    ltv: buildEstimate(),
    ltvToCac: buildEstimate(),
    mrr: buildEstimate(),
    arr: buildEstimate(),
    paybackPeriod: buildEstimate(),
    revenueStreams: [],
    expenses: [],
    financialRisks: [],
    financialAssumptions: [],
    sources: [],
    evidence: [],
    confidence: 50,
    refresh: {
      lastUpdated: "2026-01-01T00:00:00.000Z",
      nextRefresh: "2026-01-31T00:00:00.000Z",
      refreshReason: "initial_discovery",
      refreshPriority: "normal",
    },
    ...overrides,
  };
}

// Milestone 58 — scoringDimensions.ts is (per the established precedent in
// every other platform) "ARCHITECTURE ONLY": every dimension scorer
// currently returns a fixed neutral placeholder. These tests verify
// today's actual composed output, not a hypothetical future scoring model.
describe("scoreFinancials", () => {
  it("returns a consistent overallScore composed from six equally-weighted placeholder dimensions", () => {
    const score = scoreFinancials(buildProfile());

    expect(score.dimensions).toHaveLength(6);
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);

    const expectedOverall = Math.round(
      score.dimensions.reduce((sum, entry) => sum + entry.score * (1 / 6), 0)
    );
    expect(score.overallScore).toBe(expectedOverall);
  });

  it("produces the same overallScore regardless of the profile's own field values", () => {
    const sparse = scoreFinancials(buildProfile());
    const rich = scoreFinancials(buildProfile({ confidence: 95, financialAssumptions: ["High margin business"] }));

    expect(rich.overallScore).toBe(sparse.overallScore);
  });

  it("sets financialProfileId from the profile's id", () => {
    const score = scoreFinancials(buildProfile({ id: "financial_42" }));
    expect(score.financialProfileId).toBe("financial_42");
  });

  it("uses the provided `now` for scoredAt, defaulting to the current time when omitted", () => {
    const now = new Date("2026-03-01T00:00:00.000Z");
    const scoredWithNow = scoreFinancials(buildProfile(), now);
    expect(scoredWithNow.scoredAt).toBe(now.toISOString());

    const before = Date.now();
    const scoredDefault = scoreFinancials(buildProfile());
    const after = Date.now();
    const scoredAtMs = Date.parse(scoredDefault.scoredAt);

    expect(scoredAtMs).toBeGreaterThanOrEqual(before);
    expect(scoredAtMs).toBeLessThanOrEqual(after);
  });
});
