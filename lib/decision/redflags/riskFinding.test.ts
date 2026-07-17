import { describe, it, expect, vi, afterEach } from "vitest";
import type { Evidence } from "@/lib/research";
import type { CandidateRisk } from "@/lib/decision/schemas/candidateRisk.schema";

// deriveCriticalRisks()'s first-ever automated test
// (MILESTONE_35_DESIGN.md Deliverable 5), and incidentally
// buildRiskFinding()'s first test (unmodified, never tested until
// now). Mocks lib/services/openai.ts directly — one layer up from the
// OpenAI SDK itself, mirroring findingBuilder.test.ts's own "mock the
// one thing this file talks to" philosophy exactly.
// verifyClaimTraceability() (Milestone 33) and buildRiskFinding() are
// both real, unmodified, and exercised for real here, not mocked.

vi.mock("@/lib/services/openai", () => ({ generateCandidateRisks: vi.fn() }));

import { generateCandidateRisks } from "@/lib/services/openai";
import { deriveCriticalRisks, buildRiskFinding } from "@/lib/decision/redflags/riskFinding";

const mockedGenerateCandidateRisks = vi.mocked(generateCandidateRisks);

function buildEvidence(id: string): Evidence {
  return {
    id,
    claim: `Claim for ${id}`,
    evidence: `Supporting evidence for a real risk, from ${id}.`,
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

function buildCandidate(overrides: Partial<CandidateRisk> = {}): CandidateRisk {
  return {
    summary: "A real, grounded risk.",
    citedEvidenceIds: ["evidence-a"],
    category: "market",
    severity: "high",
    confidence: 65,
    ...overrides,
  };
}

afterEach(() => {
  mockedGenerateCandidateRisks.mockReset();
});

describe("buildRiskFinding", () => {
  it("constructs a schema-valid RiskFinding", () => {
    const riskFinding = buildRiskFinding({
      category: "market",
      severity: "critical",
      summary: "A real risk.",
      evidence: [buildEvidence("evidence-a")],
      confidence: 90,
    });

    expect(riskFinding).toMatchObject({
      category: "market",
      severity: "critical",
      summary: "A real risk.",
      confidence: 90,
    });
    expect(riskFinding.id).toBeTruthy();
  });
});

describe("deriveCriticalRisks", () => {
  it("returns [] and never calls generateCandidateRisks when there is no evidence", async () => {
    const result = await deriveCriticalRisks("A startup idea.", []);

    expect(result).toEqual([]);
    expect(mockedGenerateCandidateRisks).not.toHaveBeenCalled();
  });

  it("calls generateCandidateRisks with exactly the startupIdea and evidence it received", async () => {
    const evidence = [buildEvidence("evidence-a")];
    mockedGenerateCandidateRisks.mockResolvedValue([]);

    await deriveCriticalRisks("A very specific startup idea.", evidence);

    expect(mockedGenerateCandidateRisks).toHaveBeenCalledWith("A very specific startup idea.", evidence);
  });

  it("produces a real RiskFinding for a candidate whose citations all resolve", async () => {
    const evidenceA = buildEvidence("evidence-a");
    mockedGenerateCandidateRisks.mockResolvedValue([buildCandidate({ citedEvidenceIds: ["evidence-a"] })]);

    const result = await deriveCriticalRisks("A startup idea.", [evidenceA]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      category: "market",
      severity: "high",
      summary: "A real, grounded risk.",
      confidence: 65,
    });
    expect(result[0]?.evidence).toEqual([evidenceA]);
  });

  it("produces a real RiskFinding for every candidate when multiple are simultaneously valid", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    mockedGenerateCandidateRisks.mockResolvedValue([
      buildCandidate({ summary: "First risk.", citedEvidenceIds: ["evidence-a"] }),
      buildCandidate({ summary: "Second risk.", citedEvidenceIds: ["evidence-b"] }),
    ]);

    const result = await deriveCriticalRisks("A startup idea.", [evidenceA, evidenceB]);

    expect(result).toHaveLength(2);
    expect(result.map((risk) => risk.summary)).toEqual(["First risk.", "Second risk."]);
  });

  it("drops a candidate citing an unresolved evidence id, without failing the whole call", async () => {
    const evidenceA = buildEvidence("evidence-a");
    mockedGenerateCandidateRisks.mockResolvedValue([
      buildCandidate({ summary: "Real risk.", citedEvidenceIds: ["evidence-a"] }),
      buildCandidate({ summary: "Fabricated risk.", citedEvidenceIds: ["does-not-exist"] }),
    ]);

    const result = await deriveCriticalRisks("A startup idea.", [evidenceA]);

    expect(result).toHaveLength(1);
    expect(result[0]?.summary).toBe("Real risk.");
  });

  it("returns [] when every candidate is rejected by traceability verification", async () => {
    const evidenceA = buildEvidence("evidence-a");
    mockedGenerateCandidateRisks.mockResolvedValue([
      buildCandidate({ citedEvidenceIds: ["does-not-exist"] }),
    ]);

    const result = await deriveCriticalRisks("A startup idea.", [evidenceA]);

    expect(result).toEqual([]);
  });

  it("returns [] and logs, rather than throwing, when generation fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGenerateCandidateRisks.mockRejectedValue(new Error("OpenAI request failed."));

    const result = await deriveCriticalRisks("A startup idea.", [buildEvidence("evidence-a")]);

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
