import { describe, it, expect } from "vitest";
import { buildInvestmentMemo } from "@/lib/decision/memo/investmentMemo";
import { buildDecisionProfileFixture } from "@/tests/fixtures";
import type { Recommendation } from "@/lib/business";
import type { DecisionVerdict } from "@/lib/decision/schemas/verdict.schema";

// The first automated tests buildInvestmentMemo has ever had
// (MILESTONE_31_DESIGN.md Deliverable 8) — its only prior verification
// was a temporary scratch route, exercised once, then deleted
// (DECISION_PLATFORM.md's "Runtime Verification" section). Extended at
// Milestone 38 (Deliverable 14) with coverage for the new, optional
// third `verdict` parameter — its own first description's stale
// "Decision Intelligence never generates one itself" claim is also
// corrected here (Minor Finding 4, Principal Architect Review):
// deriveRecommendations() has generated real recommendations since
// Milestone 37.

function buildRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "recommendation-default",
    category: "growth",
    priority: "high",
    reason: "A reason.",
    requiredEvidence: [],
    confidence: 50,
    ...overrides,
  };
}

function buildVerdict(overrides: Partial<DecisionVerdict> = {}): DecisionVerdict {
  return {
    category: "pursue",
    summary: "A real verdict summary.",
    confidence: 75,
    supportingEvidence: [],
    ...overrides,
  };
}

describe("buildInvestmentMemo", () => {
  it("defaults recommendations to [] when none are supplied", () => {
    const profile = buildDecisionProfileFixture();

    const memo = buildInvestmentMemo(profile);

    expect(memo.recommendations).toEqual([]);
  });

  it("passes through a caller-supplied recommendations list unmodified", () => {
    const profile = buildDecisionProfileFixture();
    const recommendations = [buildRecommendation({ id: "r1" }), buildRecommendation({ id: "r2" })];

    const memo = buildInvestmentMemo(profile, recommendations);

    expect(memo.recommendations).toEqual(recommendations);
  });

  it("defaults verdict to undefined when none is supplied", () => {
    const profile = buildDecisionProfileFixture();

    const memo = buildInvestmentMemo(profile);

    expect(memo.verdict).toBeUndefined();
  });

  it("passes through a caller-supplied verdict unmodified", () => {
    const profile = buildDecisionProfileFixture();
    const verdict = buildVerdict();

    const memo = buildInvestmentMemo(profile, [], verdict);

    expect(memo.verdict).toEqual(verdict);
  });

  it("passes through decisionContext, businessSummary, investmentThesis, decisionReadiness, and confidenceSummary unmodified", () => {
    const profile = buildDecisionProfileFixture();

    const memo = buildInvestmentMemo(profile);

    expect(memo.decisionContext).toEqual(profile.decisionContext);
    expect(memo.businessSummary).toEqual(profile.businessSummary);
    expect(memo.investmentThesis).toEqual(profile.investmentThesis);
    expect(memo.decisionReadiness).toEqual(profile.decisionReadiness);
    expect(memo.confidenceSummary).toEqual(profile.confidenceSummary);
  });

  it("passes through keyFindings and criticalRisks unmodified — no reordering or filtering", () => {
    const profile = buildDecisionProfileFixture();

    const memo = buildInvestmentMemo(profile);

    expect(memo.keyFindings).toEqual(profile.keyFindings);
    expect(memo.criticalRisks).toEqual(profile.criticalRisks);
  });

  it("stamps a real, parseable generatedAt timestamp", () => {
    const profile = buildDecisionProfileFixture();

    const memo = buildInvestmentMemo(profile);

    expect(Number.isNaN(Date.parse(memo.generatedAt))).toBe(false);
  });
});
