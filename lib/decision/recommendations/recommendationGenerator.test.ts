import { describe, it, expect, vi, afterEach } from "vitest";
import type { Evidence } from "@/lib/research";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";
import type { InvestmentThesis } from "@/lib/decision/schemas/thesis.schema";
import type { CandidateRecommendation } from "@/lib/decision/schemas/candidateRecommendation.schema";

// deriveRecommendations()'s first-ever automated test
// (MILESTONE_37_DESIGN.md Deliverable 5), and incidentally the
// first-ever real exercise of lib/business's own buildRecommendation()
// (Milestone 9, never tested) and sortRecommendationsByPriority()
// (never tested either). Mocks lib/services/openai.ts directly — one
// layer up from the OpenAI SDK itself, mirroring
// investmentThesis.test.ts/riskFinding.test.ts's own "mock the one
// thing this file talks to" philosophy exactly. verifyClaimTraceability()
// (Milestone 33), buildRecommendation() (Milestone 9, lib/business),
// and sortRecommendationsByPriority() (lib/decision/recommendations)
// are all real, unmodified, and exercised for real here, not mocked.

vi.mock("@/lib/services/openai", () => ({ generateCandidateRecommendations: vi.fn() }));

import { generateCandidateRecommendations } from "@/lib/services/openai";
import { deriveRecommendations } from "@/lib/decision/recommendations/recommendationGenerator";

const mockedGenerateCandidateRecommendations = vi.mocked(generateCandidateRecommendations);

function buildEvidence(id: string): Evidence {
  return {
    id,
    claim: `Claim for ${id}`,
    evidence: `Supporting text for ${id}`,
    confidence: 80,
    source: {
      id: `source_${id}`,
      providerId: "tavily",
      sourceType: "search_engine",
      title: `Source for ${id}`,
      url: `https://example.com/${id}`,
      domain: "example.com",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      confidence: 80,
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

function buildCandidate(overrides: Partial<CandidateRecommendation> = {}): CandidateRecommendation {
  return {
    summary: "A real, grounded recommendation.",
    citedEvidenceIds: ["evidence-a"],
    category: "growth",
    priority: "high",
    confidence: 70,
    ...overrides,
  };
}

afterEach(() => {
  mockedGenerateCandidateRecommendations.mockReset();
});

describe("deriveRecommendations", () => {
  it("returns [] and never calls generateCandidateRecommendations when findings, criticalRisks, and investmentThesis are all empty", async () => {
    const result = await deriveRecommendations("A startup idea.", [], [], buildEmptyThesis());

    expect(result).toEqual([]);
    expect(mockedGenerateCandidateRecommendations).not.toHaveBeenCalled();
  });

  it("calls generateCandidateRecommendations with exactly the startupIdea, findings, criticalRisks, investmentThesis, and computed citableEvidence it received", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    const findings = [buildFinding({ evidence: [evidenceA] })];
    const criticalRisks = [buildRiskFinding({ evidence: [evidenceB] })];
    const investmentThesis = buildEmptyThesis({ positiveArguments: ["A positive point."] });
    mockedGenerateCandidateRecommendations.mockResolvedValue([]);

    await deriveRecommendations("A very specific startup idea.", findings, criticalRisks, investmentThesis);

    // The exact, deterministic citable-evidence pool computeCitableEvidence()
    // must produce from these fixtures: the union of findings.evidence
    // (evidenceA) and criticalRisks.evidence (evidenceB) —
    // investmentThesis.supportingEvidence stays [] here, uncontributed.
    expect(mockedGenerateCandidateRecommendations).toHaveBeenCalledWith(
      "A very specific startup idea.",
      findings,
      criticalRisks,
      investmentThesis,
      [evidenceA, evidenceB]
    );
  });

  it("produces a real Recommendation for a candidate whose citations all resolve", async () => {
    const finding = buildFinding({ evidence: [buildEvidence("evidence-a")] });
    mockedGenerateCandidateRecommendations.mockResolvedValue([
      buildCandidate({ citedEvidenceIds: ["evidence-a"] }),
    ]);

    const result = await deriveRecommendations("A startup idea.", [finding], [], buildEmptyThesis());

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      category: "growth",
      priority: "high",
      reason: "A real, grounded recommendation.",
      confidence: 70,
    });
    expect(result[0]?.requiredEvidence).toEqual(["evidence-a"]);
  });

  it("produces a real Recommendation for every candidate when multiple are simultaneously valid, sorted by priority", async () => {
    const findingA = buildFinding({ evidence: [buildEvidence("evidence-a")] });
    const findingB = buildFinding({ id: "finding-2", evidence: [buildEvidence("evidence-b")] });
    mockedGenerateCandidateRecommendations.mockResolvedValue([
      buildCandidate({ summary: "Low-priority point.", priority: "low", citedEvidenceIds: ["evidence-a"] }),
      buildCandidate({ summary: "Urgent point.", priority: "urgent", citedEvidenceIds: ["evidence-b"] }),
    ]);

    const result = await deriveRecommendations("A startup idea.", [findingA, findingB], [], buildEmptyThesis());

    expect(result).toHaveLength(2);
    expect(result.map((recommendation) => recommendation.reason)).toEqual([
      "Urgent point.",
      "Low-priority point.",
    ]);
  });

  it("drops a candidate citing a real evidence id not referenced by any supplied finding, risk, or thesis argument", async () => {
    const finding = buildFinding({ evidence: [buildEvidence("evidence-a")] });
    // "evidence-unused" is a real, well-formed Evidence object, but it
    // was never cited by the finding above — it exists only in this
    // test's own local scope, standing in for "somewhere in the raw
    // aggregated pool," never passed to deriveRecommendations() at all.
    mockedGenerateCandidateRecommendations.mockResolvedValue([
      buildCandidate({ citedEvidenceIds: ["evidence-unused"] }),
    ]);

    const result = await deriveRecommendations("A startup idea.", [finding], [], buildEmptyThesis());

    expect(result).toEqual([]);
  });

  it("drops a candidate citing at least one unresolved evidence id, without failing the whole call", async () => {
    const finding = buildFinding({ evidence: [buildEvidence("evidence-a")] });
    mockedGenerateCandidateRecommendations.mockResolvedValue([
      buildCandidate({ summary: "Real recommendation.", citedEvidenceIds: ["evidence-a"] }),
      buildCandidate({ summary: "Fabricated recommendation.", citedEvidenceIds: ["does-not-exist"] }),
    ]);

    const result = await deriveRecommendations("A startup idea.", [finding], [], buildEmptyThesis());

    expect(result).toHaveLength(1);
    expect(result[0]?.reason).toBe("Real recommendation.");
  });

  it("returns [] when every candidate is rejected by traceability verification", async () => {
    const finding = buildFinding({ evidence: [buildEvidence("evidence-a")] });
    mockedGenerateCandidateRecommendations.mockResolvedValue([
      buildCandidate({ citedEvidenceIds: ["does-not-exist"] }),
    ]);

    const result = await deriveRecommendations("A startup idea.", [finding], [], buildEmptyThesis());

    expect(result).toEqual([]);
  });

  it("returns [] and logs, rather than throwing, when generation fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const finding = buildFinding({ evidence: [buildEvidence("evidence-a")] });
    mockedGenerateCandidateRecommendations.mockRejectedValue(new Error("OpenAI request failed."));

    const result = await deriveRecommendations("A startup idea.", [finding], [], buildEmptyThesis());

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
