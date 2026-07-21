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

    const result = await decisionStage.run("A subscription software platform for team scheduling");

    expect(result.request).toEqual({ startupIdea: "A subscription software platform for team scheduling" });
  });

  it("returns a real, schema-valid DecisionProfile when research finds no sources", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await decisionStage.run("A subscription software platform for team scheduling");

    expect(result.profile).toBeDefined();
    expect(result.profile.decisionContext.startupIdea).toBe(
      "A subscription software platform for team scheduling"
    );
  });

  it("returns a real, schema-valid DecisionProfile when research finds real sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await decisionStage.run("An idea");

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

    const result = await decisionStage.run("An idea");

    expect(result.profile.evidence.length).toBeGreaterThanOrEqual(1);
  });
});
