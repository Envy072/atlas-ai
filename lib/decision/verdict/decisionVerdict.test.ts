import { describe, it, expect, vi, afterEach } from "vitest";
import type { Evidence } from "@/lib/research";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";
import type { InvestmentThesis } from "@/lib/decision/schemas/thesis.schema";
import type { DecisionConfidence } from "@/lib/decision/schemas/confidence.schema";
import type { Recommendation } from "@/lib/business";
import type { CandidateVerdict } from "@/lib/decision/schemas/candidateVerdict.schema";
import type { VerdictCategory } from "@/lib/decision/schemas/enums";

// deriveVerdict()'s first-ever automated test (MILESTONE_38_DESIGN.md
// Deliverable 9), and incidentally buildDecisionVerdict()'s and
// computeVerdictConfidence()'s first tests (both unmodified/new, never
// tested until now). Mocks lib/services/openai.ts directly — one layer
// up from the OpenAI SDK itself, mirroring riskFinding.test.ts's/
// investmentThesis.test.ts's own "mock the one thing this file talks
// to" philosophy exactly. verifyClaimTraceability() (Milestone 33) and
// computeCitableEvidence() (lib/decision/evidence/citableEvidence.ts)
// are both real, unmodified, and exercised for real here, not mocked.

vi.mock("@/lib/services/openai", () => ({ generateCandidateVerdict: vi.fn() }));

import { generateCandidateVerdict } from "@/lib/services/openai";
import { deriveVerdict, buildDecisionVerdict, computeVerdictConfidence } from "@/lib/decision/verdict/decisionVerdict";

const mockedGenerateCandidateVerdict = vi.mocked(generateCandidateVerdict);

function buildEvidence(id: string, confidence = 80): Evidence {
  return {
    id,
    claim: `Claim for ${id}`,
    evidence: `Supporting evidence for a real verdict, from ${id}.`,
    confidence,
    source: {
      id: `source_${id}`,
      providerId: "tavily",
      sourceType: "search_engine",
      title: `Source for ${id}`,
      url: `https://example.com/${id}`,
      domain: "example.com",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      confidence,
    },
    url: `https://example.com/${id}`,
    retrievedAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "finding-1",
    category: "market",
    severity: "medium",
    summary: "A real finding.",
    evidence: [buildEvidence("evidence-a")],
    confidence: 70,
    ...overrides,
  };
}

function buildRiskFinding(overrides: Partial<RiskFinding> = {}): RiskFinding {
  return {
    id: "risk-1",
    category: "market",
    severity: "high",
    summary: "A real risk.",
    evidence: [buildEvidence("evidence-b")],
    confidence: 65,
    ...overrides,
  };
}

function buildEmptyThesis(overrides: Partial<InvestmentThesis> = {}): InvestmentThesis {
  return {
    positiveArguments: [],
    negativeArguments: [],
    unknowns: [],
    contradictions: [],
    supportingEvidence: [],
    ...overrides,
  };
}

function buildRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "recommendation-1",
    category: "growth",
    priority: "high",
    reason: "A real recommendation.",
    requiredEvidence: ["evidence-a"],
    confidence: 90,
    ...overrides,
  };
}

function buildConfidenceSummary(overrides: Partial<DecisionConfidence> = {}): DecisionConfidence {
  return {
    evidenceConfidence: 55,
    coverage: 70,
    unknownPercentage: 30,
    ...overrides,
  };
}

function buildCandidate(overrides: Partial<CandidateVerdict> = {}): CandidateVerdict {
  return {
    summary: "A real, grounded verdict.",
    citedEvidenceIds: ["evidence-a"],
    category: "pursue",
    ...overrides,
  };
}

afterEach(() => {
  mockedGenerateCandidateVerdict.mockReset();
});

describe("buildDecisionVerdict", () => {
  it("constructs a schema-valid DecisionVerdict", () => {
    const verdict = buildDecisionVerdict({
      category: "pursue",
      summary: "A real verdict.",
      confidence: 80,
      supportingEvidence: [buildEvidence("evidence-a")],
    });

    expect(verdict).toEqual({
      category: "pursue",
      summary: "A real verdict.",
      confidence: 80,
      supportingEvidence: [buildEvidence("evidence-a")],
    });
    expect(verdict).not.toHaveProperty("id");
  });
});

describe("computeVerdictConfidence", () => {
  it("averages the supplied supportingEvidence's own confidence values", () => {
    const supportingEvidence = [buildEvidence("evidence-a", 60), buildEvidence("evidence-b", 80)];

    const result = computeVerdictConfidence(supportingEvidence, buildConfidenceSummary());

    expect(result).toBe(70);
  });

  it("falls back to confidenceSummary.evidenceConfidence when supportingEvidence is empty (defensive-only — Suggestion 8)", () => {
    const result = computeVerdictConfidence([], buildConfidenceSummary({ evidenceConfidence: 42 }));

    expect(result).toBe(42);
  });
});

describe("deriveVerdict", () => {
  it("returns undefined and never calls generateCandidateVerdict when findings, criticalRisks, investmentThesis, and recommendations are all empty", async () => {
    const result = await deriveVerdict("A startup idea.", [], [], buildEmptyThesis(), [], buildConfidenceSummary());

    expect(result).toBeUndefined();
    expect(mockedGenerateCandidateVerdict).not.toHaveBeenCalled();
  });

  it("calls generateCandidateVerdict with exactly the startupIdea, findings, criticalRisks, investmentThesis, recommendations, confidenceSummary, and computed citableEvidence it received", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    const findings = [buildFinding({ evidence: [evidenceA] })];
    const criticalRisks = [buildRiskFinding({ evidence: [evidenceB] })];
    const investmentThesis = buildEmptyThesis({ positiveArguments: ["A positive point."] });
    const recommendations = [buildRecommendation()];
    const confidenceSummary = buildConfidenceSummary();
    mockedGenerateCandidateVerdict.mockResolvedValue(buildCandidate());

    await deriveVerdict("A very specific startup idea.", findings, criticalRisks, investmentThesis, recommendations, confidenceSummary);

    // The exact, deterministic citable-evidence pool
    // computeCitableEvidence() must produce from these fixtures: the
    // union of findings.evidence (evidenceA) and criticalRisks.evidence
    // (evidenceB) — investmentThesis.supportingEvidence stays [] here,
    // uncontributed.
    expect(mockedGenerateCandidateVerdict).toHaveBeenCalledWith(
      "A very specific startup idea.",
      findings,
      criticalRisks,
      investmentThesis,
      recommendations,
      confidenceSummary,
      [evidenceA, evidenceB]
    );
  });

  it.each<VerdictCategory>(["pursue", "pursue_with_conditions", "monitor", "pass"])(
    "produces a real DecisionVerdict for a %s candidate whose citations all resolve",
    async (category) => {
      const finding = buildFinding({ evidence: [buildEvidence("evidence-a")] });
      mockedGenerateCandidateVerdict.mockResolvedValue(
        buildCandidate({ category, citedEvidenceIds: ["evidence-a"] })
      );

      const result = await deriveVerdict(
        "A startup idea.",
        [finding],
        [],
        buildEmptyThesis(),
        [],
        buildConfidenceSummary()
      );

      expect(result).toMatchObject({
        category,
        summary: "A real, grounded verdict.",
      });
      expect(result?.supportingEvidence).toEqual([buildEvidence("evidence-a")]);
    }
  );

  it("computes confidence as the average confidence of the resolved supportingEvidence, not of the supplied recommendations", async () => {
    const evidenceA = buildEvidence("evidence-a", 60);
    const evidenceB = buildEvidence("evidence-b", 80);
    const finding = buildFinding({ evidence: [evidenceA, evidenceB] });
    mockedGenerateCandidateVerdict.mockResolvedValue(
      buildCandidate({ citedEvidenceIds: ["evidence-a", "evidence-b"] })
    );
    // A recommendation confidence deliberately far from the evidence
    // average (10, vs. the evidence's own 70) — proves the formula
    // reads supportingEvidence, never Recommendation.confidence
    // (Major Finding 2's resolution).
    const recommendations = [buildRecommendation({ confidence: 10 })];

    const result = await deriveVerdict(
      "A startup idea.",
      [finding],
      [],
      buildEmptyThesis(),
      recommendations,
      buildConfidenceSummary()
    );

    expect(result?.confidence).toBe(70);
  });

  it("drops a candidate citing at least one unresolved evidence id, resolving to undefined rather than a partial verdict", async () => {
    const finding = buildFinding({ evidence: [buildEvidence("evidence-a")] });
    mockedGenerateCandidateVerdict.mockResolvedValue(
      buildCandidate({ citedEvidenceIds: ["evidence-a", "does-not-exist"] })
    );

    const result = await deriveVerdict(
      "A startup idea.",
      [finding],
      [],
      buildEmptyThesis(),
      [],
      buildConfidenceSummary()
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined when the candidate cites no real evidence", async () => {
    const finding = buildFinding({ evidence: [buildEvidence("evidence-a")] });
    mockedGenerateCandidateVerdict.mockResolvedValue(buildCandidate({ citedEvidenceIds: ["does-not-exist"] }));

    const result = await deriveVerdict(
      "A startup idea.",
      [finding],
      [],
      buildEmptyThesis(),
      [],
      buildConfidenceSummary()
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined and logs, rather than throwing, when generation fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const finding = buildFinding({ evidence: [buildEvidence("evidence-a")] });
    mockedGenerateCandidateVerdict.mockRejectedValue(new Error("OpenAI request failed."));

    const result = await deriveVerdict(
      "A startup idea.",
      [finding],
      [],
      buildEmptyThesis(),
      [],
      buildConfidenceSummary()
    );

    expect(result).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
