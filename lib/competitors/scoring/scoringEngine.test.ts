import { describe, it, expect } from "vitest";
import { scoreCompany } from "@/lib/competitors/scoring/scoringEngine";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

function buildProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    id: "company_1",
    name: "Acme",
    aliases: [],
    features: [],
    technology: [],
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
    sources: [],
    evidence: [],
    confidence: 50,
    refresh: {
      lastUpdated: "2026-01-01T00:00:00.000Z",
      nextRefresh: "2026-01-31T00:00:00.000Z",
      refreshReason: "initial_discovery",
      refreshPriority: "normal",
    },
    ...overrides,
  };
}

// Milestone 52 — scoringDimensions.ts is explicitly "ARCHITECTURE ONLY":
// every dimension scorer currently returns a fixed neutral placeholder of
// 50, regardless of the profile passed in. These tests verify today's
// actual composed output (all dimensions at 50, overall at 50), not a
// hypothetical future scoring model.
describe("scoreCompany", () => {
  it("returns an overallScore of 50, composed from eight equally-weighted placeholder dimensions", () => {
    const score = scoreCompany(buildProfile());

    expect(score.overallScore).toBe(50);
    expect(score.dimensions).toHaveLength(8);
    for (const dimension of score.dimensions) {
      expect(dimension.score).toBe(50);
    }
  });

  it("produces the same overallScore regardless of the profile's own field values", () => {
    const sparse = scoreCompany(buildProfile());
    const rich = scoreCompany(
      buildProfile({
        features: ["A", "B", "C"],
        strengths: ["Strong brand"],
        confidence: 95,
      })
    );

    expect(rich.overallScore).toBe(sparse.overallScore);
  });

  it("sets companyId from the profile's id", () => {
    const score = scoreCompany(buildProfile({ id: "company_42" }));
    expect(score.companyId).toBe("company_42");
  });

  it("uses the provided `now` for scoredAt, defaulting to the current time when omitted", () => {
    const now = new Date("2026-03-01T00:00:00.000Z");
    const scoredWithNow = scoreCompany(buildProfile(), now);
    expect(scoredWithNow.scoredAt).toBe(now.toISOString());

    const before = Date.now();
    const scoredDefault = scoreCompany(buildProfile());
    const after = Date.now();
    const scoredAtMs = Date.parse(scoredDefault.scoredAt);

    expect(scoredAtMs).toBeGreaterThanOrEqual(before);
    expect(scoredAtMs).toBeLessThanOrEqual(after);
  });
});
