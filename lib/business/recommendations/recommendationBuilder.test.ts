import { describe, it, expect } from "vitest";
import { buildRecommendation } from "@/lib/business/recommendations/recommendationBuilder";

// Milestone 57 — verifies this file's actual, current construction
// behavior: buildRecommendation is the one place a real Recommendation
// gets constructed and schema-validated. Its process-local id-counter
// pattern (recommendation_${Date.now()}_${counter}) is the same one
// already identified in businessProfileBuilder.ts (Milestone 55's
// reflection) — not re-analyzed here.
describe("buildRecommendation", () => {
  it("threads through category/priority/reason/confidence", () => {
    const recommendation = buildRecommendation({
      category: "pricing",
      priority: "high",
      reason: "Current pricing is below comparable competitors' entry tiers.",
      confidence: 70,
    });

    expect(recommendation.category).toBe("pricing");
    expect(recommendation.priority).toBe("high");
    expect(recommendation.reason).toBe("Current pricing is below comparable competitors' entry tiers.");
    expect(recommendation.confidence).toBe(70);
  });

  it("defaults requiredEvidence to an empty array when omitted", () => {
    const recommendation = buildRecommendation({
      category: "growth",
      priority: "medium",
      reason: "Expansion opportunity identified.",
      confidence: 60,
    });

    expect(recommendation.requiredEvidence).toEqual([]);
  });

  it("threads through requiredEvidence when provided", () => {
    const recommendation = buildRecommendation({
      category: "growth",
      priority: "medium",
      reason: "Expansion opportunity identified.",
      requiredEvidence: ["evidence_1", "evidence_2"],
      confidence: 60,
    });

    expect(recommendation.requiredEvidence).toEqual(["evidence_1", "evidence_2"]);
  });

  it("generates a unique id on every call", () => {
    const input = { category: "growth" as const, priority: "medium" as const, reason: "Reason", confidence: 50 };
    const a = buildRecommendation(input);
    const b = buildRecommendation(input);

    expect(a.id).not.toBe(b.id);
  });
});
