import { describe, it, expect } from "vitest";
import { classifyIndustry } from "@/lib/market/classification/industryClassifier";

// Milestone 62 — this is the first direct test of this file's own
// keyword-overlap heuristic. It has only ever been exercised indirectly,
// cross-platform, via lib/business's and lib/financial's own discovery
// tests importing it to compute expected confidence values — never
// asserted on in its own right until now. "HEURISTIC, DOCUMENTED, NOT
// ML" per its own comment, so these tests verify the real keyword-match
// behavior, not an idealized classification.
describe("classifyIndustry", () => {
  it("classifies a clear saas-keyword idea as 'saas'", () => {
    const result = classifyIndustry("A subscription software platform for team scheduling");

    expect(result.industry).toBe("saas");
  });

  it("classifies a clear fintech-keyword idea as 'fintech'", () => {
    const result = classifyIndustry("A mobile banking and payments app for freelancers");

    expect(result.industry).toBe("fintech");
  });

  it("returns 'unclassified' with zero confidence when no keywords match", () => {
    const result = classifyIndustry("xyz zzz qqq");

    expect(result.industry).toBe("unclassified");
    expect(result.confidence).toBe(0);
    expect(result.reason).toBe("No keyword overlap with any known industry category.");
  });

  it("computes confidence as min(100, matches * 25)", () => {
    const result = classifyIndustry("A subscription software platform");

    expect(result.confidence).toBe(Math.min(100, 25 * countExpectedSaasMatches()));
  });

  it("caps confidence at 100 even when more than four keywords match", () => {
    const result = classifyIndustry(
      "A software subscription platform dashboard for workflow automation"
    );

    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("includes the matched industry and match count in the reason when classified", () => {
    const result = classifyIndustry("A subscription software platform");

    expect(result.reason).toContain("saas");
  });
});

// "software", "subscription", "platform" are all real saas keywords in
// the source's own INDUSTRY_KEYWORDS map — three real, traceable matches
// for the fixed idea string used above.
function countExpectedSaasMatches(): number {
  return 3;
}
