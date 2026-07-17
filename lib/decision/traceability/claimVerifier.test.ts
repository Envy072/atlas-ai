import { describe, it, expect } from "vitest";
import {
  verifyClaimTraceability,
  verifyClaim,
  verifyClaimRelevance,
  tallyClaimVerificationResults,
} from "@/lib/decision/traceability/claimVerifier";
import type { ClaimVerificationResult, RelevanceStrategy } from "@/lib/decision/traceability/claimVerifier";
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

describe("verifyClaimTraceability reasonCode population (Milestone 40 addition)", () => {
  it("populates EMPTY_CITATIONS when citedEvidenceIds is empty", () => {
    const result = verifyClaimTraceability(buildClaim([]), [buildEvidence("evidence-a")]);

    expect(result.reasonCode).toBe("EMPTY_CITATIONS");
  });

  it("populates TRACEABILITY_FAILED when a cited id does not resolve", () => {
    const result = verifyClaimTraceability(buildClaim(["does-not-exist"]), [buildEvidence("evidence-a")]);

    expect(result.reasonCode).toBe("TRACEABILITY_FAILED");
  });

  it("leaves reasonCode undefined on a match", () => {
    const evidenceA = buildEvidence("evidence-a");
    const result = verifyClaimTraceability(buildClaim(["evidence-a"]), [evidenceA]);

    expect(result.reasonCode).toBeUndefined();
  });
});

// A fake RelevanceStrategy, injected via verifyClaim()'s optional third
// parameter — real call sites never pass one; this exists solely so
// verifyClaim()'s own composition/short-circuit logic can be tested
// independently of keywordOverlapStrategy's real token-matching
// behavior (which has its own dedicated test file).
function alwaysRelevant(): RelevanceStrategy {
  return async () => ({ isRelevant: true, reasonCode: null });
}

function alwaysIrrelevant(reasonCode: ClaimVerificationResult["reasonCode"]): RelevanceStrategy {
  return async () => ({ isRelevant: false, reasonCode: reasonCode ?? null });
}

const irrelevantWithoutSpecificReason: RelevanceStrategy = async () => ({ isRelevant: false, reasonCode: null });

describe("verifyClaim (Milestone 40 composing entry point)", () => {
  it("short-circuits on traceability rejection, never invoking the relevance strategy", async () => {
    let relevanceStrategyCalled = false;
    const strategy: RelevanceStrategy = async () => {
      relevanceStrategyCalled = true;
      return { isRelevant: true, reasonCode: null };
    };

    const result = await verifyClaim(buildClaim(["does-not-exist"]), [buildEvidence("evidence-a")], strategy);

    expect(result.status).toBe("rejected");
    expect(result.reasonCode).toBe("TRACEABILITY_FAILED");
    expect(relevanceStrategyCalled).toBe(false);
  });

  it("rejects when traceability matches but relevance does not, discarding resolvedEvidence", async () => {
    const evidenceA = buildEvidence("evidence-a");

    const result = await verifyClaim(buildClaim(["evidence-a"]), [evidenceA], alwaysIrrelevant("LOW_RELEVANCE_SCORE"));

    expect(result.status).toBe("rejected");
    expect(result.reasonCode).toBe("LOW_RELEVANCE_SCORE");
    expect(result.resolvedEvidence).toEqual([]);
  });

  it("falls back to RELEVANCE_FAILED when a strategy rejects without a specific reasonCode", async () => {
    const evidenceA = buildEvidence("evidence-a");

    const result = await verifyClaim(buildClaim(["evidence-a"]), [evidenceA], irrelevantWithoutSpecificReason);

    expect(result.reasonCode).toBe("RELEVANCE_FAILED");
  });

  it("matches when both traceability and relevance pass", async () => {
    const evidenceA = buildEvidence("evidence-a");

    const result = await verifyClaim(buildClaim(["evidence-a"]), [evidenceA], alwaysRelevant());

    expect(result.status).toBe("matched");
    expect(result.resolvedEvidence).toEqual([evidenceA]);
  });

  it("uses the real keywordOverlapStrategy by default when no strategy is injected", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const claim = buildClaim(["evidence-a"], "Something entirely about Supporting text for evidence-a.");

    const result = await verifyClaim(claim, [evidenceA]);

    expect(result.status).toBe("matched");
  });

  it("reproduces and closes the simulated Milestone 39 incident: real citation, wrong topic", async () => {
    const mealKitEvidence: Evidence = {
      id: "evidence-mealkit",
      claim: "Beauty box retention study",
      evidence: "Beauty box subscribers renew at a 68% rate after their first purchase.",
      confidence: 80,
      source: {
        id: "source_mealkit",
        providerId: "tavily",
        sourceType: "search_engine",
        title: "Beauty box retention study",
        url: "https://example.com/beauty-box-study",
        domain: "example.com",
        retrievedAt: "2026-01-01T00:00:00.000Z",
        confidence: 80,
      },
      url: "https://example.com/beauty-box-study",
      retrievedAt: "2026-01-01T00:00:00.000Z",
    };
    const claim = buildClaim(
      ["evidence-mealkit"],
      "New parents have shown strong demand for weekly meal-kit deliveries."
    );

    // The prior gap, made concrete: traceability alone accepts this,
    // because the citation genuinely resolves.
    const traceabilityOnly = verifyClaimTraceability(claim, [mealKitEvidence]);
    expect(traceabilityOnly.status).toBe("matched");

    // verifyClaim() — traceability + relevance — correctly rejects it.
    const fullVerification = await verifyClaim(claim, [mealKitEvidence]);
    expect(fullVerification.status).toBe("rejected");
    expect(fullVerification.reasonCode).toBe("LOW_RELEVANCE_SCORE");
  });
});

describe("verifyClaimRelevance", () => {
  it("returns a RelevanceOutcome only — not a ClaimVerificationResult", async () => {
    const outcome = await verifyClaimRelevance(buildClaim(["evidence-a"]), [buildEvidence("evidence-a")], alwaysRelevant());

    expect(outcome).toEqual({ isRelevant: true, reasonCode: null });
    expect(outcome).not.toHaveProperty("status");
    expect(outcome).not.toHaveProperty("resolvedEvidence");
  });

  it("defaults to keywordOverlapStrategy when no strategy is supplied", async () => {
    const evidenceA = buildEvidence("evidence-a");
    const outcome = await verifyClaimRelevance(
      buildClaim(["evidence-a"], "Something entirely about Supporting text for evidence-a."),
      [evidenceA]
    );

    expect(outcome.isRelevant).toBe(true);
  });
});

describe("tallyClaimVerificationResults", () => {
  function matched(): ClaimVerificationResult {
    return { status: "matched", resolvedEvidence: [buildEvidence("evidence-a")] };
  }

  function rejectedBy(reasonCode: NonNullable<ClaimVerificationResult["reasonCode"]>): ClaimVerificationResult {
    return { status: "rejected", resolvedEvidence: [], reasonCode };
  }

  it("returns all zeros for an empty result set", () => {
    expect(tallyClaimVerificationResults([])).toEqual({
      claimsEvaluated: 0,
      accepted: 0,
      rejectedByTraceability: 0,
      rejectedByRelevance: 0,
    });
  });

  it("buckets accepted, traceability-rejected, and relevance-rejected results correctly", () => {
    const results: ClaimVerificationResult[] = [
      matched(),
      matched(),
      rejectedBy("EMPTY_CITATIONS"),
      rejectedBy("TRACEABILITY_FAILED"),
      rejectedBy("RELEVANCE_FAILED"),
      rejectedBy("EMPTY_SIGNIFICANT_TOKENS"),
      rejectedBy("LOW_RELEVANCE_SCORE"),
    ];

    expect(tallyClaimVerificationResults(results)).toEqual({
      claimsEvaluated: 7,
      accepted: 2,
      rejectedByTraceability: 2,
      rejectedByRelevance: 3,
    });
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
