import { describe, it, expect, vi } from "vitest";
import { decisionStage } from "@/lib/pipeline/stages/decision";
import type { RankedSource, ResearchResult } from "@/lib/research";

// Milestone 90 — decisionStage's wrapped function, synthesizeDecision, has
// twelve dependencies: runResearch (the one true external boundary) plus
// eleven real, in-process functions across five sibling platforms and
// lib/decision's own internal synthesis layer. Mocking only runResearch
// lets the entire real chain run. Two of those eleven collaborators
// (buildDecisionProfile, aggregateEvidence) have no dedicated test file of
// their own — this is the first dedicated exercise within this test series
// of their behavior, indirectly, through this stage wrapper.
const { runResearchMock } = vi.hoisted(() => ({ runResearchMock: vi.fn() }));

vi.mock("@/lib/research", async () => {
  const actual = await vi.importActual<typeof import("@/lib/research")>("@/lib/research");
  return { ...actual, runResearch: runResearchMock };
});

function buildRankedSource(overrides: Partial<RankedSource> = {}): RankedSource {
  return {
    id: "source_1",
    providerId: "tavily",
    sourceType: "company_website",
    title: "Acme",
    url: "https://acme.com",
    domain: "acme.com",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    confidence: 80,
    score: 80,
    factors: { authority: 50, freshness: 50, relevance: 50, trust: 50, sourceQuality: 50 },
    ...overrides,
  };
}

function buildResearchResult(overrides: Partial<ResearchResult> = {}): ResearchResult {
  return {
    request: { topic: "placeholder" },
    sources: [],
    evidence: [],
    providerResults: [],
    providerSummary: [],
    sourceSummary: { totalSources: 0, uniqueDomains: 0, averageConfidence: null, bySourceType: [] },
    searchStatistics: {
      providersQueried: 0,
      providersSucceeded: 0,
      providersFailed: 0,
      totalLatencyMs: 0,
      fallbackTriggered: false,
    },
    generatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("decisionStage", () => {
  it("has the name 'decision'", () => {
    expect(decisionStage.name).toBe("decision");
  });

  it("passes the startupIdea through to synthesizeDecision's request", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    const result = await decisionStage.run("A subscription software platform for team scheduling", "execution-1");

    expect(result.request).toEqual({ startupIdea: "A subscription software platform for team scheduling" });
  });

  it("returns a real, schema-valid DecisionProfile when research finds no sources", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await decisionStage.run("A subscription software platform for team scheduling", "execution-2");

    expect(result.profile).toBeDefined();
    expect(result.profile.decisionContext.startupIdea).toBe(
      "A subscription software platform for team scheduling"
    );
  });

  it("returns a real, schema-valid DecisionProfile when research finds real sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await decisionStage.run("An idea", "execution-3");

    expect(result.profile.decisionContext.competitorCount).toBeGreaterThanOrEqual(0);
    expect(result.profile.marketProfile).toBeDefined();
    expect(result.profile.financialProfile).toBeDefined();
    expect(result.profile.businessProfile).toBeDefined();
  });

  it("aggregates sources and evidence across every consumed platform via the real aggregateEvidence", async () => {
    const evidence = [
      {
        id: "evidence_1",
        claim: "The market is growing",
        evidence: "An industry report cites double-digit growth.",
        confidence: 70,
        source: {
          id: "source_1",
          providerId: "tavily" as const,
          sourceType: "search_engine" as const,
          title: "Industry report",
          url: "https://example.com/report",
          domain: "example.com",
          retrievedAt: "2026-01-01T00:00:00.000Z",
          confidence: 80,
        },
        url: "https://example.com/report",
        retrievedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [], evidence }));

    const result = await decisionStage.run("An idea", "execution-4");

    expect(result.profile.evidence.length).toBeGreaterThanOrEqual(1);
  });

  // Milestone 116 — closes Milestone 114's Critical Finding #1 (cross-
  // analysis knowledge contamination). Deliberately does NOT mock
  // resolveMarketKnowledge()/resolveCompetitorKnowledge(): this exercises
  // the real resolvers against the real, shared, module-level
  // defaultMarketStore/defaultCompetitorStore singletons — the exact
  // production wiring path — so this proves isolation is enforced by the
  // store itself, not by a test double that assumes it.
  describe("cross-analysis isolation (Milestone 116)", () => {
    it("never lets two different executions' market evidence merge, even when both classify into the same industry", async () => {
      const evidenceA = buildRankedSource({
        id: "source_execution_a",
        title: "Execution A's own distinctive source",
        url: "https://execution-a-only.example.com",
      });
      const evidenceB = buildRankedSource({
        id: "source_execution_b",
        title: "Execution B's own distinctive source",
        url: "https://execution-b-only.example.com",
      });

      // Both ideas contain "subscription" and "platform" — both keywords
      // in industryClassifier.ts's own "saas" bucket — so, under the
      // pre-Milestone-116 design, both would classify into the exact same
      // global "saas" knowledge-base entry and merge each other's
      // evidence. Two different, unrelated startup ideas that happen to
      // share a classifier keyword.
      runResearchMock.mockResolvedValue(buildResearchResult({ sources: [evidenceA] }));
      const resultA = await decisionStage.run(
        "A subscription platform for restaurant table reservations",
        "execution-isolation-a"
      );

      runResearchMock.mockResolvedValue(buildResearchResult({ sources: [evidenceB] }));
      const resultB = await decisionStage.run(
        "A subscription platform for veterinary appointment booking",
        "execution-isolation-b"
      );

      // Both really did classify the same way — otherwise this test
      // wouldn't be exercising the contamination path at all.
      expect(resultA.profile.marketProfile.industry).toBe("saas");
      expect(resultB.profile.marketProfile.industry).toBe("saas");

      const marketUrlsA = resultA.profile.marketProfile.sources.map((source) => source.url);
      const marketUrlsB = resultB.profile.marketProfile.sources.map((source) => source.url);

      expect(marketUrlsA).not.toContain("https://execution-b-only.example.com");
      expect(marketUrlsB).not.toContain("https://execution-a-only.example.com");

      expect(resultA.profile.marketProfile.analysisId).toBe("execution-isolation-a");
      expect(resultB.profile.marketProfile.analysisId).toBe("execution-isolation-b");
    });

    it("never lets two different executions' competitors merge, even when discovery surfaces the same candidate name", async () => {
      const sharedNameSource = buildRankedSource({ title: "Acme", url: "https://acme.com" });

      runResearchMock.mockResolvedValue(buildResearchResult({ sources: [sharedNameSource] }));
      const resultA = await decisionStage.run("An idea about Acme", "execution-competitor-a");

      runResearchMock.mockResolvedValue(buildResearchResult({ sources: [sharedNameSource] }));
      const resultB = await decisionStage.run("A different idea, also about Acme", "execution-competitor-b");

      const idsA = resultA.profile.keyCompetitors.map((competitor) => competitor.id);
      const idsB = resultB.profile.keyCompetitors.map((competitor) => competitor.id);

      // Same candidate name discovered twice, in two unrelated
      // executions, must resolve to two independent CompanyProfile
      // records, never the same shared one.
      for (const id of idsA) expect(idsB).not.toContain(id);

      for (const competitor of resultA.profile.keyCompetitors) {
        expect(competitor.analysisId).toBe("execution-competitor-a");
      }
      for (const competitor of resultB.profile.keyCompetitors) {
        expect(competitor.analysisId).toBe("execution-competitor-b");
      }
    });
  });
});
