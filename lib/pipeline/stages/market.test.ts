import { describe, it, expect, vi } from "vitest";
import { marketStage } from "@/lib/pipeline/stages/market";
import type { RankedSource, ResearchResult } from "@/lib/research";

// Milestone 87 — marketStage's wrapped function, discoverMarket, has two
// cross-package dependencies: runResearch (directly) and discoverCompetitors
// (which itself reaches runResearch). Mocking only the true boundary lets
// both real functions run. A thin wrapper whose observable behavior is
// limited to constructing the expected request shape and delegating to an
// already-tested platform function.
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

describe("marketStage", () => {
  it("has the name 'market'", () => {
    expect(marketStage.name).toBe("market");
  });

  it("passes the startupIdea through to discoverMarket's request", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());

    const result = await marketStage.run("A subscription software platform for team scheduling");

    expect(result.request).toEqual({ startupIdea: "A subscription software platform for team scheduling" });
  });

  it("returns a real MarketProfile derived from the mocked research", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await marketStage.run("A subscription software platform for team scheduling");

    expect(result.profile.industry).toBeTruthy();
  });

  it("sets competitorCount from the real discoverCompetitors grouping of the mocked sources", async () => {
    runResearchMock.mockResolvedValue(
      buildResearchResult({ sources: [buildRankedSource({ title: "Acme", url: "https://acme.com" })] })
    );

    const result = await marketStage.run("An idea");

    expect(result.competitorCount).toBe(1);
  });

  it("returns competitorCount 0 when research finds no sources", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await marketStage.run("An idea");

    expect(result.competitorCount).toBe(0);
  });
});
