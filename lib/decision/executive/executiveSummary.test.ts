import { describe, it, expect } from "vitest";
import { buildExecutiveSummary } from "@/lib/decision/executive/executiveSummary";
import { buildDecisionProfileFixture } from "@/tests/fixtures";
import type { Finding, RiskFinding } from "@/lib/decision";
import type { Source, Evidence } from "@/lib/research";

// The first automated tests buildExecutiveSummary has ever had
// (MILESTONE_31_DESIGN.md Deliverable 8) — its only prior verification
// was a temporary scratch route, exercised once, then deleted
// (DECISION_PLATFORM.md's "Runtime Verification" section).

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source-1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "A source",
    url: "https://example.com/a",
    domain: "example.com",
    retrievedAt: new Date().toISOString(),
    confidence: 80,
    ...overrides,
  };
}

function buildFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "finding-default",
    category: "general",
    severity: "low",
    summary: "A finding.",
    evidence: [],
    confidence: 50,
    ...overrides,
  };
}

function buildRiskFinding(overrides: Partial<RiskFinding> = {}): RiskFinding {
  const source = buildSource();
  const evidence: Evidence = {
    id: "evidence-1",
    claim: "A claim.",
    evidence: "Supporting text.",
    confidence: 80,
    source,
    url: source.url,
    retrievedAt: source.retrievedAt,
  };

  return {
    id: "risk-default",
    category: "general",
    severity: "high",
    summary: "A risk.",
    evidence: [evidence],
    confidence: 50,
    ...overrides,
  };
}

describe("buildExecutiveSummary", () => {
  it("slices strengths/weaknesses to the default max of 3", () => {
    const profile = buildDecisionProfileFixture({
      strengths: ["a", "b", "c", "d", "e"],
      weaknesses: ["w1", "w2", "w3", "w4"],
    });

    const summary = buildExecutiveSummary(profile);

    expect(summary.topStrengths).toEqual(["a", "b", "c"]);
    expect(summary.topWeaknesses).toEqual(["w1", "w2", "w3"]);
  });

  it("respects a custom maxItems argument", () => {
    const profile = buildDecisionProfileFixture({ strengths: ["a", "b", "c", "d"] });

    const summary = buildExecutiveSummary(profile, 2);

    expect(summary.topStrengths).toEqual(["a", "b"]);
  });

  it("sorts findings by severity (high first) before slicing, without altering them", () => {
    const low = buildFinding({ id: "low", severity: "low" });
    const high = buildFinding({ id: "high", severity: "high" });
    const medium = buildFinding({ id: "medium", severity: "medium" });

    const profile = buildDecisionProfileFixture({ keyFindings: [low, medium, high] });

    const summary = buildExecutiveSummary(profile);

    expect(summary.topFindings.map((finding) => finding.id)).toEqual(["high", "medium", "low"]);
  });

  it("counts critical risks without altering them", () => {
    const risks = [buildRiskFinding({ id: "1" }), buildRiskFinding({ id: "2" })];
    const profile = buildDecisionProfileFixture({ criticalRisks: risks });

    const summary = buildExecutiveSummary(profile);

    expect(summary.criticalRiskCount).toBe(2);
  });

  it("is 0 for a profile with no critical risks — never fabricated", () => {
    const profile = buildDecisionProfileFixture({ criticalRisks: [] });

    const summary = buildExecutiveSummary(profile);

    expect(summary.criticalRiskCount).toBe(0);
  });

  it("passes decisionContext, businessSummary, and confidenceSummary through unmodified", () => {
    const profile = buildDecisionProfileFixture();

    const summary = buildExecutiveSummary(profile);

    expect(summary.decisionContext).toEqual(profile.decisionContext);
    expect(summary.businessSummary).toEqual(profile.businessSummary);
    expect(summary.confidenceSummary).toEqual(profile.confidenceSummary);
  });

  it("stamps a real, parseable generatedAt timestamp", () => {
    const profile = buildDecisionProfileFixture();

    const summary = buildExecutiveSummary(profile);

    expect(Number.isNaN(Date.parse(summary.generatedAt))).toBe(false);
  });
});
