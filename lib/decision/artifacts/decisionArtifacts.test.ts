import { describe, it, expect, vi, afterEach } from "vitest";
import type { Recommendation } from "@/lib/business";
import type { DecisionVerdict } from "@/lib/decision/schemas/verdict.schema";
import { buildDecisionProfileFixture } from "@/tests/fixtures";

// buildDecisionArtifacts()'s first-ever automated test
// (MILESTONE_38_DESIGN.md Deliverable 11) — the one shared computation
// point Resolution A (Principal Architect Review, Major Finding 1)
// introduced. Mocks deriveRecommendations()/deriveVerdict() directly,
// one layer above their own already-tested internals (both have their
// own dedicated suites — recommendationGenerator.test.ts,
// decisionVerdict.test.ts — that exercise their real logic; this suite
// only proves buildDecisionArtifacts() orchestrates them correctly).

vi.mock("@/lib/decision/recommendations/recommendationGenerator", () => ({
  deriveRecommendations: vi.fn(),
}));
vi.mock("@/lib/decision/verdict/decisionVerdict", () => ({ deriveVerdict: vi.fn() }));

import { deriveRecommendations } from "@/lib/decision/recommendations/recommendationGenerator";
import { deriveVerdict } from "@/lib/decision/verdict/decisionVerdict";
import { buildDecisionArtifacts } from "@/lib/decision/artifacts/decisionArtifacts";

const mockedDeriveRecommendations = vi.mocked(deriveRecommendations);
const mockedDeriveVerdict = vi.mocked(deriveVerdict);

function buildRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "recommendation-1",
    category: "growth",
    priority: "high",
    reason: "A real recommendation.",
    requiredEvidence: [],
    confidence: 70,
    ...overrides,
  };
}

function buildVerdict(overrides: Partial<DecisionVerdict> = {}): DecisionVerdict {
  return {
    category: "pursue",
    summary: "A real verdict.",
    confidence: 80,
    supportingEvidence: [],
    ...overrides,
  };
}

afterEach(() => {
  mockedDeriveRecommendations.mockReset();
  mockedDeriveVerdict.mockReset();
});

describe("buildDecisionArtifacts", () => {
  it("calls deriveRecommendations() then deriveVerdict(), in that order, exactly once each", async () => {
    const profile = buildDecisionProfileFixture();
    const callOrder: string[] = [];
    mockedDeriveRecommendations.mockImplementation(async () => {
      callOrder.push("deriveRecommendations");
      return [];
    });
    mockedDeriveVerdict.mockImplementation(async () => {
      callOrder.push("deriveVerdict");
      return undefined;
    });

    await buildDecisionArtifacts(profile);

    expect(callOrder).toEqual(["deriveRecommendations", "deriveVerdict"]);
    expect(mockedDeriveRecommendations).toHaveBeenCalledTimes(1);
    expect(mockedDeriveVerdict).toHaveBeenCalledTimes(1);
  });

  it("calls deriveRecommendations() with exactly the profile's own startupIdea, keyFindings, criticalRisks, and investmentThesis", async () => {
    const profile = buildDecisionProfileFixture();
    mockedDeriveRecommendations.mockResolvedValue([]);
    mockedDeriveVerdict.mockResolvedValue(undefined);

    await buildDecisionArtifacts(profile);

    expect(mockedDeriveRecommendations).toHaveBeenCalledWith(
      profile.decisionContext.startupIdea,
      profile.keyFindings,
      profile.criticalRisks,
      profile.investmentThesis
    );
  });

  it("calls deriveVerdict() with exactly the recommendations this same call produced, not a stale or independently-sourced list", async () => {
    const profile = buildDecisionProfileFixture();
    const recommendations = [buildRecommendation({ id: "r1" }), buildRecommendation({ id: "r2" })];
    mockedDeriveRecommendations.mockResolvedValue(recommendations);
    mockedDeriveVerdict.mockResolvedValue(undefined);

    await buildDecisionArtifacts(profile);

    expect(mockedDeriveVerdict).toHaveBeenCalledWith(
      profile.decisionContext.startupIdea,
      profile.keyFindings,
      profile.criticalRisks,
      profile.investmentThesis,
      recommendations,
      profile.confidenceSummary
    );
  });

  it("returns both the real recommendations and the real verdict together", async () => {
    const profile = buildDecisionProfileFixture();
    const recommendations = [buildRecommendation()];
    const verdict = buildVerdict();
    mockedDeriveRecommendations.mockResolvedValue(recommendations);
    mockedDeriveVerdict.mockResolvedValue(verdict);

    const result = await buildDecisionArtifacts(profile);

    expect(result).toEqual({ recommendations, verdict });
  });

  it("passes an undefined verdict through unchanged rather than coercing it into a fallback value", async () => {
    const profile = buildDecisionProfileFixture();
    mockedDeriveRecommendations.mockResolvedValue([]);
    mockedDeriveVerdict.mockResolvedValue(undefined);

    const result = await buildDecisionArtifacts(profile);

    expect(result).toEqual({ recommendations: [], verdict: undefined });
  });

  it("passes an empty recommendations list through unchanged", async () => {
    const profile = buildDecisionProfileFixture();
    const verdict = buildVerdict();
    mockedDeriveRecommendations.mockResolvedValue([]);
    mockedDeriveVerdict.mockResolvedValue(verdict);

    const result = await buildDecisionArtifacts(profile);

    expect(result).toEqual({ recommendations: [], verdict });
  });
});
