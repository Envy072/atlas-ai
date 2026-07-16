import { describe, it, expect } from "vitest";
import { verifyClaimTraceability } from "@/lib/decision/traceability/claimVerifier";
import { CandidateClaimSchema } from "@/lib/decision/schemas/candidateClaim.schema";
import type { CandidateClaim } from "@/lib/decision/schemas/candidateClaim.schema";
import type { Evidence } from "@/lib/research";

// verifyClaimTraceability's first-ever automated test
// (MILESTONE_33_DESIGN.md Deliverable 3) — the full Acceptance
// Criteria suite (Section 13). This function has zero real callers
// today (Milestone 34+ is the first) — every case here is exhaustive
// by design, matching this milestone's own "highest risk" framing
// (Section 12).

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

function buildClaim(citedEvidenceIds: string[], summary = "A candidate claim."): CandidateClaim {
  return { summary, citedEvidenceIds };
}

describe("verifyClaimTraceability", () => {
  it("matches a claim whose cited evidence ids all resolve", () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    const claim = buildClaim(["evidence-a", "evidence-b"]);

    const result = verifyClaimTraceability(claim, [evidenceA, evidenceB]);

    expect(result.status).toBe("matched");
    expect(result.resolvedEvidence).toEqual([evidenceA, evidenceB]);
  });

  it("rejects a claim citing zero evidence ids — missing evidence — without attempting any lookup", () => {
    const claim = buildClaim([]);

    const result = verifyClaimTraceability(claim, [buildEvidence("evidence-a")]);

    expect(result.status).toBe("rejected");
    expect(result.resolvedEvidence).toEqual([]);
    expect(result.reason).toMatch(/no evidence cited/i);
  });

  it("rejects a claim whose cited ids are all unresolved (invalid id, fully unresolved)", () => {
    const claim = buildClaim(["does-not-exist"]);

    const result = verifyClaimTraceability(claim, [buildEvidence("evidence-a")]);

    expect(result.status).toBe("rejected");
    expect(result.resolvedEvidence).toEqual([]);
  });

  it("rejects a claim citing a mix of real and non-existent ids — fails closed, not partial credit (invalid id, partially unresolved)", () => {
    const evidenceA = buildEvidence("evidence-a");
    const claim = buildClaim(["evidence-a", "does-not-exist"]);

    const result = verifyClaimTraceability(claim, [evidenceA]);

    expect(result.status).toBe("rejected");
    expect(result.resolvedEvidence).toEqual([]);
  });

  it("rejects any cited id against a completely empty evidence pool", () => {
    const claim = buildClaim(["evidence-a"]);

    const result = verifyClaimTraceability(claim, []);

    expect(result.status).toBe("rejected");
  });

  it("deduplicates a citation repeated more than once, returning exactly one resolved entry", () => {
    const evidenceA = buildEvidence("evidence-a");
    const claim = buildClaim(["evidence-a", "evidence-a"]);

    const result = verifyClaimTraceability(claim, [evidenceA]);

    expect(result.status).toBe("matched");
    expect(result.resolvedEvidence).toHaveLength(1);
  });

  it("preserves citation order in resolvedEvidence, independent of the evidence pool's own order", () => {
    const evidenceA = buildEvidence("evidence-a");
    const evidenceB = buildEvidence("evidence-b");
    // Evidence pool ordered B, A — the opposite of the citation order.
    const claim = buildClaim(["evidence-b", "evidence-a"]);

    const result = verifyClaimTraceability(claim, [evidenceA, evidenceB]);

    expect(result.resolvedEvidence).toEqual([evidenceB, evidenceA]);
  });

  it("fails closed on an id that differs only by case — no fuzzy or case-insensitive matching", () => {
    const evidenceA = buildEvidence("evidence-a");
    const claim = buildClaim(["Evidence-A"]);

    const result = verifyClaimTraceability(claim, [evidenceA]);

    expect(result.status).toBe("rejected");
  });

  it("distinguishes an empty citation list from a citation list containing an empty string — both reject, for different reasons", () => {
    const evidenceA = buildEvidence("evidence-a");

    const noCitations = verifyClaimTraceability(buildClaim([]), [evidenceA]);
    const blankCitation = verifyClaimTraceability(buildClaim([""]), [evidenceA]);

    expect(noCitations.status).toBe("rejected");
    expect(noCitations.reason).toMatch(/no evidence cited/i);

    expect(blankCitation.status).toBe("rejected");
    expect(blankCitation.reason).toMatch(/does not resolve/i);

    // Same final status, but reached via genuinely different code paths —
    // an empty array never attempts a lookup at all, while an array
    // containing an empty string attempts (and fails) exactly one.
    expect(noCitations.reason).not.toBe(blankCitation.reason);
  });
});

describe("CandidateClaimSchema", () => {
  it("accepts a structurally valid candidate claim", () => {
    const result = CandidateClaimSchema.safeParse({
      summary: "A real claim.",
      citedEvidenceIds: ["evidence-a"],
    });

    expect(result.success).toBe(true);
  });

  it("accepts an empty citedEvidenceIds array as structurally valid (rejected later by verifyClaimTraceability, not by the schema)", () => {
    const result = CandidateClaimSchema.safeParse({
      summary: "A real claim.",
      citedEvidenceIds: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty summary", () => {
    const result = CandidateClaimSchema.safeParse({
      summary: "",
      citedEvidenceIds: ["evidence-a"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects citedEvidenceIds containing a non-string", () => {
    const result = CandidateClaimSchema.safeParse({
      summary: "A real claim.",
      citedEvidenceIds: ["evidence-a", 123],
    });

    expect(result.success).toBe(false);
  });
});
