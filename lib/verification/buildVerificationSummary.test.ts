import { describe, it, expect } from "vitest";
import { buildVerificationSummary } from "@/lib/verification/buildVerificationSummary";
import { buildDecisionProfileFixture } from "@/tests/fixtures/decisionProfileFixture";
import type { DecisionProfile } from "@/lib/decision";
import type { Evidence, Source } from "@/lib/research";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";

// lib/verification had zero test coverage before this milestone — the
// only platform in the repository at 0%. buildVerificationSummary's
// only real collaborator is lib/decision (already fully tested), so
// this file reuses the real, existing buildDecisionProfileFixture()
// rather than hand-authoring a DecisionProfile, per this project's
// standing "prefer real production builders" convention.

function buildSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "search_engine",
    title: "Industry report",
    url: "https://example.com/report",
    domain: "example.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    ...overrides,
  };
}

function buildEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "evidence_1",
    claim: "The market is growing",
    evidence: "An industry report cites double-digit growth.",
    confidence: 70,
    source: buildSource(),
    url: "https://example.com/report",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "finding_1",
    category: "market",
    severity: "medium",
    summary: "A real finding.",
    evidence: [],
    confidence: 70,
    ...overrides,
  };
}

function buildRiskFinding(overrides: Partial<RiskFinding> = {}): RiskFinding {
  return {
    id: "risk_1",
    category: "market",
    severity: "high",
    summary: "A real risk.",
    evidence: [buildEvidence()],
    confidence: 70,
    ...overrides,
  };
}

function buildProfile(overrides: Partial<DecisionProfile> = {}): DecisionProfile {
  return buildDecisionProfileFixture(overrides);
}

describe("buildVerificationSummary", () => {
  it("counts a Finding as verified only when it has at least one Evidence entry", () => {
    const verifiedFinding = buildFinding({ id: "finding_verified", evidence: [buildEvidence()] });
    const unverifiedFinding = buildFinding({ id: "finding_unverified", evidence: [] });
    const profile = buildProfile({ keyFindings: [verifiedFinding, unverifiedFinding], criticalRisks: [] });

    const result = buildVerificationSummary(profile);

    const findingClaims = result.verifiedClaims.filter((claim) => claim.kind === "finding");
    expect(findingClaims).toHaveLength(1);
    expect(findingClaims[0].summary).toBe(verifiedFinding.summary);
  });

  it("always counts every RiskFinding as verified", () => {
    const risk = buildRiskFinding();
    const profile = buildProfile({ keyFindings: [], criticalRisks: [risk] });

    const result = buildVerificationSummary(profile);

    const riskClaims = result.verifiedClaims.filter((claim) => claim.kind === "critical_risk");
    expect(riskClaims).toHaveLength(1);
    expect(riskClaims[0].summary).toBe(risk.summary);
  });

  it("treats decisionLimitations and openQuestions as unverifiedStatements, in that order", () => {
    const profile = buildProfile({
      decisionLimitations: ["A real limitation."],
      openQuestions: ["A real open question."],
    });

    const result = buildVerificationSummary(profile);

    expect(result.unverifiedStatements).toEqual(["A real limitation.", "A real open question."]);
  });

  it("computes verifiedRatio as verifiedCount over the total when at least one statement exists", () => {
    const profile = buildProfile({
      keyFindings: [buildFinding({ evidence: [buildEvidence()] })],
      criticalRisks: [],
      decisionLimitations: ["One limitation."],
      openQuestions: [],
    });

    const result = buildVerificationSummary(profile);

    expect(result.verificationCounts.verifiedCount).toBe(1);
    expect(result.verificationCounts.unverifiedCount).toBe(1);
    expect(result.verificationCounts.verifiedRatio).toBe(0.5);
  });

  it("returns a verifiedRatio of 0 when there are no verified or unverified statements at all", () => {
    const profile = buildProfile({
      keyFindings: [],
      criticalRisks: [],
      decisionLimitations: [],
      openQuestions: [],
    });

    const result = buildVerificationSummary(profile);

    expect(result.verificationCounts.verifiedCount).toBe(0);
    expect(result.verificationCounts.unverifiedCount).toBe(0);
    expect(result.verificationCounts.verifiedRatio).toBe(0);
  });

  it("counts unique domains across sources, deduping repeated domains", () => {
    const profile = buildProfile({
      sources: [
        buildSource({ id: "source_a", domain: "acme.com", url: "https://acme.com/a" }),
        buildSource({ id: "source_b", domain: "acme.com", url: "https://acme.com/b" }),
        buildSource({ id: "source_c", domain: "other.com", url: "https://other.com" }),
      ],
    });

    const result = buildVerificationSummary(profile);

    expect(result.sourceBreakdown.totalSources).toBe(3);
    expect(result.sourceBreakdown.uniqueDomains).toBe(2);
  });

  it("passes confidenceSummary through unchanged", () => {
    const profile = buildProfile();

    const result = buildVerificationSummary(profile);

    expect(result.confidence).toEqual(profile.confidenceSummary);
  });
});
