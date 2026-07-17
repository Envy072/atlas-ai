import { describe, it, expect, vi, afterEach } from "vitest";
import type { Evidence } from "@/lib/research";
import type { CandidateFinding } from "@/lib/decision/schemas/candidateFinding.schema";

// deriveFindings()'s first-ever automated test
// (MILESTONE_34_DESIGN.md Deliverable 6), and incidentally
// buildFinding()'s first test (unmodified since Milestone 10, never
// tested until now). Mocks lib/services/openai.ts directly — one
// layer up from the OpenAI SDK itself, matching the same "mock the one
// thing this file talks to" philosophy used throughout this project.
// verifyClaimTraceability() (Milestone 33) and buildFinding()
// (Milestone 10) are both real, unmodified, and exercised for real
// here, not mocked.

vi.mock("@/lib/services/openai", () => ({ generateCandidateFindings: vi.fn() }));

import { generateCandidateFindings } from "@/lib/services/openai";
import { deriveFindings, buildFinding } from "@/lib/decision/findings/findingBuilder";

const mockedGenerateCandidateFindings = vi.mocked(generateCandidateFindings);

function buildEvidence(id: string): Evidence {
  return {
    id,
    claim: `Claim for ${id}`,
    evidence: `Supporting evidence for a real finding, from ${id}.`,
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

function buildCandidate(overrides: Partial<CandidateFinding> = {}): CandidateFinding {
  return {
    summary: "A real, grounded finding.",
    citedEvidenceIds: ["evidence-a"],
    category: "market",
    severity: "medium",
    confidence: 70,
    ...overrides,
  };
}

afterEach(() => {
  mockedGenerateCandidateFindings.mockReset();
});

describe("buildFinding", () => {
  it("constructs a schema-valid Finding", () => {
    const finding = buildFinding({
      category: "market",
      severity: "high",
      summary: "A real finding.",
      evidence: [buildEvidence("evidence-a")],
      confidence: 90,
    });

    expect(finding).toMatchObject({
      category: "market",
      severity: "high",
      summary: "A real finding.",
      confidence: 90,
    });
    expect(finding.id).toBeTruthy();
  });
});

describe("deriveFindings", () => {
  it("returns [] and never calls generateCandidateFindings when there is no evidence", async () => {
    const result = await deriveFindings("A startup idea.", []);

    expect(result).toEqual([]);
    expect(mockedGenerateCandidateFindings).not.toHaveBeenCalled();
  });

  it("calls generateCandidateFindings with exactly the startupIdea and evidence it received", async () => {
    const evidence = [buildEvidence("evidence-a")];
    mockedGenerateCandidateFindings.mockResolvedValue([]);

    await deriveFindings("A very specific startup idea.", evidence);

    expect(mockedGenerateCandidateFindings).toHaveBeenCalledWith("A very specific startup idea.", evidence);
  });

  it("produces a real Finding for a candidate whose citations all resolve", async () => {
    const evidenceA = buildEvidence("evidence-a");
    mockedGenerateCandidateFindings.mockResolvedValue([buildCandidate({ citedEvidenceIds: ["evidence-a"] })]);

    const result = await deriveFindings("A startup idea.", [evidenceA]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      category: "market",
      severity: "medium",
      summary: "A real, grounded finding.",
      confidence: 70,
    });
    expect(result[0]?.evidence).toEqual([evidenceA]);
  });

  it("produces a real Finding for every candidate when multiple are simultaneously valid", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    mockedGenerateCandidateFindings.mockResolvedValue([
      buildCandidate({ summary: "First finding.", citedEvidenceIds: ["evidence-a"] }),
      buildCandidate({ summary: "Second finding.", citedEvidenceIds: ["evidence-b"] }),
    ]);

    const result = await deriveFindings("A startup idea.", [evidenceA, evidenceB]);

    expect(result).toHaveLength(2);
    expect(result.map((finding) => finding.summary)).toEqual(["First finding.", "Second finding."]);
  });

  it("drops a candidate citing an unresolved evidence id, without failing the whole call", async () => {
    const evidenceA = buildEvidence("evidence-a");
    mockedGenerateCandidateFindings.mockResolvedValue([
      buildCandidate({ summary: "Real finding.", citedEvidenceIds: ["evidence-a"] }),
      buildCandidate({ summary: "Fabricated finding.", citedEvidenceIds: ["does-not-exist"] }),
    ]);

    const result = await deriveFindings("A startup idea.", [evidenceA]);

    expect(result).toHaveLength(1);
    expect(result[0]?.summary).toBe("Real finding.");
  });

  it("returns [] when every candidate is rejected by traceability verification", async () => {
    const evidenceA = buildEvidence("evidence-a");
    mockedGenerateCandidateFindings.mockResolvedValue([
      buildCandidate({ citedEvidenceIds: ["does-not-exist"] }),
    ]);

    const result = await deriveFindings("A startup idea.", [evidenceA]);

    expect(result).toEqual([]);
  });

  it("returns [] and logs, rather than throwing, when generation fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGenerateCandidateFindings.mockRejectedValue(new Error("OpenAI request failed."));

    const result = await deriveFindings("A startup idea.", [buildEvidence("evidence-a")]);

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
