import { describe, it, expect, vi } from "vitest";
import { competitorsStage } from "@/lib/pipeline/stages/competitors";
import type { RankedSource, ResearchResult } from "@/lib/research";

// Milestone 86 — competitorsStage's wrapped function, discoverCompetitors,
// has exactly one external-platform dependency: runResearch. Mocking only
// that true boundary lets the real discoverCompetitors run — a thin
// wrapper whose observable behavior is limited to constructing the
// expected request shape and delegating to an already-tested platform
// function.
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

describe("competitorsStage", () => {
  it("has the name 'competitors'", () => {
    expect(competitorsStage.name).toBe("competitors");
  });

  it("passes the startupIdea through to discoverCompetitors' request", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    const result = await competitorsStage.run("A subscription software platform for team scheduling");

    expect(result.request).toEqual({ startupIdea: "A subscription software platform for team scheduling" });
  });

  it("returns real, discovered candidates grouped from the mocked research sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await competitorsStage.run("An idea");

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].candidateName).toBe("Acme");
  });

  it("returns an empty candidate list when research finds no sources", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await competitorsStage.run("An idea");

    expect(result.candidates).toEqual([]);
  });
});
