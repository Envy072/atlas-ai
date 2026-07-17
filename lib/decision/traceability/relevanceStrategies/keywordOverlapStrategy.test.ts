import { describe, it, expect } from "vitest";
import { keywordOverlapStrategy } from "@/lib/decision/traceability/relevanceStrategies/keywordOverlapStrategy";
import type { CandidateClaim } from "@/lib/decision/schemas/candidateClaim.schema";
import type { Evidence } from "@/lib/research";

// keywordOverlapStrategy's own edge-case matrix (MILESTONE_40_DESIGN.md
// Section 6) — separate from claimVerifier.test.ts, which covers
// verifyClaim()'s composition/short-circuit behavior, not this
// strategy's own token-matching behavior. The goal stated in review is
// not perfect semantic understanding, but confidence this heuristic
// behaves predictably — several cases below deliberately assert a
// rejection that a human would consider a false positive (synonym,
// plural, abbreviation): those are documented, expected limitations of
// THIS strategy today, not bugs. A future RelevanceStrategy (embedding
// similarity, an LLM judge) is expected to change these specific
// outcomes without any change to verifyClaimRelevance()'s public
// signature or any of verifyClaim()'s five real call sites.

function buildEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "evidence-a",
    claim: "",
    evidence: "",
    confidence: 80,
    source: {
      id: "source_a",
      providerId: "tavily",
      sourceType: "search_engine",
      title: "Source A",
      url: "https://example.com/a",
      domain: "example.com",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      confidence: 80,
    },
    url: "https://example.com/a",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildClaim(summary: string): CandidateClaim {
  return { summary, citedEvidenceIds: ["evidence-a"] };
}

describe("keywordOverlapStrategy", () => {
  it("rejects the simulated Milestone 39 finding: real citation, wrong topic (meal kits vs. beauty boxes)", async () => {
    const claim = buildClaim("New parents have shown strong demand for weekly meal-kit deliveries.");
    const evidence = buildEvidence({
      claim: "Beauty box retention study",
      evidence: "Beauty box subscribers renew at a 68% rate after their first purchase.",
    });

    const outcome = await keywordOverlapStrategy(claim, [evidence]);

    expect(outcome.isRelevant).toBe(false);
    expect(outcome.reasonCode).toBe("LOW_RELEVANCE_SCORE");
  });

  describe("known keyword-strategy limitations — expected to change with future relevance strategies", () => {
    it("rejects a synonym pair the strategy cannot recognize as the same concept (physicians vs. doctors)", async () => {
      const claim = buildClaim("Physicians value accurate documentation.");
      const evidence = buildEvidence({ evidence: "Doctors prefer reliable records." });

      const outcome = await keywordOverlapStrategy(claim, [evidence]);

      expect(outcome.isRelevant).toBe(false);
      expect(outcome.reasonCode).toBe("LOW_RELEVANCE_SCORE");
    });

    it("rejects a plural/singular variant with no stemming (customer vs. customers)", async () => {
      const claim = buildClaim("Retention among the customer base was strong this quarter.");
      const evidence = buildEvidence({ evidence: "Customers stayed subscribed well beyond the industry average." });

      const outcome = await keywordOverlapStrategy(claim, [evidence]);

      expect(outcome.isRelevant).toBe(false);
      expect(outcome.reasonCode).toBe("LOW_RELEVANCE_SCORE");
    });

    it("rejects an abbreviation the strategy cannot expand (SaaS vs. software-as-a-service)", async () => {
      const claim = buildClaim("SaaS retention benchmarks support this pricing model.");
      const evidence = buildEvidence({ evidence: "Software-as-a-service churn rates vary widely by segment." });

      const outcome = await keywordOverlapStrategy(claim, [evidence]);

      expect(outcome.isRelevant).toBe(false);
      expect(outcome.reasonCode).toBe("LOW_RELEVANCE_SCORE");
    });
  });

  it("matches across punctuation differences once tokens are stripped correctly", async () => {
    const claim = buildClaim("Meal-kits, delivered! remain popular with new parents.");
    const evidence = buildEvidence({ evidence: "Meal kits are delivered weekly to busy households." });

    const outcome = await keywordOverlapStrategy(claim, [evidence]);

    expect(outcome.isRelevant).toBe(true);
    expect(outcome.reasonCode).toBeNull();
  });

  it("matches regardless of letter case", async () => {
    const claim = buildClaim("MEAL KITS are a growing category.");
    const evidence = buildEvidence({ evidence: "meal kits saw double-digit growth last year." });

    const outcome = await keywordOverlapStrategy(claim, [evidence]);

    expect(outcome.isRelevant).toBe(true);
  });

  it("rejects with EMPTY_SIGNIFICANT_TOKENS when the claim itself has no significant tokens", async () => {
    const claim = buildClaim("It is.");
    const evidence = buildEvidence({ evidence: "Meal kits saw strong growth among new parents." });

    const outcome = await keywordOverlapStrategy(claim, [evidence]);

    expect(outcome.isRelevant).toBe(false);
    expect(outcome.reasonCode).toBe("EMPTY_SIGNIFICANT_TOKENS");
  });

  it("rejects with EMPTY_SIGNIFICANT_TOKENS when the resolved evidence text is empty", async () => {
    const claim = buildClaim("Meal kits saw strong growth among new parents.");
    const evidence = buildEvidence({ claim: "", evidence: "   " });

    const outcome = await keywordOverlapStrategy(claim, [evidence]);

    expect(outcome.isRelevant).toBe(false);
    expect(outcome.reasonCode).toBe("EMPTY_SIGNIFICANT_TOKENS");
  });

  it("behaves identically when the same evidence item is duplicated in resolvedEvidence", async () => {
    const claim = buildClaim("Meal kits saw strong growth among new parents.");
    const evidence = buildEvidence({ evidence: "Meal kit subscriptions grew sharply among new parents." });

    const outcome = await keywordOverlapStrategy(claim, [evidence, evidence]);

    expect(outcome.isRelevant).toBe(true);
  });

  it("matches when only one of several resolved evidence items is topically relevant", async () => {
    const claim = buildClaim("Meal kits saw strong growth among new parents.");
    const irrelevantEvidence = buildEvidence({
      id: "evidence-b",
      evidence: "Beauty box subscriptions grew rapidly last year.",
    });
    const relevantEvidence = buildEvidence({
      id: "evidence-a",
      evidence: "Meal kit subscriptions grew sharply among new parents.",
    });

    const outcome = await keywordOverlapStrategy(claim, [irrelevantEvidence, relevantEvidence]);

    expect(outcome.isRelevant).toBe(true);
  });

  it("matches on an exact numeric token surviving punctuation-stripping (40% vs. 40 percent)", async () => {
    const claim = buildClaim("40% of respondents preferred the subscription tier.");
    const evidence = buildEvidence({ evidence: "Exactly 40 percent selected option B in the survey." });

    const outcome = await keywordOverlapStrategy(claim, [evidence]);

    expect(outcome.isRelevant).toBe(true);
  });
});
