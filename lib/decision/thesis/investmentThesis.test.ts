import { describe, it, expect, vi, afterEach } from "vitest";
import type { Evidence } from "@/lib/research";
import type { CandidateThesisArgument } from "@/lib/decision/schemas/candidateThesisArgument.schema";

// deriveInvestmentThesis()'s first-ever automated test
// (MILESTONE_36_DESIGN.md Deliverable 6), and incidentally
// buildInvestmentThesis()'s first test (unmodified, never tested until
// now). Mocks lib/services/openai.ts directly — one layer up from the
// OpenAI SDK itself, mirroring findingBuilder.test.ts/riskFinding.test.ts's
// own "mock the one thing this file talks to" philosophy exactly.
// verifyClaimTraceability() (Milestone 33), buildInvestmentThesis(),
// and dedupeByKey() are all real, unmodified, and exercised for real
// here, not mocked.

vi.mock("@/lib/services/openai", () => ({ generateCandidateThesisArguments: vi.fn() }));

import { generateCandidateThesisArguments } from "@/lib/services/openai";
import { deriveInvestmentThesis, buildInvestmentThesis, deriveEmptyThesis } from "@/lib/decision/thesis/investmentThesis";

const mockedGenerateCandidateThesisArguments = vi.mocked(generateCandidateThesisArguments);

function buildEvidence(id: string): Evidence {
  return {
    id,
    claim: `Claim for ${id}`,
    evidence: `Supporting evidence: sources present a real argument and a clear point, though some disagree on details, for ${id}.`,
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

function buildCandidate(overrides: Partial<CandidateThesisArgument> = {}): CandidateThesisArgument {
  return {
    summary: "A real, grounded argument.",
    citedEvidenceIds: ["evidence-a"],
    kind: "positive",
    ...overrides,
  };
}

afterEach(() => {
  mockedGenerateCandidateThesisArguments.mockReset();
});

describe("buildInvestmentThesis", () => {
  it("constructs a schema-valid InvestmentThesis", () => {
    const thesis = buildInvestmentThesis({
      positiveArguments: ["A real positive argument."],
      negativeArguments: ["A real negative argument."],
      unknowns: ["A real unknown."],
      contradictions: ["A real contradiction."],
      supportingEvidence: [buildEvidence("evidence-a")],
    });

    expect(thesis).toEqual({
      positiveArguments: ["A real positive argument."],
      negativeArguments: ["A real negative argument."],
      unknowns: ["A real unknown."],
      contradictions: ["A real contradiction."],
      supportingEvidence: [buildEvidence("evidence-a")],
    });
  });

  it("defaults every field to [] when given no input", () => {
    expect(buildInvestmentThesis({})).toEqual(deriveEmptyThesis());
  });
});

describe("deriveInvestmentThesis", () => {
  it("returns deriveEmptyThesis()'s shape and never calls generateCandidateThesisArguments when there is no evidence", async () => {
    const result = await deriveInvestmentThesis("A startup idea.", []);

    expect(result).toEqual(deriveEmptyThesis());
    expect(mockedGenerateCandidateThesisArguments).not.toHaveBeenCalled();
  });

  it("calls generateCandidateThesisArguments with exactly the startupIdea and evidence it received", async () => {
    const evidence = [buildEvidence("evidence-a")];
    mockedGenerateCandidateThesisArguments.mockResolvedValue([]);

    await deriveInvestmentThesis("A very specific startup idea.", evidence);

    expect(mockedGenerateCandidateThesisArguments).toHaveBeenCalledWith("A very specific startup idea.", evidence);
  });

  it.each([
    ["positive", "positiveArguments"],
    ["negative", "negativeArguments"],
    ["unknown", "unknowns"],
    ["contradiction", "contradictions"],
  ] as const)("buckets a matched %s candidate into %s", async (kind, bucketKey) => {
    const evidenceA = buildEvidence("evidence-a");
    mockedGenerateCandidateThesisArguments.mockResolvedValue([
      buildCandidate({ kind, summary: `A real ${kind} argument.`, citedEvidenceIds: ["evidence-a"] }),
    ]);

    const result = await deriveInvestmentThesis("A startup idea.", [evidenceA]);

    expect(result[bucketKey]).toEqual([`A real ${kind} argument.`]);
    expect(result.supportingEvidence).toEqual([evidenceA]);
  });

  it("produces a real InvestmentThesis with each matched candidate in its correct array when kinds differ", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    mockedGenerateCandidateThesisArguments.mockResolvedValue([
      buildCandidate({ kind: "positive", summary: "A positive point.", citedEvidenceIds: ["evidence-a"] }),
      buildCandidate({ kind: "negative", summary: "A negative point.", citedEvidenceIds: ["evidence-b"] }),
    ]);

    const result = await deriveInvestmentThesis("A startup idea.", [evidenceA, evidenceB]);

    expect(result.positiveArguments).toEqual(["A positive point."]);
    expect(result.negativeArguments).toEqual(["A negative point."]);
    expect(result.unknowns).toEqual([]);
    expect(result.contradictions).toEqual([]);
  });

  // Added per Principal Architect Review, Minor Finding 3 — distinct
  // from the multi-kind case above: bucketing by kind alone doesn't by
  // itself prove order is preserved *within* a single bucket array.
  it("preserves the original relative order of multiple matched candidates of the identical kind", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    mockedGenerateCandidateThesisArguments.mockResolvedValue([
      buildCandidate({ kind: "positive", summary: "First positive point.", citedEvidenceIds: ["evidence-a"] }),
      buildCandidate({ kind: "positive", summary: "Second positive point.", citedEvidenceIds: ["evidence-b"] }),
    ]);

    const result = await deriveInvestmentThesis("A startup idea.", [evidenceA, evidenceB]);

    expect(result.positiveArguments).toEqual(["First positive point.", "Second positive point."]);
  });

  it("produces a deduplicated supportingEvidence when two matched arguments cite overlapping evidence ids", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    mockedGenerateCandidateThesisArguments.mockResolvedValue([
      buildCandidate({ kind: "positive", summary: "First point.", citedEvidenceIds: ["evidence-a", "evidence-b"] }),
      buildCandidate({ kind: "negative", summary: "Second point.", citedEvidenceIds: ["evidence-b"] }),
    ]);

    const result = await deriveInvestmentThesis("A startup idea.", [evidenceA, evidenceB]);

    expect(result.supportingEvidence).toEqual([evidenceA, evidenceB]);
  });

  // Added per Principal Architect Review, Suggestion 1 — directly
  // demonstrates the design's own claim that a contradiction is "by
  // definition" about two or more cited pieces of evidence.
  it("resolves both cited evidence ids of a single contradiction candidate into supportingEvidence", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    mockedGenerateCandidateThesisArguments.mockResolvedValue([
      buildCandidate({
        kind: "contradiction",
        summary: "Two sources disagree.",
        citedEvidenceIds: ["evidence-a", "evidence-b"],
      }),
    ]);

    const result = await deriveInvestmentThesis("A startup idea.", [evidenceA, evidenceB]);

    expect(result.contradictions).toEqual(["Two sources disagree."]);
    expect(result.supportingEvidence).toEqual([evidenceA, evidenceB]);
  });

  it("drops a candidate citing an unresolved evidence id, without failing the whole call", async () => {
    const evidenceA = buildEvidence("evidence-a");
    mockedGenerateCandidateThesisArguments.mockResolvedValue([
      buildCandidate({ kind: "positive", summary: "Real point.", citedEvidenceIds: ["evidence-a"] }),
      buildCandidate({ kind: "negative", summary: "Fabricated point.", citedEvidenceIds: ["does-not-exist"] }),
    ]);

    const result = await deriveInvestmentThesis("A startup idea.", [evidenceA]);

    expect(result.positiveArguments).toEqual(["Real point."]);
    expect(result.negativeArguments).toEqual([]);
  });

  it("returns deriveEmptyThesis()'s shape when every candidate is rejected by traceability verification", async () => {
    const evidenceA = buildEvidence("evidence-a");
    mockedGenerateCandidateThesisArguments.mockResolvedValue([
      buildCandidate({ citedEvidenceIds: ["does-not-exist"] }),
    ]);

    const result = await deriveInvestmentThesis("A startup idea.", [evidenceA]);

    expect(result).toEqual(deriveEmptyThesis());
  });

  it("returns deriveEmptyThesis()'s shape and logs, rather than throwing, when generation fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGenerateCandidateThesisArguments.mockRejectedValue(new Error("OpenAI request failed."));

    const result = await deriveInvestmentThesis("A startup idea.", [buildEvidence("evidence-a")]);

    expect(result).toEqual(deriveEmptyThesis());
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
